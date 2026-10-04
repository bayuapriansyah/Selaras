import { claims, facilities } from "@/data/app/seed";
import type {
  Claim,
  ClaimStatus,
  EvidenceKind,
  RiskSignal,
} from "@/data/app/types";
import type { ProofState } from "@/data/app/proof";
import {
  ADAPTIVE_ACTION,
  MESH_FACILITY_IDS,
  type AdaptiveLevel,
  type FeedbackOutcome,
  type NetworkCondition,
  type NetworkProposal,
  type RecommendedControl,
  type RiskSignature,
  type SignatureFeedback,
  type SignatureMatch,
  type SignatureStatus,
} from "@/data/app/network";
import type { SignalCode } from "@/data/app/types";
import {
  claimView,
  getFacility,
  getTemplate,
  type ClaimView,
  type DataSource,
} from "@/lib/app/selectors";

/**
 * Network Intelligence Layer — matcher & adaptive verification.
 * Layer ini HANYA membaca data lokal: tidak mengubah score, ranking queue,
 * atau perilaku klaim yang sudah ada.
 *
 * Phase 7 — A2 structural matching:
 * - context per klaim kaya sesi (session-level): evidence state (termasuk
 *   overlay evidenceAdds dari Proof Layer), jendela layanan, kelengkapan sesi.
 * - proof-derived flags ringan (attested/anchored/sealed/gap) dari
 *   DataSource.proof — TANPA memanggil evaluateProof() di hot path.
 * - matcher tetap pure & deterministik.
 */

/** Konteks satu sesi (session) untuk matcher — ringan, tanpa evaluateProof. */
export type ClaimSessionContext = {
  sessionId: number;
  serviceId: string;
  providerId: string;
  date: string;
  templateId: string;
  /** Bukti present pada sesi (DataSource.services sudah termasuk overlay evidenceAdds). */
  present: Set<EvidenceKind>;
  /** Required template yang belum ada pada sesi ini. */
  missing: Set<EvidenceKind>;
  /** Sesi lengkap = seluruh bukti wajib template terpenuh. */
  complete: boolean;
};

/** Phase 7 — fakta proof-derived ringan (lihat DataSource.proof). */
export type ClaimProofFlags = {
  /** Ada attestation ATTESTED (ServicePassport sesi atau Claim). */
  attested: boolean;
  /** Salah satu sesi punya anchor event ANCHORED. */
  anchored: boolean;
  /** proofStates[claimId] === "SEALED". */
  sealed: boolean;
  /** proofStates[claimId] PROOF_GAP / INCONSISTENT. */
  gap: boolean;
};

export type ClaimMatchContext = {
  claim: Claim;
  providers: Set<string>;
  signals: Set<SignalCode>;
  missingRequired: Set<EvidenceKind>;
  // Phase 7 — structural/session context (additive)
  facilityId: string;
  sessions: ClaimSessionContext[];
  completeSessions: number;
  /** Union bukti yang hilang di ≥1 sesi (claim-level missingRequired menyembunyikan fakta ini). */
  sessionMissing: Set<EvidenceKind>;
  /** Jendela layanan klaim (min/max tanggal sesi; fallback periode klaim). */
  serviceWindow: { from: string; to: string };
  localStatus: ClaimStatus;
  proof: ClaimProofFlags;
};

type MatchEnv = {
  providersByClaim: Record<string, Set<string>>;
  contextsByClaim: Record<string, ClaimMatchContext>;
};

type ProofIndex = {
  attestedServices: Set<string>;
  attestedClaims: Set<string>;
  anchoredServices: Set<string>;
  states: Record<string, ProofState>;
};

function dayNumber(iso: string): number {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round(t / 86_400_000) : 0;
}

/** Jarak antar dua jendela waktu (0 = tumpang tindih / bersinggungan). */
function windowGapDays(
  a: { from: string; to: string },
  b: { from: string; to: string },
): number {
  const aFrom = dayNumber(a.from);
  const aTo = dayNumber(a.to);
  const bFrom = dayNumber(b.from);
  const bTo = dayNumber(b.to);
  if (aTo < bFrom) return bFrom - aTo;
  if (bTo < aFrom) return aFrom - bTo;
  return 0;
}

function periodGapDays(a: Claim, b: Claim): number {
  return windowGapDays(
    { from: a.periodFrom, to: a.periodTo },
    { from: b.periodFrom, to: b.periodTo },
  );
}

export function buildProvidersByClaim(
  src: DataSource,
): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const service of src.services) {
    if (!service.claimId) continue;
    (map[service.claimId] ??= new Set<string>()).add(service.providerId);
  }
  return map;
}

function buildProofIndex(src: DataSource): ProofIndex {
  const attestedServices = new Set<string>();
  const attestedClaims = new Set<string>();
  for (const a of src.proof?.attestations ?? []) {
    if (a.status !== "ATTESTED") continue;
    if (a.subjectType === "ServicePassport") attestedServices.add(a.subjectId);
    if (a.subjectType === "Claim") attestedClaims.add(a.subjectId);
  }
  const anchoredServices = new Set<string>();
  for (const anchor of src.proof?.anchors ?? []) {
    if (anchor.state === "ANCHORED") anchoredServices.add(anchor.serviceId);
  }
  return {
    attestedServices,
    attestedClaims,
    anchoredServices,
    states: src.proof?.proofStates ?? {},
  };
}

function contextFor(
  claim: Claim,
  src: DataSource,
  providersByClaim: Record<string, Set<string>>,
  signalsByClaim: Record<string, RiskSignal[]>,
  viewsByClaim: Record<string, ClaimView | undefined>,
  proofIndex: ProofIndex,
): ClaimMatchContext {
  const services = src.services.filter((s) => s.claimId === claim.id);

  // Session-level context (Phase 7): evidence state per sesi — termasuk
  // overlay evidenceAdds, karena DataSource.services sudah di-overlay.
  const sessions: ClaimSessionContext[] = services.map((s) => {
    const required = getTemplate(s.templateId).required;
    const present = new Set<EvidenceKind>(
      s.evidence.filter((e) => e.state === "present").map((e) => e.kind),
    );
    const missing = new Set<EvidenceKind>(
      required.filter((k) => !present.has(k)),
    );
    return {
      sessionId: s.sessionId ?? 0,
      serviceId: s.id,
      providerId: s.providerId,
      date: s.date,
      templateId: s.templateId,
      present,
      missing,
      complete: missing.size === 0,
    };
  });

  const completeSessions = sessions.filter((s) => s.complete).length;
  const sessionMissing = new Set<EvidenceKind>();
  for (const s of sessions) for (const k of s.missing) sessionMissing.add(k);

  const dates = sessions
    .map((s) => s.date)
    .filter((d) => d)
    .sort();
  const serviceWindow =
    dates.length > 0
      ? { from: dates[0], to: dates[dates.length - 1] }
      : { from: claim.periodFrom, to: claim.periodTo };

  // Claim-level missingRequired (kompatibilitas kondisi lama).
  const template = getTemplate(claim.templateId);
  const missingRequired = new Set<EvidenceKind>();
  for (const kind of template.required) {
    if (services.length === 0) continue;
    const present = services.some(
      (s) => s.evidence.find((e) => e.kind === kind)?.state === "present",
    );
    if (!present) missingRequired.add(kind);
  }

  const signals = new Set<SignalCode>();
  for (const s of signalsByClaim[claim.id] ?? []) signals.add(s.code);

  const proofState = proofIndex.states[claim.id];
  const proof: ClaimProofFlags = {
    attested:
      proofIndex.attestedClaims.has(claim.id) ||
      sessions.some((s) => proofIndex.attestedServices.has(s.serviceId)),
    anchored: sessions.some((s) =>
      proofIndex.anchoredServices.has(s.serviceId),
    ),
    sealed: proofState === "SEALED",
    gap: proofState === "PROOF_GAP" || proofState === "INCONSISTENT",
  };

  return {
    claim,
    providers: providersByClaim[claim.id] ?? new Set<string>(),
    signals,
    missingRequired,
    facilityId: claim.facilityId,
    sessions,
    completeSessions,
    sessionMissing,
    serviceWindow,
    localStatus: viewsByClaim[claim.id]?.baseStatus ?? claim.status,
    proof,
  };
}

/** Index matcher per panggilan: providers + seluruh konteks klaim jaringan. */
function buildMatchIndex(src: DataSource): MatchEnv {
  const providersByClaim = buildProvidersByClaim(src);
  const viewsByClaim: Record<string, ClaimView | undefined> = {};
  const signalsByClaim: Record<string, RiskSignal[]> = {};
  for (const claim of claims) {
    const view = claimView(claim.id, src);
    viewsByClaim[claim.id] = view;
    signalsByClaim[claim.id] = view?.signals ?? [];
  }
  const proofIndex = buildProofIndex(src);
  const contextsByClaim: Record<string, ClaimMatchContext> = {};
  for (const claim of claims) {
    if (!MESH_FACILITY_IDS.includes(claim.facilityId)) continue;
    contextsByClaim[claim.id] = contextFor(
      claim,
      src,
      providersByClaim,
      signalsByClaim,
      viewsByClaim,
      proofIndex,
    );
  }
  return { providersByClaim, contextsByClaim };
}

export function conditionLabel(cond: NetworkCondition): string {
  switch (cond.kind) {
    case "template":
      return `layanan ${getTemplate(cond.templateId).name}`;
    case "facility":
      return `faskes ${cond.facilityIds.join(", ")}`;
    case "minItems":
      return `minimal ${cond.n} item klaim`;
    case "sameProviderWindow":
      return `provider sama dalam jendela ${cond.days} hari`;
    case "missingEvidence":
      return `sesi tanpa bukti: ${cond.kinds.join(", ")}`;
    case "localSignal":
      return `sinyal lokal ${cond.code}`;
    case "sameProviderOverlap":
      return cond.days && cond.days > 0
        ? `provider sama · jendela layanan tumpang tindih ≤ ${cond.days} hari`
        : "provider sama · jendela layanan tumpang tindih";
    case "sessionsComplete":
      return "seluruh sesi lengkap (bukti tuntas)";
  }
}

function conditionHolds(
  cond: NetworkCondition,
  ctx: ClaimMatchContext,
  env: MatchEnv,
): boolean {
  switch (cond.kind) {
    case "template":
      return ctx.claim.templateId === cond.templateId;
    case "facility":
      return cond.facilityIds.includes(ctx.claim.facilityId);
    case "minItems":
      return ctx.claim.items.length >= cond.n;
    case "sameProviderWindow":
      return claims.some(
        (other) =>
          other.id !== ctx.claim.id &&
          other.facilityId === ctx.claim.facilityId &&
          other.templateId === ctx.claim.templateId &&
          periodGapDays(ctx.claim, other) <= cond.days &&
          [...(env.providersByClaim[other.id] ?? [])].some((p) =>
            ctx.providers.has(p),
          ),
      );
    case "missingEvidence": {
      // Phase 7: evaluasi LEVEL SESI — klaim match bila ≥1 sesi kehilangan
      // bukti (claim-level missingRequired menyembunyikan gap per sesi).
      return cond.kinds.some((kind) => ctx.sessionMissing.has(kind));
    }
    case "localSignal":
      return ctx.signals.has(cond.code);
    case "sameProviderOverlap": {
      // Phase 7 (A2): ada klaim lain pada faskes & template sama, provider
      // berbagi, dan jendela layanan mereka tumpang tindih (toleransi `days`,
      // default 0 = overlap ketat). Bukan sekadar provider ID sama.
      const tolerance = cond.days ?? 0;
      return Object.values(env.contextsByClaim).some((other) => {
        if (other.claim.id === ctx.claim.id) return false;
        if (other.claim.facilityId !== ctx.claim.facilityId) return false;
        if (other.claim.templateId !== ctx.claim.templateId) return false;
        const otherProviders = env.providersByClaim[other.claim.id];
        const shared = [...(otherProviders ?? [])].some((p) =>
          ctx.providers.has(p),
        );
        if (!shared) return false;
        return (
          windowGapDays(ctx.serviceWindow, other.serviceWindow) <= tolerance
        );
      });
    }
    case "sessionsComplete":
      // Phase 7: lengkap = SEMUA sesi klaim punya seluruh bukti wajib
      // template terpenuh (dihitung dari evidence state per sesi, termasuk
      // overlay evidenceAdds — bukan metadata klaim). Klaim tanpa sesi
      // dianggap tidak lengkap.
      return ctx.sessions.length > 0 && ctx.completeSessions === ctx.sessions.length;
  }
}

export function evaluateSignature(
  signature: RiskSignature,
  ctx: ClaimMatchContext,
  env: MatchEnv,
): boolean {
  return signature.detectionConditions.every((cond) =>
    conditionHolds(cond, ctx, env),
  );
}

function matchContexts(
  signatures: RiskSignature[],
  src: DataSource,
): { matches: SignatureMatch[]; contexts: Record<string, ClaimMatchContext> } {
  const env = buildMatchIndex(src);
  const matches: SignatureMatch[] = [];
  for (const sig of signatures) {
    for (const claim of claims) {
      if (!MESH_FACILITY_IDS.includes(claim.facilityId)) continue;
      const ctx = env.contextsByClaim[claim.id];
      if (!ctx) continue;
      if (evaluateSignature(sig, ctx, env)) {
        matches.push({
          key: `${sig.id}|${claim.id}`,
          signatureId: sig.id,
          claimId: claim.id,
          facilityId: claim.facilityId,
          matchedConditions: sig.detectionConditions,
        });
      }
    }
  }
  return { matches, contexts: env.contextsByClaim };
}

export function matchesForClaim(
  signatures: RiskSignature[],
  claimId: string,
  src: DataSource,
): SignatureMatch[] {
  const claim = claims.find((c) => c.id === claimId);
  if (!claim || !MESH_FACILITY_IDS.includes(claim.facilityId)) return [];
  return matchContexts(signatures, src).matches.filter(
    (m) => m.claimId === claimId,
  );
}

export function allMatches(
  signatures: RiskSignature[],
  src: DataSource,
): SignatureMatch[] {
  return matchContexts(signatures, src).matches;
}

export function adaptiveLevel(
  view: ClaimView,
  matches: SignatureMatch[],
): AdaptiveLevel {
  const network = matches.length > 0;
  const gap = view.baseStatus !== "SUPPORTED";
  if (network && gap) return "LEVEL4";
  if (network) return "LEVEL3";
  if (gap) return "LEVEL2";
  return "LEVEL1";
}

export function adaptiveAction(level: AdaptiveLevel): string {
  return ADAPTIVE_ACTION[level];
}

const CONTROL_SERVICE_UNIQUENESS: RecommendedControl = {
  code: "SERVICE_UNIQUENESS",
  label: "Service uniqueness",
  reason: "Confirm that this service episode is represented only once.",
  required: true,
  evidence: "passport",
};

const CONTROL_COMPLETION: RecommendedControl = {
  code: "COMPLETION_EVIDENCE",
  label: "Completion evidence",
  reason: "Confirm required completion evidence exists.",
  required: true,
  evidence: "session",
};

const CONTROL_BILLING: RecommendedControl = {
  code: "BILLING_LINKAGE",
  label: "Billing linkage",
  reason: "Confirm billing points to the same service episode.",
  required: true,
  evidence: "claimTrace",
};

/**
 * Phase 8 — RiskSignature → RecommendedControl[].
 * Sumber: deklarasi `recommendedControls` pada signature (makna signature),
 * fallback diturunkan dari detectionConditions (bukan hardcode UI).
 */
export function controlsOf(signature: RiskSignature): RecommendedControl[] {
  if (signature.recommendedControls?.length) {
    return signature.recommendedControls;
  }
  const out: RecommendedControl[] = [];
  const add = (c: RecommendedControl) => {
    if (!out.some((x) => x.code === c.code)) out.push(c);
  };
  const conds = signature.detectionConditions;
  if (
    conds.some(
      (c) =>
        c.kind === "sameProviderOverlap" ||
        c.kind === "sameProviderWindow" ||
        c.kind === "minItems" ||
        (c.kind === "localSignal" && c.code === "DUPLICATE_SESSION"),
    )
  ) {
    add(CONTROL_SERVICE_UNIQUENESS);
  }
  if (
    conds.some(
      (c) =>
        (c.kind === "missingEvidence" && c.kinds.includes("completion")) ||
        c.kind === "sessionsComplete",
    )
  ) {
    add(CONTROL_COMPLETION);
  }
  if (
    conds.some(
      (c) => c.kind === "localSignal" && c.code === "BILLING_BEFORE_PASSPORT",
    )
  ) {
    add(CONTROL_BILLING);
  }
  if (out.length === 0) {
    add({
      code: "GENERAL_REVIEW",
      label: signature.recommendedControl,
      reason: signature.pattern,
      required: true,
      evidence: "claimTrace",
    });
  }
  return out;
}

export function effectiveStatus(
  signatureId: string,
  seedStatus: SignatureStatus,
  statusOverrides: Record<string, SignatureStatus> | undefined,
): SignatureStatus {
  return statusOverrides?.[signatureId] ?? seedStatus;
}

export function signatureFromProposal(p: NetworkProposal): RiskSignature {
  return {
    id: p.proposedSignatureId,
    name: p.name,
    pattern: p.pattern,
    whyItMatters: p.pattern,
    serviceScope: p.serviceScope,
    detectionConditions: p.detectionConditions,
    signalNotes: p.signalNotes,
    requiredEvidence: p.requiredEvidence,
    recommendedControl: p.recommendedControl,
    severity: p.severity,
    version: 1,
    status: "VALIDATED",
    createdBy: p.createdBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    originFacilityId: p.originFacilityId,
    originClaimId: p.originClaimId,
  };
}

export type SignatureBundle = {
  all: RiskSignature[];
  active: RiskSignature[];
  pending: RiskSignature[];
};

export function signatureBundle(
  seeds: RiskSignature[],
  proposals: NetworkProposal[],
  statusOverrides: Record<string, SignatureStatus> | undefined,
  definitions?: Record<string, RiskSignature>,
): SignatureBundle {
  const approved = proposals
    .filter((p) => p.status === "APPROVED")
    .map(signatureFromProposal);
  const all = [...seeds, ...approved].map((sig) => {
    const def = definitions?.[sig.id];
    const content = def ? { ...sig, ...def } : sig;
    return {
      ...content,
      status: effectiveStatus(sig.id, content.status, statusOverrides),
    };
  });
  return {
    all,
    active: all.filter((s) => s.status === "ACTIVE"),
    pending: all.filter((s) => s.status === "VALIDATED"),
  };
}

export type NetworkStats = {
  connectedFacilities: number;
  activeSignatures: number;
  pendingSignatures: number;
  claimsEvaluated: number;
  networkMatches: number;
  pendingMatches: number;
  protectedFacilities: number;
  stepUpVerifications: number;
  emergingPatterns: number;
  verificationPass: number;
  verificationClarify: number;
  verificationHuman: number;
};

export function networkStats(input: {
  seeds: RiskSignature[];
  proposals: NetworkProposal[];
  statusOverrides: Record<string, SignatureStatus> | undefined;
  feedbacks: SignatureFeedback[];
  src: DataSource;
  definitions?: Record<string, RiskSignature>;
}): NetworkStats {
  const bundle = signatureBundle(
    input.seeds,
    input.proposals,
    input.statusOverrides,
    input.definitions,
  );
  const activeMatches = allMatches(bundle.active, input.src);
  const pendingMatches = allMatches(bundle.pending, input.src);
  const meshClaims = claims.filter((c) =>
    MESH_FACILITY_IDS.includes(c.facilityId),
  );
  return {
    connectedFacilities: MESH_FACILITY_IDS.length,
    activeSignatures: bundle.active.length,
    pendingSignatures: bundle.pending.length,
    claimsEvaluated: meshClaims.length,
    networkMatches: activeMatches.length,
    pendingMatches: pendingMatches.length,
    protectedFacilities: new Set(activeMatches.map((m) => m.facilityId)).size,
    stepUpVerifications: input.feedbacks.length,
    emergingPatterns: input.proposals.filter(
      (p) => p.status === "DRAFT" || p.status === "REVISION_REQUESTED",
    ).length,
    verificationPass: input.feedbacks.filter((f) => f.result === "PASS")
      .length,
    verificationClarify: input.feedbacks.filter(
      (f) => f.result === "NEEDS_CLARIFICATION",
    ).length,
    verificationHuman: input.feedbacks.filter(
      (f) => f.result === "HUMAN_REVIEW",
    ).length,
  };
}

export type ImmunityFacilityState = {
  facilityId: string;
  node: "A" | "B" | "C" | "D";
  name: string;
  city: string;
  inScope: boolean;
  isOrigin: boolean;
  matches: number;
};

export type ImmunityView = {
  signature: RiskSignature;
  isLive: boolean;
  facilities: ImmunityFacilityState[];
};

const NODES = ["A", "B", "C", "D"] as const;

export function immunityView(
  signatureId: string,
  seeds: RiskSignature[],
  proposals: NetworkProposal[],
  statusOverrides: Record<string, SignatureStatus> | undefined,
  src: DataSource,
  definitions?: Record<string, RiskSignature>,
): ImmunityView {
  const bundle = signatureBundle(seeds, proposals, statusOverrides, definitions);
  const target =
    bundle.all.find((s) => s.id === signatureId) ??
    seeds.find((s) => s.id === signatureId);
  if (!target) {
    return { signature: seeds[0], isLive: false, facilities: [] };
  }
  const env = buildMatchIndex(src);

  const facilities: ImmunityFacilityState[] = MESH_FACILITY_IDS.map(
    (id, idx) => {
      const scopeClaims = claims.filter((c) => {
        if (c.facilityId !== id) return false;
        const ctx = env.contextsByClaim[c.id];
        return ctx ? evaluateSignature(target, ctx, env) : false;
      });
      return {
        facilityId: id,
        node: NODES[idx],
        name: getFacility(id)?.name ?? id,
        city: getFacility(id)?.city ?? "",
        inScope: scopeClaims.length > 0,
        isOrigin: target.originFacilityId === id,
        matches: scopeClaims.length,
      };
    },
  );

  return { signature: target, isLive: target.status === "ACTIVE", facilities };
}

export function outcomeCounts(
  feedbacks: SignatureFeedback[],
): Record<FeedbackOutcome, number> {
  const counts: Record<FeedbackOutcome, number> = {
    CONFIRMED: 0,
    CLEARED: 0,
    FALSE_POSITIVE: 0,
    NEEDS_MORE_DATA: 0,
  };
  for (const f of feedbacks) counts[f.outcome] += 1;
  return counts;
}

export function facilityNodeLabel(facilityId: string): string {
  const idx = MESH_FACILITY_IDS.indexOf(facilityId);
  const node = NODES[idx] ?? "-";
  const f = facilities.find((x) => x.id === facilityId);
  return f ? `${f.name} (Faskes ${node})` : `Faskes ${node}`;
}

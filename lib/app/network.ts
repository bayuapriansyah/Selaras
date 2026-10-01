import { claims, facilities } from "@/data/app/seed";
import type { Claim, EvidenceKind, RiskSignal, Service } from "@/data/app/types";
import {
  ADAPTIVE_ACTION,
  MESH_FACILITY_IDS,
  type AdaptiveLevel,
  type FeedbackOutcome,
  type NetworkCondition,
  type NetworkProposal,
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
 */

export type ClaimMatchContext = {
  claim: Claim;
  providers: Set<string>;
  signals: Set<SignalCode>;
  missingRequired: Set<EvidenceKind>;
};

function dayNumber(iso: string): number {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round(t / 86_400_000) : 0;
}

function periodGapDays(a: Claim, b: Claim): number {
  const aFrom = dayNumber(a.periodFrom);
  const aTo = dayNumber(a.periodTo);
  const bFrom = dayNumber(b.periodFrom);
  const bTo = dayNumber(b.periodTo);
  if (aTo < bFrom) return bFrom - aTo;
  if (bTo < aFrom) return aFrom - bTo;
  return 0;
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

function contextFor(
  claim: Claim,
  src: DataSource,
  providersByClaim: Record<string, Set<string>>,
  signalsByClaim: Record<string, RiskSignal[]>,
): ClaimMatchContext {
  const template = getTemplate(claim.templateId);
  const services: Service[] = src.services.filter(
    (s) => s.claimId === claim.id,
  );
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
  return {
    claim,
    providers: providersByClaim[claim.id] ?? new Set<string>(),
    signals,
    missingRequired,
  };
}

function buildSignalsByClaim(src: DataSource): Record<string, RiskSignal[]> {
  const map: Record<string, RiskSignal[]> = {};
  for (const claim of claims) {
    const view: ClaimView | undefined = claimView(claim.id, src);
    map[claim.id] = view?.signals ?? [];
  }
  return map;
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
      return `bukti hilang: ${cond.kinds.join(", ")}`;
    case "localSignal":
      return `sinyal lokal ${cond.code}`;
  }
}

function conditionHolds(
  cond: NetworkCondition,
  ctx: ClaimMatchContext,
  providersByClaim: Record<string, Set<string>>,
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
          [...(providersByClaim[other.id] ?? [])].some((p) =>
            ctx.providers.has(p),
          ),
      );
    case "missingEvidence":
      return cond.kinds.some((kind) => ctx.missingRequired.has(kind));
    case "localSignal":
      return ctx.signals.has(cond.code);
  }
}

export function evaluateSignature(
  signature: RiskSignature,
  ctx: ClaimMatchContext,
  providersByClaim: Record<string, Set<string>>,
): boolean {
  return signature.detectionConditions.every((cond) =>
    conditionHolds(cond, ctx, providersByClaim),
  );
}

function matchContexts(
  signatures: RiskSignature[],
  src: DataSource,
): { matches: SignatureMatch[]; contexts: Record<string, ClaimMatchContext> } {
  const providersByClaim = buildProvidersByClaim(src);
  const signalsByClaim = buildSignalsByClaim(src);
  const matches: SignatureMatch[] = [];
  const contexts: Record<string, ClaimMatchContext> = {};
  for (const sig of signatures) {
    for (const claim of claims) {
      if (!MESH_FACILITY_IDS.includes(claim.facilityId)) continue;
      const ctx =
        contexts[claim.id] ??
        (contexts[claim.id] = contextFor(
          claim,
          src,
          providersByClaim,
          signalsByClaim,
        ));
      if (evaluateSignature(sig, ctx, providersByClaim)) {
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
  return { matches, contexts };
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
): SignatureBundle {
  const approved = proposals
    .filter((p) => p.status === "APPROVED")
    .map(signatureFromProposal);
  const all = [...seeds, ...approved].map((sig) => ({
    ...sig,
    status: effectiveStatus(sig.id, sig.status, statusOverrides),
  }));
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
}): NetworkStats {
  const bundle = signatureBundle(
    input.seeds,
    input.proposals,
    input.statusOverrides,
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
): ImmunityView {
  const bundle = signatureBundle(seeds, proposals, statusOverrides);
  const target =
    bundle.all.find((s) => s.id === signatureId) ??
    seeds.find((s) => s.id === signatureId);
  if (!target) {
    return { signature: seeds[0], isLive: false, facilities: [] };
  }
  const providersByClaim = buildProvidersByClaim(src);
  const signalsByClaim = buildSignalsByClaim(src);

  const facilities: ImmunityFacilityState[] = MESH_FACILITY_IDS.map(
    (id, idx) => {
      const scopeClaims = claims.filter(
        (c) =>
          c.facilityId === id &&
          evaluateSignature(
            target,
            contextFor(c, src, providersByClaim, signalsByClaim),
            providersByClaim,
          ),
      );
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
  return f ? `${f.name} (Facility ${node})` : `Facility ${node}`;
}

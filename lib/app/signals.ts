import type {
  Claim,
  EvidenceKind,
  RiskSignal,
  Service,
  ServiceTemplate,
  SignalCode,
  SignalModus,
} from "@/data/app/types";
import { EVIDENCE_LABEL } from "@/data/app/types";
import { evaluateSession, hasTimestampConflict } from "@/lib/app/rules";

export const FOCUS_MODUS = {
  CLONING: { no: 5, label: "Penjiplakan klaim (cloning)" },
  PHANTOM: { no: 6, label: "Tagihan fiktif (phantom billing)" },
  REPEAT: { no: 11, label: "Klaim berulang (repeat billing)" },
  NOT_DONE: { no: 14, label: "Menagihkan tindakan yang tidak dilakukan" },
  FICTITIOUS: { no: 17, label: "Klaim fiktif tindakan" },
} as const satisfies Record<string, SignalModus>;

export type SignalSession = {
  sessionId: number;
  service: Service;
};

export type SignalContext = {
  claims: Claim[];
  sessionsByClaim: Record<string, SignalSession[]>;
  facilityNames: Record<string, string>;
};

const CLINICAL_KINDS: EvidenceKind[] = ["treatment", "note", "completion"];

function signalKey(
  claimId: string,
  code: SignalCode,
  sessionId?: number,
): string {
  return `${claimId}|${code}|${sessionId ?? "C"}`;
}

function makeSignal(params: {
  claimId: string;
  code: SignalCode;
  severity: RiskSignal["severity"];
  message: string;
  at: string;
  sessionId?: number;
  modus?: SignalModus[];
}): RiskSignal {
  const suffix = params.sessionId
    ? String(params.sessionId).padStart(2, "0")
    : "C";
  return {
    id: `SIGC-${params.claimId.replace("CLM-", "")}-${params.code}-${suffix}`,
    claimId: params.claimId,
    sessionId: params.sessionId,
    code: params.code,
    severity: params.severity,
    message: params.message,
    at: params.at,
    modus: params.modus,
  };
}

function present(evidence: Service["evidence"], kind: EvidenceKind): boolean {
  return evidence.find((e) => e.kind === kind)?.state === "present";
}

function missingLabel(kinds: EvidenceKind[]): string {
  return kinds.map((k) => EVIDENCE_LABEL[k]).join(", ");
}

export function computeClaimSignals(
  claim: Claim,
  template: ServiceTemplate,
  sessions: SignalSession[],
  ctx: SignalContext,
): RiskSignal[] {
  const found: RiskSignal[] = [];
  const at = claim.lastUpdated;

  for (const s of sessions) {
    const evidence = s.service.evidence ?? [];
    const nn = String(s.sessionId).padStart(2, "0");
    const billingPresent = present(evidence, "billing");
    const missingKinds = template.required.filter(
      (k) => !present(evidence, k),
    );

    if (missingKinds.length > 0) {
      const clinical = template.required.filter((k) =>
        CLINICAL_KINDS.includes(k),
      );
      const clinicalMissing = clinical.filter((k) => !present(evidence, k));
      const phantomLike =
        billingPresent &&
        clinical.length > 0 &&
        clinicalMissing.length === clinical.length;

      if (phantomLike) {
        found.push(
          makeSignal({
            claimId: claim.id,
            code: "BILLING_BEFORE_PASSPORT",
            severity: "critical",
            message: `Billing tercatat pada sesi ${nn} tanpa jejak klinis sama sekali (${missingLabel(clinical)} tidak ada).`,
            at,
            sessionId: s.sessionId,
            modus: [FOCUS_MODUS.PHANTOM, FOCUS_MODUS.FICTITIOUS],
          }),
        );
      }

      if (
        missingKinds.length === 1 &&
        missingKinds[0] === "completion"
      ) {
        found.push(
          makeSignal({
            claimId: claim.id,
            code: "MISSING_COMPLETION",
            severity: "info",
            message: `Sesi ${nn} belum memiliki bukti penyelesaian.`,
            at,
            sessionId: s.sessionId,
            modus: billingPresent ? [FOCUS_MODUS.NOT_DONE] : undefined,
          }),
        );
      } else {
        found.push(
          makeSignal({
            claimId: claim.id,
            code: "EVIDENCE_GAP",
            severity: "warning",
            message: `Sesi ${nn} kehilangan bukti wajib: ${missingLabel(missingKinds)}.`,
            at,
            sessionId: s.sessionId,
            modus: billingPresent ? [FOCUS_MODUS.NOT_DONE] : undefined,
          }),
        );
      }
    }

    if (hasTimestampConflict(evidence)) {
      found.push(
        makeSignal({
          claimId: claim.id,
          code: "TIMESTAMP_CONFLICT",
          severity: "critical",
          message: `Timestamp billing pada sesi ${nn} mendahului tindakan.`,
          at,
          sessionId: s.sessionId,
        }),
      );
    }
  }

  for (const other of ctx.claims) {
    if (other.id === claim.id) continue;

    if (
      other.patientId === claim.patientId &&
      other.templateId === claim.templateId &&
      other.periodFrom <= claim.periodTo &&
      claim.periodFrom <= other.periodTo &&
      claim.id.localeCompare(other.id) > 0
    ) {
      found.push(
        makeSignal({
          claimId: claim.id,
          code: "REPEAT_BILLING",
          severity: "critical",
          message: `Periode pelayanan sama dengan klaim ${other.id} untuk pasien dan layanan yang sama — episode ditagih lebih dari satu kali.`,
          at,
          modus: [FOCUS_MODUS.REPEAT],
        }),
      );
    }

    if (other.patientId !== claim.patientId) continue;
    const otherSessions = ctx.sessionsByClaim[other.id] ?? [];
    const seen = new Set<string>();
    for (const mine of sessions) {
      for (const theirs of otherSessions) {
        if (
          mine.service.templateId === theirs.service.templateId &&
          mine.service.date === theirs.service.date &&
          mine.service.startTime === theirs.service.startTime
        ) {
          const dedupe = `${mine.service.id}|${theirs.service.id}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          found.push(
            makeSignal({
              claimId: claim.id,
              code: "DUPLICATE_SESSION",
              severity: "critical",
              message: `Sesi ${String(mine.sessionId).padStart(2, "0")} identik dengan sesi ${String(theirs.sessionId).padStart(2, "0")} pada klaim ${other.id} (pasien, tanggal, jam, dan layanan sama) — indikasi penjiplakan.`,
              at,
              sessionId: mine.sessionId,
              modus: [FOCUS_MODUS.CLONING],
            }),
          );
        }
      }
    }
  }

  const group = ctx.claims.filter(
    (c) => c.facilityId === claim.facilityId && c.templateId === claim.templateId,
  );
  if (group.length >= 4) {
    const supportedPct = (c: Claim): number => {
      const list = ctx.sessionsByClaim[c.id] ?? [];
      if (list.length === 0) return 1;
      const ok = list.filter(
        (x) =>
          evaluateSession(x.service.evidence ?? [], template.required)
            .status === "SUPPORTED",
      ).length;
      return ok / list.length;
    };
    const mine = supportedPct(claim);
    const avg =
      group.reduce((sum, c) => sum + supportedPct(c), 0) / group.length;
    if (mine <= avg - 0.35 && mine <= 0.5) {
      const facility = ctx.facilityNames[claim.facilityId] ?? claim.facilityId;
      found.push(
        makeSignal({
          claimId: claim.id,
          code: "PEER_OUTLIER",
          severity: "warning",
          message: `Dukungan bukti ${Math.round(mine * 100)}% jauh di bawah rata-rata peer ${Math.round(avg * 100)}% pada ${template.name} di ${facility}.`,
          at,
        }),
      );
    }
  }

  const out: RiskSignal[] = [];
  const seenKeys = new Set<string>();
  for (const sig of found) {
    const key = signalKey(sig.claimId, sig.code, sig.sessionId);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    out.push(sig);
  }
  return out;
}

export function unionSignals(
  fixture: RiskSignal[],
  computed: RiskSignal[],
): RiskSignal[] {
  const out = fixture.map((f) => ({ ...f }));
  const index = new Map<string, RiskSignal>(
    out.map((s) => [signalKey(s.claimId, s.code, s.sessionId), s]),
  );
  for (const sig of computed) {
    const key = signalKey(sig.claimId, sig.code, sig.sessionId);
    const target = index.get(key);
    if (target) {
      if (!target.modus && sig.modus) target.modus = sig.modus;
      continue;
    }
    index.set(key, sig);
    out.push(sig);
  }
  return out;
}

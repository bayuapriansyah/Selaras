import { billings as seedBillings, claims } from "@/data/app/seed";
import type { ClaimItem } from "@/data/app/types";
import type { Attestation, ServiceAnchorEvent, EvidenceEvent } from "@/data/app/proof";
import type { DataSource } from "@/lib/app/selectors";
import { getTemplate, seedSource } from "@/lib/app/selectors";
import {
  evaluateProof,
  type ProofEvaluationInput,
  type ProofEvaluationResult,
} from "@/lib/app/proof";

/**
 * Proof service — facade explicit (bukan dipanggil otomatis per render).
 * OFF HOT PATH: tidak di-import claimView / score / signals / ranking / gate.
 */

export type ProofAssessOptions = {
  src?: DataSource;
  evidenceEvents?: EvidenceEvent[];
  attestations?: Attestation[];
  anchors?: ServiceAnchorEvent[];
  sealed?: boolean;
  assessedAt: string;
};

function resolveClaim(claimId: string, src: DataSource) {
  const claim = claims.find((c) => c.id === claimId);
  if (claim) return claim;
  // Klaim runtime (hasil aksi pengguna) mungkin tidak ada di seed.
  const service = src.services.find((s) => s.claimId === claimId);
  if (!service) return undefined;
  return {
    id: claimId,
    patientId: service.patientId,
    templateId: service.templateId,
    facilityId: service.facilityId,
    periodFrom: service.date,
    periodTo: service.date,
    lastUpdated: service.date,
    items: [] as ClaimItem[],
    status: "INCOMPLETE" as const,
  };
}

export function assessClaimProof(
  claimId: string,
  opts: ProofAssessOptions,
): ProofEvaluationResult | null {
  const src = opts.src ?? seedSource;
  const claim = resolveClaim(claimId, src);
  if (!claim) return null;

  const sessions = src.services
    .filter((s) => s.claimId === claimId)
    .sort((a, b) => (a.sessionId ?? 0) - (b.sessionId ?? 0));
  if (sessions.length === 0) return null;

  const template = getTemplate(sessions[0].templateId);
  const billings = seedBillings.filter((b) =>
    sessions.some((s) => s.id === b.serviceId),
  );

  const input: ProofEvaluationInput = {
    claim,
    sessions,
    template,
    billings,
    evidenceEvents: opts.evidenceEvents ?? [],
    attestations: opts.attestations ?? [],
    anchors: opts.anchors ?? [],
    sealed: opts.sealed ?? false,
    assessedAt: opts.assessedAt,
  };
  return evaluateProof(input);
}

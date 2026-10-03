import { billings as seedBillings, claims } from "@/data/app/seed";
import type { ClaimItem } from "@/data/app/types";
import type {
  Attestation,
  ServiceAnchorEvent,
  EvidenceEvent,
} from "@/data/app/proof";
import { PROOF_STATE_LABEL } from "@/data/app/proof";
import type { DataSource } from "@/lib/app/selectors";
import { getTemplate, seedSource } from "@/lib/app/selectors";
import {
  evaluateProof,
  canTransition,
  type ProofEvaluationInput,
  type ProofEvaluationResult,
} from "@/lib/app/proof";
import {
  applyEvidenceAdds,
  nowStamp,
  pushAudit,
  uid,
  type PersistedState,
} from "@/lib/app/appState";
import { makeProofEvent } from "@/lib/app/services/proofEventService";
import {
  appendProvenance,
  type AuditActor,
} from "@/lib/app/services/provenanceService";

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

export type ProofActor = AuditActor & {
  id?: string;
};

export type AnchorEventSeed = Omit<ServiceAnchorEvent, "id" | "anchoredAt">;

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

/**
 * Reducer proof-layer — pure (PersistedState → PersistedState), dipanggil
 * explicit oleh aksi pengguna, bukan per render.
 */

function sourceFrom(prev: PersistedState): DataSource {
  return {
    services: [...seedSource.services, ...prev.createdServices].map((s) =>
      applyEvidenceAdds(s, prev.evidenceAdds),
    ),
    reviews: seedSource.reviews,
    audit: seedSource.audit,
    notifications: seedSource.notifications,
  };
}

function claimProofEvents(prev: PersistedState, claimId: string, src: DataSource) {
  const serviceIds = new Set(
    src.services.filter((s) => s.claimId === claimId).map((s) => s.id),
  );
  return prev.proofEvents.filter(
    (ev) =>
      ev.claimId === claimId ||
      (ev.claimId === undefined && serviceIds.has(ev.serviceId)),
  );
}

export function assessProofAction(
  prev: PersistedState,
  claimId: string,
  actor: ProofActor,
): PersistedState {
  const src = sourceFrom(prev);
  const sealed = prev.proofStates[claimId] === "SEALED";
  const sessions = src.services.filter((s) => s.claimId === claimId);

  const result = assessClaimProof(claimId, {
    src,
    evidenceEvents: claimProofEvents(prev, claimId, src),
    attestations: prev.attestations,
    anchors: prev.anchors,
    sealed,
    assessedAt: nowStamp(),
  });
  if (!result) return prev;

  const assessment = result.assessment;
  const event = makeProofEvent({
    proofType: "PROOF_ASSESSED",
    serviceId: sessions[0]?.id ?? claimId,
    sessionId: sessions[0]?.sessionId,
    claimId,
    actorId: actor.id,
    actorRole: actor.role,
    content: {
      state: assessment.state,
      modelVersion: assessment.modelVersion,
      gaps: assessment.gaps.length,
      conflicts: assessment.conflicts.length,
    },
  });
  const audit = pushAudit(
    prev.audit,
    {
      action: "PROOF_ASSESSED",
      entity: "Claim",
      entityId: claimId,
      description: `Penilaian proof ${claimId} — ${PROOF_STATE_LABEL[assessment.state]} (model v${assessment.modelVersion}, ${assessment.gaps.length} gap).`,
    },
    actor.name,
    actor.role,
  );

  return {
    ...prev,
    proofStates: {
      ...prev.proofStates,
      [claimId]: sealed ? "SEALED" : assessment.state,
    },
    proofAssessments: { ...prev.proofAssessments, [claimId]: assessment },
    proofEvents: [event, ...prev.proofEvents],
    audit,
  };
}

export function sealProofAction(
  prev: PersistedState,
  claimId: string,
  actor: ProofActor,
): PersistedState {
  // Idempoten: seal kedua kali tidak menulis apa pun.
  if (prev.proofStates[claimId] === "SEALED") return prev;

  const src = sourceFrom(prev);
  const sessions = src.services.filter((s) => s.claimId === claimId);

  const fresh = assessClaimProof(claimId, {
    src,
    evidenceEvents: claimProofEvents(prev, claimId, src),
    attestations: prev.attestations,
    anchors: prev.anchors,
    sealed: false,
    assessedAt: nowStamp(),
  });
  if (!fresh) return prev;

  // Hanya bila evaluator mengizinkan: state harus CORROBORATED
  // (satu-satunya sumber transisi CORROBORATED → SEALED).
  if (
    fresh.assessment.state !== "CORROBORATED" ||
    !canTransition("CORROBORATED", "SEALED")
  ) {
    return prev;
  }

  const { state: afterProvenance, record } = appendProvenance(
    prev,
    {
      resourceId: claimId,
      resourceType: "Proof",
      action: "SEAL",
      actorId: actor.id ?? actor.name,
      reason: "Seluruh dimensi proof terkukuh — evaluator mengizinkan transisi ke SEALED",
      content: {
        claimId,
        modelVersion: fresh.assessment.modelVersion,
        conformance: fresh.assessment.conformance?.status,
        traceStatus: fresh.assessment.traceStatus,
        triangulation: fresh.assessment.triangulation,
        dimensions: fresh.assessment.dimensions.map((d) => [
          d.dimension,
          d.verdict,
        ]),
      },
    },
    actor,
  );

  const sealedEval = assessClaimProof(claimId, {
    src,
    evidenceEvents: claimProofEvents(prev, claimId, src),
    attestations: prev.attestations,
    anchors: prev.anchors,
    sealed: true,
    assessedAt: nowStamp(),
  });
  const assessment =
    sealedEval?.assessment ?? { ...fresh.assessment, state: "SEALED" as const };

  const event = makeProofEvent({
    proofType: "PROOF_SEALED",
    serviceId: sessions[0]?.id ?? claimId,
    sessionId: sessions[0]?.sessionId,
    claimId,
    actorId: actor.id,
    actorRole: actor.role,
    version: record.version,
    content: {
      integrityRef: record.integrityRef,
      previousIntegrityRef: record.previousIntegrityRef,
      state: "SEALED",
    },
  });
  const audit = pushAudit(
    afterProvenance.audit,
    {
      action: "PROOF_SEALED",
      entity: "Claim",
      entityId: claimId,
      description: `Proof ${claimId} diseal (CORROBORATED → SEALED) — provenance v${record.version}, integrity reference tercatat.`,
    },
    actor.name,
    actor.role,
  );

  return {
    ...afterProvenance,
    proofStates: { ...afterProvenance.proofStates, [claimId]: "SEALED" },
    proofAssessments: {
      ...afterProvenance.proofAssessments,
      [claimId]: assessment,
    },
    proofEvents: [event, ...afterProvenance.proofEvents],
    audit,
  };
}

export function appendAnchorEvent(
  prev: PersistedState,
  input: AnchorEventSeed,
  actor: ProofActor,
): { state: PersistedState; id: string } {
  const id = uid("ANC");
  const event: ServiceAnchorEvent = {
    ...input,
    id,
    anchoredAt: nowStamp(),
  };
  const proofEvent = makeProofEvent({
    proofType: "SERVICE_ANCHORED",
    serviceId: input.serviceId,
    source: input.source,
    actorId: actor.id,
    actorRole: actor.role,
    content: {
      sequence: input.sequence,
      state: input.state,
      contentHash: input.contentHash,
    },
  });
  const audit = pushAudit(
    prev.audit,
    {
      action: "SERVICE_ANCHORED",
      entity: "Passport",
      entityId: input.serviceId,
      description: `Anchor ${id} tercatat untuk ${input.serviceId} (urutan ${input.sequence}, status ${input.state.toLowerCase()}).`,
    },
    actor.name,
    actor.role,
  );

  return {
    id,
    state: {
      ...prev,
      anchors: [event, ...prev.anchors],
      proofEvents: [proofEvent, ...prev.proofEvents],
      audit,
    },
  };
}

import { billings as seedBillings, claims } from "@/data/app/seed";
import type { ClaimItem } from "@/data/app/types";
import type {
  AnchorMethod,
  Attestation,
  ServiceAnchorEvent,
  EvidenceEvent,
} from "@/data/app/proof";
import { PROOF_STATE_LABEL } from "@/data/app/proof";
import { findAnchor } from "@/data/app/anchorRegistry";
import type { DataSource } from "@/lib/app/selectors";
import { getTemplate, seedSource } from "@/lib/app/selectors";
import { integrityRefOf } from "@/lib/app/provenance";
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

/**
 * Pembaca proof-layer (tanpa mutasi) — dipakai halaman Proof View /
 * Service Passport untuk menampilkan evaluasi terkini tanpa menulis state.
 * Satu-satunya sumber evaluasi: assessClaimProof (Phase 3 evaluator).
 */
export function proofEventsOf(
  prev: PersistedState,
  claimId: string,
  src: DataSource,
): EvidenceEvent[] {
  return claimProofEvents(prev, claimId, src);
}

export function previewProof(
  prev: PersistedState,
  claimId: string,
): ProofEvaluationResult | null {
  const src = sourceFrom(prev);
  const sealed = prev.proofStates[claimId] === "SEALED";
  return assessClaimProof(claimId, {
    src,
    evidenceEvents: claimProofEvents(prev, claimId, src),
    attestations: prev.attestations,
    anchors: prev.anchors,
    sealed,
    assessedAt: prev.proofAssessments[claimId]?.assessedAt ?? "",
  });
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
      ...(input.servicePointId
        ? {
            facilityId: input.facilityId,
            servicePointId: input.servicePointId,
            method: input.method,
          }
        : {}),
    },
  });
  const audit = pushAudit(
    prev.audit,
    {
      action: "SERVICE_ANCHORED",
      entity: "Passport",
      entityId: input.serviceId,
      description: `Anchor ${id} tercatat untuk ${input.serviceId} (urutan ${input.sequence}, status ${input.state.toLowerCase()}${
        input.servicePointId
          ? ` · ${input.facilityId} · ${input.servicePointId} · metode ${input.method}`
          : ""
      }).`,
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

function serviceOf(prev: PersistedState, serviceId: string) {
  return (
    prev.createdServices.find((s) => s.id === serviceId) ??
    seedSource.services.find((s) => s.id === serviceId)
  );
}

export type AttestServiceResult = {
  state: PersistedState;
  outcome: "ATTESTED" | "IDEMPOTENT" | "NOT_FOUND";
};

/**
 * Proof event SERVICE_STARTED (sisi provider) + audit — attestation-nya
 * sendiri ditulis oleh aksi addAttestation() via store.
 * Idempoten: satu provider SERVICE_STARTED per sesi layanan.
 */
export function attestServiceStart(
  prev: PersistedState,
  serviceId: string,
  actor: ProofActor,
): AttestServiceResult {
  const service = serviceOf(prev, serviceId);
  if (!service) return { state: prev, outcome: "NOT_FOUND" };

  const already = prev.proofEvents.some(
    (ev) =>
      ev.serviceId === serviceId &&
      ev.proofType === "SERVICE_STARTED" &&
      ev.source === "Provider",
  );
  if (already) return { state: prev, outcome: "IDEMPOTENT" };

  const template = getTemplate(service.templateId);
  const event = makeProofEvent({
    proofType: "SERVICE_STARTED",
    serviceId,
    sessionId: service.sessionId,
    claimId: service.claimId,
    source: "Provider",
    channel: "MANUAL",
    actorId: actor.id,
    actorRole: actor.role,
    content: {
      attestation: "PROVIDER",
      templateId: service.templateId,
      facilityId: service.facilityId,
      servicePoint: service.servicePoint,
    },
  });
  const audit = pushAudit(
    prev.audit,
    {
      action: "SERVICE_ATTESTED",
      entity: "Passport",
      entityId: serviceId,
      description: `Attestasi provider ${template.name.toLowerCase()} · ${service.servicePoint} — proof event SERVICE_STARTED tercatat untuk ${serviceId}.`,
    },
    actor.name,
    actor.role,
  );

  return {
    outcome: "ATTESTED",
    state: { ...prev, proofEvents: [event, ...prev.proofEvents], audit },
  };
}

export type AnchorConfirmInput = {
  serviceId: string;
  code: string;
  method: AnchorMethod;
};

export type AnchorConfirmOutcome =
  | "CONFIRMED"
  | "IDEMPOTENT"
  | "MISMATCH"
  | "NOT_FOUND";

export type AnchorConfirmResult = {
  state: PersistedState;
  outcome: AnchorConfirmOutcome;
  message: string;
  anchor?: ServiceAnchorEvent;
};

/**
 * Konfirmasi titik layanan oleh provider — anchor = context witness.
 * Validasi konteks wajib: kode anchor harus cocok dengan facility +
 * service point sesi, kalau tidak: ANCHOR CONTEXT MISMATCH (ditolak,
 * tanpa event SERVICE_ANCHORED, tanpa proof state INCONSISTENT).
 * Konfirmasi berulang dengan konteks sama idempoten (tanpa duplikasi).
 */
export function confirmServiceAnchor(
  prev: PersistedState,
  input: AnchorConfirmInput,
  actor: ProofActor,
): AnchorConfirmResult {
  const service = serviceOf(prev, input.serviceId);
  if (!service) {
    return {
      state: prev,
      outcome: "NOT_FOUND",
      message: `Sesi layanan ${input.serviceId} tidak ditemukan.`,
    };
  }

  const code = input.code.trim().toUpperCase();
  const entry = findAnchor(code);
  const anchored = prev.anchors.find(
    (a) => a.serviceId === input.serviceId && a.state === "ANCHORED",
  );

  const mismatch = (message: string): AnchorConfirmResult => ({
    outcome: "MISMATCH",
    message,
    state: {
      ...prev,
      audit: pushAudit(
        prev.audit,
        {
          action: "ANCHOR_MISMATCH",
          entity: "Passport",
          entityId: input.serviceId,
          description: `Konfirmasi titik layanan ditolak untuk ${input.serviceId} — ${message}`,
        },
        actor.name,
        actor.role,
      ),
    },
  });

  if (!entry) {
    return mismatch(
      `ANCHOR CONTEXT MISMATCH — kode anchor "${code}" tidak terdaftar sebagai titik layanan pada registry.`,
    );
  }
  if (
    entry.facilityId !== service.facilityId ||
    entry.servicePoint !== service.servicePoint
  ) {
    return mismatch(
      `ANCHOR CONTEXT MISMATCH — anchor ${entry.code} menunjuk ${entry.facilityId} · ${entry.servicePoint}, sedangkan sesi ini berada di ${service.facilityId} · ${service.servicePoint}.`,
    );
  }
  if (anchored) {
    if (
      anchored.servicePointId === entry.code &&
      anchored.facilityId === entry.facilityId
    ) {
      return {
        state: prev,
        outcome: "IDEMPOTENT",
        anchor: anchored,
        message: `Anchor ${entry.code} sudah terkonfirmasi untuk sesi ini — konfirmasi berulang tidak menulis event baru.`,
      };
    }
    return mismatch(
      `ANCHOR CONTEXT MISMATCH — sesi ini sudah memiliki anchor ${anchored.servicePointId ?? "-"}; konfirmasi ${entry.code} menuntut re-verifikasi dan tidak menimpa anchor aktif.`,
    );
  }

  const prior = prev.anchors
    .filter((a) => a.serviceId === input.serviceId)
    .sort((a, b) => b.sequence - a.sequence)[0];
  const sequence = (prior?.sequence ?? 0) + 1;
  const contentHash = integrityRefOf({
    resourceId: input.serviceId,
    resourceType: "Anchor",
    action: "ANCHOR_CONFIRM",
    version: sequence,
    content: {
      facilityId: service.facilityId,
      servicePointId: entry.code,
      servicePoint: entry.servicePoint,
      method: input.method,
    },
  });

  const appended = appendAnchorEvent(
    prev,
    {
      serviceId: input.serviceId,
      sequence,
      previousHash: prior?.contentHash ?? "",
      contentHash,
      source: "Provider",
      state: "ANCHORED",
      facilityId: service.facilityId,
      servicePointId: entry.code,
      servicePoint: entry.servicePoint,
      method: input.method,
    },
    actor,
  );

  return {
    state: appended.state,
    outcome: "CONFIRMED",
    anchor: appended.state.anchors.find((a) => a.id === appended.id),
    message: `Anchor ${entry.code} terkonfirmasi — ${entry.facilityId} · ${entry.servicePoint} (metode ${input.method}, urutan ${sequence}).`,
  };
}

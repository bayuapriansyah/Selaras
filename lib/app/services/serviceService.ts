import { APP_TODAY } from "@/data/app/seed";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import type {
  CaptureChannel,
  EvidenceKind,
  EvidenceSource,
  Role,
  Service,
} from "@/data/app/types";
import { getTemplate, seedSource } from "@/lib/app/selectors";
import {
  applyEvidenceAdds,
  clockHM,
  pushAudit,
  type PersistedState,
  type StartServiceInput,
} from "@/lib/app/appState";
import { makeProofEvent } from "@/lib/app/services/proofEventService";
import { appendProvenance } from "@/lib/app/services/provenanceService";

export function startService(
  prev: PersistedState,
  input: StartServiceInput,
  userName: string, userRole: Role,
  actorId?: string,
): { state: PersistedState; serviceId: string } {
  const seq = prev.nextSeq;
  const key = String(seq).padStart(2, "0");
  const id = `SVC-085${key}-01`;
  const start = clockHM();
  const template = getTemplate(input.templateId);

  const evidence = template.required.map((kind) =>
    kind === "arrival"
      ? {
          kind,
          state: "present" as const,
          at: start,
          citation: `E-${key}-01`,
          source: "Operator" as const,
        }
      : {
          kind,
          state: "missing" as const,
          citation: `E-${key}-${String(
            EVIDENCE_ORDER.indexOf(kind) + 1,
          ).padStart(2, "0")}`,
          note: "Belum tercatat",
        },
  );

  const service: Service = {
    id,
    patientId: input.patientId,
    providerId: input.providerId,
    facilityId: template.id === "TPL-LAB" ? "FAC-02" : "FAC-01",
    templateId: input.templateId,
    servicePoint: input.servicePoint,
    date: APP_TODAY,
    startTime: start,
    status: "AKTIF",
    evidence,
    events: [
      {
        id: `EV-${id}-START`,
        serviceId: id,
        kind: "start",
        at: start,
        source: "Operator",
        description: "Pelayanan dimulai",
      },
      {
        id: `EV-${id}-ARRIVAL`,
        serviceId: id,
        kind: "arrival",
        at: start,
        source: "Operator",
        description: "Kedatangan pasien tercatat",
      },
    ],
  };

  const proofEvents = [
    makeProofEvent({
      proofType: "IDENTITY_BOUND",
      serviceId: id,
      kind: "arrival",
      source: "Operator",
      channel: "MANUAL",
      actorId,
      actorRole: userRole,
      content: { patientId: input.patientId, at: start },
    }),
    makeProofEvent({
      proofType: "SERVICE_STARTED",
      serviceId: id,
      source: "Operator",
      channel: "MANUAL",
      actorId,
      actorRole: userRole,
      content: { templateId: input.templateId, patientId: input.patientId, at: start },
    }),
  ];

  return {
    serviceId: id,
    state: {
      ...prev,
      nextSeq: prev.nextSeq + 1,
      createdServices: [...prev.createdServices, service],
      proofEvents: [...proofEvents, ...prev.proofEvents],
      audit: pushAudit(
        pushAudit(
          prev.audit,
          {
            action: "SERVICE_STARTED",
            entity: "Service",
            entityId: id,
            description: `Pelayanan ${template.name.toLowerCase()} dimulai untuk ${input.patientId}.`,
          },
          userName,
          userRole,
        ),
        {
          action: "IDENTITY_BOUND",
          entity: "Evidence",
          entityId: `${id}#arrival`,
          description: `Identitas ${input.patientId} terikat pada check-in ${id} (kedatangan tercatat).`,
        },
        userName,
        userRole,
      ),
    },
  };
}

function findService(
  prev: PersistedState,
  serviceId: string,
): Service | undefined {
  return (
    prev.createdServices.find((s) => s.id === serviceId) ??
    seedSource.services.find((s) => s.id === serviceId)
  );
}

export function captureEvidence(
  prev: PersistedState,
  serviceId: string,
  kind: EvidenceKind,
  userName: string, userRole: Role,
  channel?: CaptureChannel,
  actorId?: string,
): PersistedState | null {
  const current = findService(prev, serviceId);
  if (!current) return null;

  const at = clockHM();
  const source: EvidenceSource =
    kind === "billing" || kind === "claim" ? "Sistem" : "Provider";
  const resolvedChannel: CaptureChannel =
    channel ?? (kind === "billing" || kind === "claim" ? "SYSTEM" : "MANUAL");
  const via = ` (via ${resolvedChannel})`;
  const required = getTemplate(current.templateId).required;

  const overlaid = applyEvidenceAdds(current, prev.evidenceAdds);
  const isPresent = (k: EvidenceKind) =>
    overlaid.evidence.find((e) => e.kind === k)?.state === "present";
  const alreadyPresent = isPresent(kind);
  const completeBefore = required.every(isPresent);
  const othersPresent = required.filter((k) => k !== kind).every(isPresent);
  const justCompleted = othersPresent && !completeBefore;

  let audit = prev.audit;

  if (alreadyPresent) {
    audit = pushAudit(
      audit,
      {
        action: "EVIDENCE_UPDATED",
        entity: "Evidence",
        entityId: `${serviceId}#${kind}`,
        description: `${EVIDENCE_LABEL[kind]} diperbarui untuk ${serviceId}.${via}`,
      },
      userName,
      userRole,
    );
  } else {
    audit = pushAudit(
      audit,
      {
        action: kind === "note" ? "CLINICAL_NOTE_ADDED" : "EVIDENCE_ADDED",
        entity: "Evidence",
        entityId: `${serviceId}#${kind}`,
        description:
          (kind === "note"
            ? `Catatan klinis ditambahkan untuk ${serviceId}.`
            : `${EVIDENCE_LABEL[kind]} tercatat untuk ${serviceId}.`) + via,
      },
      userName,
      userRole,
    );

    if (kind === "arrival") {
      audit = pushAudit(
        audit,
        {
          action: "IDENTITY_BOUND",
          entity: "Evidence",
          entityId: `${serviceId}#arrival`,
          description: `Identitas pasien terikat pada check-in ${serviceId} (kedatangan tercatat).`,
        },
        userName,
        userRole,
      );
    }

    if (kind === "billing") {
      audit = pushAudit(
        audit,
        {
          action: "BILLING_CREATED",
          entity: "Billing",
          entityId: serviceId,
          description: `Billing dibuat untuk ${serviceId}.`,
        },
        userName,
        userRole,
      );
    }

    if (kind === "claim") {
      audit = pushAudit(
        audit,
        {
          action: "CLAIM_LINKED",
          entity: "Claim",
          entityId: current.claimId ?? serviceId,
          description: `Klaim ${current.claimId ?? "-"} tertaut ke ${serviceId}.`,
        },
        userName,
        userRole,
      );
    }

    if (justCompleted && current.status === "AKTIF") {
      audit = pushAudit(
        audit,
        {
          action: "SERVICE_COMPLETED",
          entity: "Passport",
          entityId: serviceId,
          description: `Seluruh evidence ${serviceId} lengkap — Service Passport LENGKAP.`,
        },
        userName,
        userRole,
      );
    }
  }

  const proofEvents = [
    makeProofEvent({
      proofType: alreadyPresent ? "EVIDENCE_UPDATED" : "EVIDENCE_RECORDED",
      serviceId,
      sessionId: current.sessionId,
      claimId: current.claimId,
      kind,
      source,
      channel: resolvedChannel,
      actorId,
      actorRole: userRole,
      content: { at, revision: alreadyPresent },
    }),
  ];
  if (!alreadyPresent && kind === "arrival") {
    proofEvents.push(
      makeProofEvent({
        proofType: "IDENTITY_BOUND",
        serviceId,
        sessionId: current.sessionId,
        claimId: current.claimId,
        kind,
        source,
        channel: resolvedChannel,
        actorId,
        actorRole: userRole,
        content: { at },
      }),
    );
  }
  if (justCompleted && current.status === "AKTIF") {
    proofEvents.push(
      makeProofEvent({
        proofType: "SERVICE_COMPLETED",
        serviceId,
        sessionId: current.sessionId,
        claimId: current.claimId,
        source,
        channel: resolvedChannel,
        actorId,
        actorRole: userRole,
        content: { at },
      }),
    );
  }

  const claimId = current.claimId;
  const assessment = claimId ? prev.proofAssessments[claimId] : undefined;
  const proofAssessments =
    claimId && assessment && !assessment.stale
      ? {
          ...prev.proofAssessments,
          [claimId]: { ...assessment, stale: true },
        }
      : prev.proofAssessments;

  const next: PersistedState = {
    ...prev,
    evidenceAdds: [
      ...prev.evidenceAdds,
      { serviceId, kind, at, source, channel: resolvedChannel },
    ],
    audit,
    proofEvents: [...proofEvents, ...prev.proofEvents],
    proofAssessments,
  };

  return appendProvenance(
    next,
    {
      resourceId: `${serviceId}#${kind}`,
      resourceType: "Evidence",
      action: alreadyPresent ? "UPDATE" : "CREATE",
      actorId: actorId ?? userName,
      content: { serviceId, kind, at, source, channel: resolvedChannel, revision: alreadyPresent },
    },
    { name: userName, role: userRole },
  ).state;
}

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
  clockHM,
  pushAudit,
  type PersistedState,
  type StartServiceInput,
} from "@/lib/app/appState";

export function startService(
  prev: PersistedState,
  input: StartServiceInput,
  userName: string, userRole: Role,
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

  return {
    serviceId: id,
    state: {
      ...prev,
      nextSeq: prev.nextSeq + 1,
      createdServices: [...prev.createdServices, service],
      audit: pushAudit(
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

  const willBeComplete = required.every((k) => {
    if (k !== kind) {
      return current.evidence.find((e) => e.kind === k)?.state === "present";
    }
    return true;
  });

  let audit = pushAudit(
    prev.audit,
    {
      action: kind === "note" ? "CLINICAL_NOTE_ADDED" : "EVIDENCE_ADDED",
      entity: "Evidence",
      entityId: `${serviceId}#${kind}`,
      description:
        (kind === "note"
          ? `Clinical note ditambahkan untuk ${serviceId}.`
          : `${EVIDENCE_LABEL[kind]} tercatat untuk ${serviceId}.`) + via,
    },
    userName,
    userRole,
  );

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

  if (willBeComplete && current.status === "AKTIF") {
    audit = pushAudit(
      audit,
      {
        action: "SERVICE_COMPLETED",
        entity: "Passport",
        entityId: serviceId,
        description: `Seluruh evidence ${serviceId} lengkap — Service Passport COMPLETE.`,
      },
      userName,
      userRole,
    );
  }

  return {
    ...prev,
    evidenceAdds: [
      ...prev.evidenceAdds,
      { serviceId, kind, at, source, channel: resolvedChannel },
    ],
    audit,
  };
}

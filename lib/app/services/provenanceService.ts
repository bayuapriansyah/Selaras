import type { ProvenanceAction, ProvenanceRecord, ProvenanceResource } from "@/data/app/proof";
import type { AuditEntity, Role } from "@/data/app/types";
import {
  nowStamp,
  pushAudit,
  uid,
  type PersistedState,
} from "@/lib/app/appState";
import { integrityRefOf } from "@/lib/app/provenance";
import { makeProofEvent } from "@/lib/app/services/proofEventService";

export type ProvenanceAppendInput = {
  resourceId: string;
  resourceType: ProvenanceResource;
  action: ProvenanceAction;
  actorId: string;
  reason?: string;
  content: unknown;
};

export type AuditActor = {
  name: string;
  role: Role;
};

const AUDIT_ENTITIES: AuditEntity[] = [
  "Service",
  "Evidence",
  "Passport",
  "Billing",
  "Claim",
  "Review",
  "Signal",
  "User",
  "Network",
];

const RESOURCE_ENTITY: Record<string, AuditEntity> = {
  Proof: "Claim",
  Attestation: "Evidence",
  Anchor: "Passport",
  Trace: "Claim",
};

const ACTION_LABEL: Record<ProvenanceAction, string> = {
  CREATE: "dibuat",
  UPDATE: "diperbarui",
  ATTEST: "diattestasi",
  ANCHOR: "di-anchor",
  VERIFY: "diverifikasi",
  SEAL: "disegel",
  SUPERSEDE: "digantikan",
  REVOKE: "dicabut",
};

function auditEntityFor(resourceType: ProvenanceResource): AuditEntity {
  if (AUDIT_ENTITIES.includes(resourceType as AuditEntity)) {
    return resourceType as AuditEntity;
  }
  return RESOURCE_ENTITY[resourceType] ?? "Evidence";
}

export function latestProvenance(
  records: ProvenanceRecord[],
  resourceId: string,
): ProvenanceRecord | undefined {
  return records
    .filter((r) => r.resourceId === resourceId)
    .reduce<ProvenanceRecord | undefined>(
      (best, r) => (!best || r.version > best.version ? r : best),
      undefined,
    );
}

export function nextProvenanceRecord(
  records: ProvenanceRecord[],
  input: ProvenanceAppendInput,
  timestamp: string,
  id: string,
): ProvenanceRecord {
  const latest = latestProvenance(records, input.resourceId);
  const version = (latest?.version ?? 0) + 1;
  const integrityRef = integrityRefOf({
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    action: input.action,
    version,
    content: input.content,
  });

  return {
    id,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    action: input.action,
    actorId: input.actorId,
    timestamp,
    version,
    reason: input.reason,
    integrityRef,
    previousIntegrityRef: latest?.integrityRef,
    content: input.content,
  };
}

export function appendProvenance(
  prev: PersistedState,
  input: ProvenanceAppendInput,
  actor: AuditActor,
): { state: PersistedState; record: ProvenanceRecord } {
  const record = nextProvenanceRecord(
    prev.provenance,
    input,
    nowStamp(),
    uid("PRV"),
  );
  const event = makeProofEvent({
    proofType: "PROVENANCE_RECORDED",
    serviceId: input.resourceId,
    claimId: input.resourceType === "Proof" ? input.resourceId : undefined,
    actorId: input.actorId,
    actorRole: actor.role,
    version: record.version,
    content: {
      resourceType: input.resourceType,
      action: input.action,
      integrityRef: record.integrityRef,
      previousIntegrityRef: record.previousIntegrityRef,
    },
  });
  const audit = pushAudit(
    prev.audit,
    {
      action: "PROVENANCE_RECORDED",
      entity: auditEntityFor(input.resourceType),
      entityId: input.resourceId,
      description:
        `Versi provenance ${record.version} ${ACTION_LABEL[input.action]} untuk ` +
        `${input.resourceType} ${input.resourceId} — integrity reference tercatat.` +
        (input.reason ? ` Alasan: ${input.reason}` : ""),
    },
    actor.name,
    actor.role,
  );

  return {
    state: {
      ...prev,
      provenance: [record, ...prev.provenance],
      proofEvents: [event, ...prev.proofEvents],
      audit,
    },
    record,
  };
}

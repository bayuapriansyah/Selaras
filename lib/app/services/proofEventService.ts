import type { EvidenceEvent, ProofEventType } from "@/data/app/proof";
import type {
  CaptureChannel,
  EvidenceKind,
  EvidenceSource,
  Role,
} from "@/data/app/types";
import { nowStamp, uid } from "@/lib/app/appState";
import { integrityRefOf } from "@/lib/app/provenance";

export type ProofEventSeed = {
  proofType: ProofEventType;
  serviceId: string;
  sessionId?: number;
  claimId?: string;
  kind?: EvidenceKind;
  source?: EvidenceSource;
  channel?: CaptureChannel;
  actorId?: string;
  actorRole?: Role;
  version?: number;
  content?: Record<string, unknown>;
};

export function makeProofEvent(seed: ProofEventSeed): EvidenceEvent {
  const id = uid("PEV");
  const at = nowStamp();
  const content = {
    proofType: seed.proofType,
    serviceId: seed.serviceId,
    sessionId: seed.sessionId,
    claimId: seed.claimId,
    kind: seed.kind,
    actorId: seed.actorId,
    version: seed.version,
    ...seed.content,
  };

  return {
    id,
    serviceId: seed.serviceId,
    sessionId: seed.sessionId,
    claimId: seed.claimId,
    kind: seed.kind,
    proofType: seed.proofType,
    source: seed.source ?? "Sistem",
    channel: seed.channel ?? "SYSTEM",
    observedAt: at,
    recordedAt: at,
    payloadHash: integrityRefOf({
      resourceId: seed.serviceId,
      resourceType: "ProofEvent",
      action: seed.proofType,
      version: seed.version ?? 1,
      content,
    }),
    confidence: 1,
    status: "FOUND",
    provenance: { source: "ProofLayer", eventId: id },
    actorId: seed.actorId,
    actorRole: seed.actorRole,
    version: seed.version,
  };
}

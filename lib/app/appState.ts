import { APP_TODAY } from "@/data/app/seed";
import { EVIDENCE_LABEL } from "@/data/app/types";
import type {
  NetworkProposal,
  SignatureFeedback,
  SignatureStatus,
  VerificationSession,
} from "@/data/app/network";
import type {
  EvidenceEvent,
  Attestation,
  ServiceAnchorEvent,
  ProvenanceRecord,
  ProofState,
  ProofAssessment,
} from "@/data/app/proof";
import {
  EMPTY_EVIDENCE_EVENTS,
  EMPTY_ATTESTATIONS,
  EMPTY_ANCHOR_EVENTS,
  EMPTY_PROVENANCE_RECORDS,
} from "@/data/app/proof";
import type {
  AuditEntry,
  CaptureChannel,
  ClaimStatus,
  EvidenceKind,
  EvidenceSource,
  Notification,
  ReviewAction,
  Role,
  Service,
} from "@/data/app/types";
import { getTemplate, seedSource, type DataSource } from "@/lib/app/selectors";

export type EvidenceAdd = {
  serviceId: string;
  kind: EvidenceKind;
  at: string;
  source: EvidenceSource;
  channel?: CaptureChannel;
};

export type PersistedState = {
  role: Role;
  createdServices: Service[];
  evidenceAdds: EvidenceAdd[];
  statusOverrides: Record<string, ClaimStatus>;
  reviews: ReviewAction[];
  audit: AuditEntry[];
  notifications: Notification[];
  readIds: string[];
  nextSeq: number;
  proposals: NetworkProposal[];
  signatureStatus: Record<string, SignatureStatus>;
  feedbacks: SignatureFeedback[];
  /** Phase 8 — sesi verifikasi jaringan (persist via store pattern). */
  verificationSessions: VerificationSession[];
  proofEvents: EvidenceEvent[];
  attestations: Attestation[];
  anchors: ServiceAnchorEvent[];
  provenance: ProvenanceRecord[];
  proofStates: Record<string, ProofState>;
  proofAssessments: Record<string, ProofAssessment>;
};

export type StartServiceInput = {
  patientId: string;
  providerId: string;
  templateId: string;
  servicePoint: string;
};

export const initialPersistedState: PersistedState = {
  role: "reviewer",
  createdServices: [],
  evidenceAdds: [],
  statusOverrides: {},
  reviews: [],
  audit: [],
  notifications: [],
  readIds: [],
  nextSeq: 1,
  proposals: [],
  signatureStatus: {},
  feedbacks: [],
  verificationSessions: [],
  proofEvents: EMPTY_EVIDENCE_EVENTS,
  attestations: EMPTY_ATTESTATIONS,
  anchors: EMPTY_ANCHOR_EVENTS,
  provenance: EMPTY_PROVENANCE_RECORDS,
  proofStates: {},
  proofAssessments: {},
};

export function clockHM(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function nowStamp(): string {
  return `${APP_TODAY} ${clockHM()}`;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

export function mergePersistedState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== "object") return initialPersistedState;
  return { ...initialPersistedState, ...(raw as Partial<PersistedState>) };
}

export function pushAudit(
  list: AuditEntry[],
  entry: Omit<AuditEntry, "id" | "at" | "user" | "role">,
  userName: string,
  userRole: Role,
): AuditEntry[] {
  return [
    { id: uid("AUD"), at: nowStamp(), user: userName, role: userRole, ...entry },
    ...list,
  ];
}

export function applyEvidenceAdds(
  service: Service,
  adds: EvidenceAdd[],
): Service {
  const mine = adds.filter((a) => a.serviceId === service.id);
  if (mine.length === 0) return service;

  const required = getTemplate(service.templateId).required;
  let changed = false;

  const evidence = service.evidence.map((e) => {
    const add = mine.find((a) => a.kind === e.kind);
    if (!add || e.state === "present") return e;
    changed = true;
    return {
      ...e,
      state: "present" as const,
      at: add.at,
      source: add.source,
    };
  });

  const newEvents = mine
    .filter(
      (a) =>
        !service.events.some(
          (ev) => ev.id === `EV-${service.id}-${a.kind.toUpperCase()}`,
        ),
    )
    .map((a) => ({
      id: `EV-${service.id}-${a.kind.toUpperCase()}`,
      serviceId: service.id,
      kind: a.kind,
      at: a.at,
      source: a.source,
      description: `${EVIDENCE_LABEL[a.kind]} tercatat${
        a.channel ? ` · via ${a.channel}` : ""
      }`,
    }));

  if (!changed && newEvents.length === 0) return service;

  const events = [...service.events, ...newEvents].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const complete = required.every(
    (k) => evidence.find((e) => e.kind === k)?.state === "present",
  );

  return {
    ...service,
    evidence,
    events,
    status: complete ? "SELESAI" : service.status,
    endTime:
      complete && !service.endTime
        ? (evidence.find((e) => e.kind === "claim")?.at ?? service.startTime)
        : service.endTime,
  };
}

/**
 * Bangun DataSource dari PersistedState terbaru (bukan closure render).
 * Dipakai store (src memo) dan publishSignature (recompute matcher dengan
 * state paling baru — lihat Phase 7 §14 "bukan stale closure").
 * evidenceAdds di-apply sebagai overlay supaya session/evidence state di
 * matcher mencerminkan capture dari Proof Layer.
 */
export function buildDataSource(state: PersistedState): DataSource {
  return {
    services: [...seedSource.services, ...state.createdServices].map((s) =>
      applyEvidenceAdds(s, state.evidenceAdds),
    ),
    reviews:
      state.reviews.length > 0
        ? [...state.reviews, ...seedSource.reviews]
        : seedSource.reviews,
    audit:
      state.audit.length > 0
        ? [...state.audit, ...seedSource.audit]
        : seedSource.audit,
    notifications:
      state.notifications.length > 0
        ? [...state.notifications, ...seedSource.notifications]
        : seedSource.notifications,
    proof: {
      proofEvents: state.proofEvents,
      attestations: state.attestations,
      anchors: state.anchors,
      proofStates: state.proofStates,
    },
  };
}

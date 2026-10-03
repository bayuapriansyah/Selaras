import type {
  AuditEntity,
  CaptureChannel,
  EvidenceKind,
  EvidenceSource,
  Role,
  SignalSeverity,
} from "@/data/app/types";

export type EvidenceEventStatus =
  | "FOUND"
  | "MISSING"
  | "CONFLICTING"
  | "UNAVAILABLE"
  | "LATE_ARRIVING";

export type EvidenceProvenance = {
  source: string;
  eventId: string;
};

export type EvidenceEvent = {
  id: string;
  serviceId: string;
  sessionId?: number;
  claimId?: string;
  kind: EvidenceKind;
  source: EvidenceSource;
  channel: CaptureChannel;
  observedAt: string;
  recordedAt: string;
  payloadHash: string;
  confidence: number;
  status: EvidenceEventStatus;
  provenance: EvidenceProvenance;
  supersededById?: string;
};

export type AttestationStatus = "PENDING" | "ATTESTED" | "REVOKED";

export type AttestationSubjectType =
  | "EvidenceEvent"
  | "ServicePassport"
  | "Claim"
  | "Proof";

export type Attestation = {
  id: string;
  subjectType: AttestationSubjectType;
  subjectId: string;
  actorId: string;
  actorRole: Role;
  statement: string;
  method: CaptureChannel;
  at: string;
  status: AttestationStatus;
  anchorEventId?: string;
  revokedReason?: string;
};

export type AnchorState = "PENDING" | "ANCHORED" | "FAILED";

export type ServiceAnchorEvent = {
  id: string;
  serviceId: string;
  sequence: number;
  previousHash: string;
  contentHash: string;
  merkleRoot?: string;
  anchoredAt: string;
  source: EvidenceSource;
  state: AnchorState;
};

export type ProvenanceResource =
  | AuditEntity
  | "Proof"
  | "Attestation"
  | "Anchor"
  | "Trace";

export type ProvenanceAction =
  | "CREATE"
  | "UPDATE"
  | "ATTEST"
  | "ANCHOR"
  | "VERIFY"
  | "SEAL"
  | "SUPERSEDE"
  | "REVOKE";

export type ProvenanceRecord = {
  id: string;
  resourceId: string;
  resourceType: ProvenanceResource;
  action: ProvenanceAction;
  actorId: string;
  timestamp: string;
  version: number;
  reason?: string;
  integrityRef: string;
  previousIntegrityRef?: string;
};

export type ProofState =
  | "REGISTERED"
  | "IDENTITY_BOUND"
  | "ATTESTED"
  | "CORROBORATED"
  | "SEALED"
  | "PROOF_GAP"
  | "INCONSISTENT";

export const PROOF_HAPPY_PATH: ProofState[] = [
  "REGISTERED",
  "IDENTITY_BOUND",
  "ATTESTED",
  "CORROBORATED",
  "SEALED",
];

export const PROOF_TRANSITIONS: Record<ProofState, ProofState[]> = {
  REGISTERED: ["IDENTITY_BOUND", "PROOF_GAP", "INCONSISTENT"],
  IDENTITY_BOUND: ["ATTESTED", "PROOF_GAP", "INCONSISTENT"],
  ATTESTED: ["CORROBORATED", "PROOF_GAP", "INCONSISTENT"],
  CORROBORATED: ["SEALED", "PROOF_GAP", "INCONSISTENT"],
  SEALED: [],
  PROOF_GAP: ["REGISTERED"],
  INCONSISTENT: ["REGISTERED"],
};

export const PROOF_STATE_LABEL: Record<ProofState, string> = {
  REGISTERED: "Terdaftar",
  IDENTITY_BOUND: "Identitas Terikat",
  ATTESTED: "Ditandatangani",
  CORROBORATED: "Dikukuhkan",
  SEALED: "Diseal",
  PROOF_GAP: "Bukti Belum Lengkap",
  INCONSISTENT: "Tidak Konsisten",
};

export type ProofDimension =
  | "identity"
  | "provider"
  | "serviceContext"
  | "evidence"
  | "temporal"
  | "billing"
  | "claim";

export const PROOF_DIMENSIONS: ProofDimension[] = [
  "identity",
  "provider",
  "serviceContext",
  "evidence",
  "temporal",
  "billing",
  "claim",
];

export const PROOF_DIMENSION_LABEL: Record<ProofDimension, string> = {
  identity: "Identitas Pasien",
  provider: "Provider / Aktor",
  serviceContext: "Konteks Layanan",
  evidence: "Bukti",
  temporal: "Konsistensi Waktu",
  billing: "Kaitan Billing",
  claim: "Kaitan Klaim",
};

export type ProofDimensionVerdict = "PASS" | "GAP" | "CONFLICT" | "UNKNOWN";

export const PROOF_VERDICT_LABEL: Record<ProofDimensionVerdict, string> = {
  PASS: "Lengkap",
  GAP: "Belum Lengkap",
  CONFLICT: "Bertentangan",
  UNKNOWN: "Belum Dinilai",
};

export type ProofDimensionResult = {
  dimension: ProofDimension;
  verdict: ProofDimensionVerdict;
  refs: string[];
  reason?: string;
};

export type ProofGapItem = {
  serviceId: string;
  claimId?: string;
  gaps: EvidenceKind[];
  severity: SignalSeverity;
  reasons: string[];
};

export const PROOF_MODEL_VERSION = 1;

export type ProofAssessment = {
  claimId: string;
  serviceId?: string;
  state: ProofState;
  dimensions: ProofDimensionResult[];
  gaps: ProofGapItem[];
  conflicts: string[];
  assessedAt: string;
  modelVersion: number;
};

export type WitnessSource = EvidenceSource | "Jaringan";

export type WitnessRole = "primary" | "corroborating" | "contradicting";

export type Witness = {
  id: string;
  source: WitnessSource;
  role: WitnessRole;
  statementRef: string;
  actorId?: string;
  at: string;
};

export type TriangulationOutcome =
  | "PENDING"
  | "AGREE"
  | "PARTIAL"
  | "CONFLICT";

export const TRIANGULATION_OUTCOME_LABEL: Record<TriangulationOutcome, string> =
  {
    PENDING: "Menunggu",
    AGREE: "Sepakat",
    PARTIAL: "Sebagian",
    CONFLICT: "Bertentangan",
  };

export type TriangulationRecord = {
  id: string;
  claimId: string;
  serviceId?: string;
  subject: string;
  witnesses: Witness[];
  outcome: TriangulationOutcome;
  createdAt: string;
};

export type ConformanceStage =
  | "CHECK_IN"
  | "SERVICE_START"
  | "TREATMENT"
  | "DOCUMENTATION"
  | "COMPLETION"
  | "BILLING"
  | "CLAIM";

export const CONFORMANCE_STAGE_ORDER: ConformanceStage[] = [
  "CHECK_IN",
  "SERVICE_START",
  "TREATMENT",
  "DOCUMENTATION",
  "COMPLETION",
  "BILLING",
  "CLAIM",
];

export const CONFORMANCE_STAGE_LABEL: Record<ConformanceStage, string> = {
  CHECK_IN: "Check-in",
  SERVICE_START: "Mulai Layanan",
  TREATMENT: "Tindakan",
  DOCUMENTATION: "Dokumentasi",
  COMPLETION: "Penyelesaian",
  BILLING: "Billing",
  CLAIM: "Klaim",
};

export type WorkflowStageStatus = "PENDING" | "DONE" | "SKIPPED" | "CONFLICT";

export type WorkflowStage = {
  stage: ConformanceStage;
  status: WorkflowStageStatus;
  evidenceEventId?: string;
  at?: string;
};

export type ConformanceWorkflow = {
  id: string;
  claimId: string;
  serviceId: string;
  stages: WorkflowStage[];
  createdAt: string;
  updatedAt?: string;
};

export type ClaimTraceNodeKind =
  | "claim"
  | "invoice"
  | "charge"
  | "service"
  | "encounter"
  | "provider"
  | "evidence";

export const CLAIM_TRACE_CHAIN: ClaimTraceNodeKind[] = [
  "claim",
  "invoice",
  "charge",
  "service",
  "encounter",
  "provider",
  "evidence",
];

export type ClaimTraceNode = {
  id: string;
  kind: ClaimTraceNodeKind;
  label: string;
  refId: string;
  detail?: string;
};

export type ClaimTraceEdge = {
  from: string;
  to: string;
  label: string;
};

export type ClaimTrace = {
  claimId: string;
  nodes: ClaimTraceNode[];
  edges: ClaimTraceEdge[];
  generatedAt: string;
};

export const EMPTY_EVIDENCE_EVENTS: EvidenceEvent[] = [];
export const EMPTY_ATTESTATIONS: Attestation[] = [];
export const EMPTY_ANCHOR_EVENTS: ServiceAnchorEvent[] = [];
export const EMPTY_PROVENANCE_RECORDS: ProvenanceRecord[] = [];
export const EMPTY_PROOF_ASSESSMENTS: ProofAssessment[] = [];
export const EMPTY_TRIANGULATION_RECORDS: TriangulationRecord[] = [];
export const EMPTY_CONFORMANCE_WORKFLOWS: ConformanceWorkflow[] = [];
export const EMPTY_CLAIM_TRACES: ClaimTrace[] = [];

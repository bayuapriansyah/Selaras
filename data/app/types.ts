export type Role = "operator" | "provider" | "reviewer" | "admin";

export type User = {
  id: string;
  name: string;
  initials: string;
  role: Role;
  title: string;
  email: string;
};

export type Facility = {
  id: string;
  name: string;
  kind: "Klinik" | "Rumah Sakit" | "Laboratorium";
  city: string;
};

export type Provider = {
  id: string;
  name: string;
  profession: string;
  facilityId: string;
};

export type Patient = {
  id: string;
  display: string;
  gender: "L" | "P";
  birthYear: number;
};

export type EvidenceKind =
  | "arrival"
  | "provider"
  | "treatment"
  | "note"
  | "completion"
  | "billing"
  | "claim";

export const EVIDENCE_ORDER: EvidenceKind[] = [
  "arrival",
  "provider",
  "treatment",
  "note",
  "completion",
  "billing",
  "claim",
];

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  arrival: "Kedatangan",
  provider: "Verifikasi Provider",
  treatment: "Tindakan",
  note: "Catatan Klinis",
  completion: "Penyelesaian",
  billing: "Billing",
  claim: "Terkait Klaim",
};

export type ServiceTemplate = {
  id: string;
  name: string;
  nameEn: string;
  required: EvidenceKind[];
  rate: number;
  description: string;
};

export type ServiceEvent = {
  id: string;
  serviceId: string;
  kind: EvidenceKind | "start";
  at: string;
  source: "Operator" | "Provider" | "Sistem";
  description: string;
};

export type EvidenceState = "present" | "missing";

export type EvidenceSource = "Operator" | "Provider" | "Sistem";

export type CaptureChannel = "QR" | "NFC" | "MANUAL" | "SYSTEM";

export type EvidenceItem = {
  kind: EvidenceKind;
  state: EvidenceState;
  at?: string;
  citation?: string;
  source?: EvidenceSource;
  note?: string;
};

export type ServiceStatus = "AKTIF" | "SELESAI";

export type Service = {
  id: string;
  patientId: string;
  providerId: string;
  facilityId: string;
  templateId: string;
  servicePoint: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: ServiceStatus;
  claimId?: string;
  sessionId?: number;
  evidence: EvidenceItem[];
  events: ServiceEvent[];
};

export type PassportStatus = "DRAFT" | "ACTIVE" | "COMPLETE";

export type ServicePassport = {
  serviceId: string;
  status: PassportStatus;
  coverage: number;
  seal: boolean;
};

export type Billing = {
  id: string;
  serviceId: string;
  amount: number;
  createdAt: string;
};

export type ClaimItem = {
  id: string;
  claimId: string;
  serviceId: string;
  sessionId: number;
  amount: number;
};

export type ClaimStatus =
  | "SUPPORTED"
  | "NEEDS REVIEW"
  | "INCOMPLETE"
  | "CONTRADICTED"
  | "NEEDS CLARIFICATION";

export type Claim = {
  id: string;
  patientId: string;
  templateId: string;
  facilityId: string;
  periodFrom: string;
  periodTo: string;
  status: ClaimStatus;
  items: ClaimItem[];
  lastUpdated: string;
  reviewedBy?: string;
};

export type SignalSeverity = "info" | "warning" | "critical";

export type SignalCode =
  | "EVIDENCE_GAP"
  | "MISSING_COMPLETION"
  | "TIMESTAMP_CONFLICT"
  | "DUPLICATE_SESSION"
  | "REPEAT_BILLING"
  | "BILLING_BEFORE_PASSPORT"
  | "PEER_OUTLIER";

export type SignalModus = {
  no: number;
  label: string;
};

export type RiskSignal = {
  id: string;
  claimId: string;
  sessionId?: number;
  code: SignalCode;
  severity: SignalSeverity;
  message: string;
  at: string;
  modus?: SignalModus[];
};

export type ReviewActionKind =
  | "NEED_CLARIFICATION"
  | "MARK_SUPPORTED"
  | "RETURN_FOR_REVIEW";

export type ReviewAction = {
  id: string;
  claimId: string;
  action: ReviewActionKind;
  note: string;
  by: string;
  at: string;
};

export type AuditEntity =
  | "Service"
  | "Evidence"
  | "Passport"
  | "Billing"
  | "Claim"
  | "Review"
  | "Signal"
  | "User";

export type AuditEntry = {
  id: string;
  at: string;
  user: string;
  role?: Role;
  action: string;
  entity: AuditEntity;
  entityId: string;
  description: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
};

export type SessionStatus =
  | "SUPPORTED"
  | "NEEDS REVIEW"
  | "INCOMPLETE"
  | "CONTRADICTED";

export type SessionEvaluation = {
  sessionId: number;
  status: SessionStatus;
  present: number;
  required: number;
  coverage: number;
};

export type ClaimEvaluation = {
  claimed: number;
  supported: number;
  needsReview: number;
  incomplete: number;
  contradicted: number;
  status: ClaimStatus;
};

export type ImpactResult = {
  rate: number;
  currentSessions: number;
  currentAmount: number;
  supportedSessions: number;
  supportedAmount: number;
  reviewSessions: number;
  reviewAmount: number;
  label: string;
};

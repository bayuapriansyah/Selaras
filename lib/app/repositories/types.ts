import type { AuditEntry, ClaimStatus, ReviewAction, Service } from "@/data/app/types";
import type {
  NetworkProposal,
  RiskSignature,
  SignatureFeedback,
  SignatureMatch,
  SignatureStatus,
} from "@/data/app/network";
import type {
  ClaimView,
  DataSource,
  PassportRow,
  QueueRow,
} from "@/lib/app/selectors";
import type { GraphPayload } from "@/lib/app/graph";
import type { ImmunityView, NetworkStats } from "@/lib/app/network";

export interface ClaimRepository {
  queue(
    statusOverride: Record<string, ClaimStatus> | undefined,
    src: DataSource,
  ): QueueRow[];
  view(claimId: string, src: DataSource): ClaimView | undefined;
}

export interface ServiceRepository {
  today(src: DataSource): Service[];
  byId(serviceId: string, src: DataSource): Service | undefined;
}

export interface EvidenceRepository {
  passportRows(src: DataSource): PassportRow[];
  passportRow(
    serviceId: string,
    src: DataSource,
  ): PassportRow | undefined;
}

export interface ReviewRepository {
  history(src: DataSource): ReviewAction[];
}

export interface AuditRepository {
  entries(src: DataSource): AuditEntry[];
}

export interface GraphRepository {
  graph(claimId: string, src: DataSource): GraphPayload | null;
}

export interface RiskSignatureRepository {
  list(
    statusOverrides: Record<string, SignatureStatus> | undefined,
    proposals: NetworkProposal[],
    src: DataSource,
    definitions?: Record<string, RiskSignature>,
  ): RiskSignature[];
  byId(
    signatureId: string,
    statusOverrides: Record<string, SignatureStatus> | undefined,
    proposals: NetworkProposal[],
    src: DataSource,
    definitions?: Record<string, RiskSignature>,
  ): RiskSignature | undefined;
}

export interface SignatureMatchRepository {
  active(
    signatures: RiskSignature[],
    src: DataSource,
  ): SignatureMatch[];
  byClaim(claimId: string, signatures: RiskSignature[], src: DataSource): SignatureMatch[];
}

export interface NetworkFeedbackRepository {
  list(feedbacks: SignatureFeedback[]): SignatureFeedback[];
}

export interface NetworkRiskRepository {
  stats(input: {
    statusOverrides: Record<string, SignatureStatus> | undefined;
    proposals: NetworkProposal[];
    feedbacks: SignatureFeedback[];
    src: DataSource;
    definitions?: Record<string, RiskSignature>;
  }): NetworkStats;
  immunity(
    signatureId: string,
    statusOverrides: Record<string, SignatureStatus> | undefined,
    proposals: NetworkProposal[],
    src: DataSource,
    definitions?: Record<string, RiskSignature>,
  ): ImmunityView;
}

export type Repositories = {
  claims: ClaimRepository;
  services: ServiceRepository;
  evidence: EvidenceRepository;
  reviews: ReviewRepository;
  audit: AuditRepository;
  graphs: GraphRepository;
  signatures: RiskSignatureRepository;
  matches: SignatureMatchRepository;
  feedback: NetworkFeedbackRepository;
  network: NetworkRiskRepository;
};

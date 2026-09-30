import type { AuditEntry, ClaimStatus, ReviewAction, Service } from "@/data/app/types";
import type {
  ClaimView,
  DataSource,
  PassportRow,
  QueueRow,
} from "@/lib/app/selectors";
import type { GraphPayload } from "@/lib/app/graph";

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

export type Repositories = {
  claims: ClaimRepository;
  services: ServiceRepository;
  evidence: EvidenceRepository;
  reviews: ReviewRepository;
  audit: AuditRepository;
  graphs: GraphRepository;
};

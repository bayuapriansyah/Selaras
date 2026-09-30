import { syntheticRepositories } from "@/lib/app/repositories/synthetic";
import type { Repositories } from "@/lib/app/repositories/types";

export type {
  AuditRepository,
  ClaimRepository,
  EvidenceRepository,
  GraphRepository,
  Repositories,
  ReviewRepository,
  ServiceRepository,
} from "@/lib/app/repositories/types";

/**
 * Titik penukaran implementasi. Saat migrasi ke backend nyata, ganti
 * syntheticRepositories dengan PostgresRepository / Neo4jGraphRepository /
 * FastAPIAdapter — UI dan service tidak perlu berubah.
 */
export const repositories: Repositories = syntheticRepositories;

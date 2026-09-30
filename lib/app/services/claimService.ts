import type { ClaimStatus } from "@/data/app/types";
import type { DataSource, QueueRow } from "@/lib/app/selectors";
import { dashboardMetrics as readDashboard, seedSource } from "@/lib/app/selectors";
import { repositories } from "@/lib/app/repositories";
import { impactOf } from "@/lib/app/rules";
import { buildExplanation, type ExplainResult } from "@/lib/app/explain";
import type { ImpactResult } from "@/data/app/types";

export function queue(
  statusOverride: Record<string, ClaimStatus> | undefined,
  src: DataSource = seedSource,
): QueueRow[] {
  return repositories.claims.queue(statusOverride, src);
}

export function view(claimId: string, src: DataSource = seedSource) {
  return repositories.claims.view(claimId, src);
}

export function impact(
  claimId: string,
  src: DataSource = seedSource,
): ImpactResult | null {
  const v = repositories.claims.view(claimId, src);
  if (!v) return null;
  return impactOf(
    v.template.rate,
    v.evaluation.claimed,
    v.evaluation.supported,
  );
}

export function explain(
  claimId: string,
  src: DataSource = seedSource,
): ExplainResult | null {
  return buildExplanation(claimId, src);
}

export function dashboard(
  statusOverride: Record<string, ClaimStatus> | undefined,
  src: DataSource = seedSource,
) {
  return readDashboard(statusOverride, src);
}

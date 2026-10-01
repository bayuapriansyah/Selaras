import { signatureSeeds, type NetworkProposal, type RiskSignature, type SignatureFeedback, type SignatureMatch, type SignatureStatus } from "@/data/app/network";
import { repositories } from "@/lib/app/repositories";
import {
  adaptiveAction,
  adaptiveLevel,
  signatureBundle,
  type NetworkStats,
} from "@/lib/app/network";
import type { ClaimView, DataSource } from "@/lib/app/selectors";
import { seedSource } from "@/lib/app/selectors";

export type NetworkRuntime = {
  statusOverrides: Record<string, SignatureStatus>;
  proposals: NetworkProposal[];
  feedbacks: SignatureFeedback[];
};

export function signatures(
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): RiskSignature[] {
  return repositories.signatures.list(
    runtime.statusOverrides,
    runtime.proposals,
    src,
  );
}

export function signatureById(
  signatureId: string,
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): RiskSignature | undefined {
  return repositories.signatures.byId(
    signatureId,
    runtime.statusOverrides,
    runtime.proposals,
    src,
  );
}

export function activeMatches(
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): SignatureMatch[] {
  return repositories.matches.active(
    signatureBundle(signatureSeeds, runtime.proposals, runtime.statusOverrides)
      .active,
    src,
  );
}

export function matchesForClaim(
  claimId: string,
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): SignatureMatch[] {
  return repositories.matches.byClaim(
    claimId,
    signatureBundle(signatureSeeds, runtime.proposals, runtime.statusOverrides)
      .active,
    src,
  );
}

export function stats(
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): NetworkStats {
  return repositories.network.stats({
    statusOverrides: runtime.statusOverrides,
    proposals: runtime.proposals,
    feedbacks: runtime.feedbacks,
    src,
  });
}

export function immunity(
  signatureId: string,
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
) {
  return repositories.network.immunity(
    signatureId,
    runtime.statusOverrides,
    runtime.proposals,
    src,
  );
}

export function feedbacks(runtime: NetworkRuntime): SignatureFeedback[] {
  return repositories.feedback.list(runtime.feedbacks);
}

export type ClaimNetworkView = {
  matches: SignatureMatch[];
  level: ReturnType<typeof adaptiveLevel>;
  action: string;
};

export function claimNetwork(
  view: ClaimView,
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): ClaimNetworkView {
  const matches = matchesForClaim(view.claim.id, runtime, src);
  const level = adaptiveLevel(view, matches);
  return { matches, level, action: adaptiveAction(level) };
}

export function pendingProposals(
  runtime: NetworkRuntime,
): NetworkProposal[] {
  return runtime.proposals.filter(
    (p) => p.status === "DRAFT" || p.status === "REVISION_REQUESTED",
  );
}

export function publishQueue(
  runtime: NetworkRuntime,
  src: DataSource = seedSource,
): RiskSignature[] {
  return signatures(runtime, src).filter((s) => s.status === "VALIDATED");
}

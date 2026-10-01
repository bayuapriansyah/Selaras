import { signatureSeeds } from "@/data/app/network";
import {
  allMatches,
  immunityView,
  matchesForClaim,
  networkStats,
  signatureBundle,
} from "@/lib/app/network";
import type {
  NetworkFeedbackRepository,
  NetworkRiskRepository,
  RiskSignatureRepository,
  SignatureMatchRepository,
} from "@/lib/app/repositories/types";

export const networkRiskRepositories = {
  signatures: {
    list: (statusOverrides, proposals, _src) =>
      signatureBundle(signatureSeeds, proposals, statusOverrides).all,
    byId: (signatureId, statusOverrides, proposals, _src) =>
      signatureBundle(signatureSeeds, proposals, statusOverrides).all.find(
        (s) => s.id === signatureId,
      ),
  } satisfies RiskSignatureRepository,

  matches: {
    active: (signatures, src) => allMatches(signatures, src),
    byClaim: (claimId, signatures, src) =>
      matchesForClaim(signatures, claimId, src),
  } satisfies SignatureMatchRepository,

  feedback: {
    list: (feedbacks) => feedbacks,
  } satisfies NetworkFeedbackRepository,

  network: {
    stats: ({ statusOverrides, proposals, feedbacks, src }) =>
      networkStats({
        seeds: signatureSeeds,
        proposals,
        statusOverrides,
        feedbacks,
        src,
      }),
    immunity: (signatureId, statusOverrides, proposals, src) =>
      immunityView(
        signatureId,
        signatureSeeds,
        proposals,
        statusOverrides,
        src,
      ),
  } satisfies NetworkRiskRepository,
};

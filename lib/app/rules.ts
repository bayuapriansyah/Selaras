import type {
  ClaimEvaluation,
  ClaimStatus,
  EvidenceItem,
  EvidenceKind,
  ImpactResult,
  PassportStatus,
  SessionEvaluation,
  SessionStatus,
} from "@/data/app/types";

function at(kind: EvidenceKind, evidence: EvidenceItem[]): string | undefined {
  return evidence.find((e) => e.kind === kind)?.at;
}

export function hasTimestampConflict(evidence: EvidenceItem[]): boolean {
  const treatment = at("treatment", evidence);
  const billing = at("billing", evidence);
  if (treatment && billing && billing < treatment) return true;
  const arrival = at("arrival", evidence);
  const note = at("note", evidence);
  if (arrival && note && note < arrival) return true;
  return false;
}

export function evaluateSession(
  evidence: EvidenceItem[],
  required: EvidenceKind[],
): SessionEvaluation {
  const relevant = evidence.filter((e) => required.includes(e.kind));
  const present = relevant.filter((e) => e.state === "present");
  const missing = relevant.filter((e) => e.state === "missing");

  let status: SessionStatus;
  if (evidence.length === 0 && required.length > 0) {
    status = "INCOMPLETE";
  } else if (hasTimestampConflict(relevant)) {
    status = "CONTRADICTED";
  } else if (missing.length === 0) {
    status = "SUPPORTED";
  } else if (
    missing.some((m) => m.kind === "arrival" || m.kind === "provider") ||
    missing.length >= 3
  ) {
    status = "INCOMPLETE";
  } else {
    status = "NEEDS REVIEW";
  }

  return {
    sessionId: 0,
    status,
    present: present.length,
    required: required.length,
    coverage: required.length
      ? Math.round((present.length / required.length) * 100)
      : 0,
  };
}

export function evaluateClaim(
  sessions: { sessionId: number; evaluation: SessionEvaluation }[],
): ClaimEvaluation {
  let supported = 0;
  let needsReview = 0;
  let incomplete = 0;
  let contradicted = 0;

  for (const s of sessions) {
    switch (s.evaluation.status) {
      case "SUPPORTED":
        supported += 1;
        break;
      case "NEEDS REVIEW":
        needsReview += 1;
        break;
      case "INCOMPLETE":
        incomplete += 1;
        break;
      case "CONTRADICTED":
        contradicted += 1;
        break;
    }
  }

  let status: ClaimStatus;
  if (contradicted > 0) status = "CONTRADICTED";
  else if (incomplete > 0) status = "INCOMPLETE";
  else if (needsReview > 0) status = "NEEDS REVIEW";
  else status = "SUPPORTED";

  return {
    claimed: sessions.length,
    supported,
    needsReview,
    incomplete,
    contradicted,
    status,
  };
}

export function passportStatusOf(
  evidence: EvidenceItem[],
  required: EvidenceKind[],
): { status: PassportStatus; coverage: number; seal: boolean } {
  const relevant = evidence.filter((e) => required.includes(e.kind));
  const present = relevant.filter((e) => e.state === "present").length;
  const coverage = relevant.length
    ? Math.round((present / relevant.length) * 100)
    : 0;

  let status: PassportStatus;
  if (present === 0) status = "DRAFT";
  else if (present >= relevant.length) status = "COMPLETE";
  else status = "ACTIVE";

  return { status, coverage, seal: status === "COMPLETE" };
}

export function impactOf(
  rate: number,
  claimed: number,
  supported: number,
): ImpactResult {
  const review = Math.max(claimed - supported, 0);
  return {
    rate,
    currentSessions: claimed,
    currentAmount: claimed * rate,
    supportedSessions: supported,
    supportedAmount: supported * rate,
    reviewSessions: review,
    reviewAmount: review * rate,
    label: "Simulasi berbasis data sintetis.",
  };
}

export type PassportStage =
  | "INCOMPLETE"
  | "PARTIALLY SUPPORTED"
  | "SUPPORTED";

export type PassportNextAction =
  | "CAPTURE TREATMENT"
  | "CAPTURE COMPLETION"
  | "LENGKAPI EVIDENCE";

function hasPresent(kind: EvidenceKind, evidence: EvidenceItem[]): boolean {
  return evidence.find((e) => e.kind === kind)?.state === "present";
}

export function passportStageOf(
  evidence: EvidenceItem[],
  required: EvidenceKind[],
): PassportStage {
  const missing = required.filter((k) => !hasPresent(k, evidence));
  if (missing.length === 0) return "SUPPORTED";
  const clinicalDone = required.includes("treatment")
    ? hasPresent("treatment", evidence)
    : hasPresent("completion", evidence);
  return clinicalDone ? "PARTIALLY SUPPORTED" : "INCOMPLETE";
}

export function passportNextAction(
  evidence: EvidenceItem[],
  required: EvidenceKind[],
): PassportNextAction | null {
  const stage = passportStageOf(evidence, required);
  if (stage === "SUPPORTED") return null;
  if (required.includes("treatment") && !hasPresent("treatment", evidence)) {
    return "CAPTURE TREATMENT";
  }
  if (required.includes("completion") && !hasPresent("completion", evidence)) {
    return "CAPTURE COMPLETION";
  }
  return "LENGKAPI EVIDENCE";
}

import type {
  ClaimStatus,
  ReviewAction,
  ReviewActionKind,
  Role,
} from "@/data/app/types";
import { REVIEW_LABEL } from "@/lib/app/actions";
import {
  nowStamp,
  pushAudit,
  uid,
  type PersistedState,
} from "@/lib/app/appState";

const STATUS_BY_ACTION: Record<ReviewActionKind, ClaimStatus> = {
  NEED_CLARIFICATION: "NEEDS CLARIFICATION",
  MARK_SUPPORTED: "SUPPORTED",
  RETURN_FOR_REVIEW: "NEEDS REVIEW",
};

export function history(reviews: ReviewAction[]): ReviewAction[] {
  return reviews;
}

export function submitReview(
  prev: PersistedState,
  claimId: string,
  action: ReviewActionKind,
  note: string,
  userName: string,
  userRole: Role,
): PersistedState {
  const review: ReviewAction = {
    id: uid("RA"),
    claimId,
    action,
    note,
    by: userName,
    at: nowStamp(),
  };

  const audit = pushAudit(
    prev.audit,
    {
      action:
        action === "NEED_CLARIFICATION"
          ? "CLARIFICATION_REQUESTED"
          : "CLAIM_REVIEWED",
      entity: "Review",
      entityId: claimId,
      description:
        action === "NEED_CLARIFICATION"
          ? `Klarifikasi diminta untuk ${claimId}: ${note.slice(0, 140)}`
          : `Aksi tinjauan: ${REVIEW_LABEL[action]} untuk ${claimId}.`,
    },
    userName,
    userRole,
  );

  const notification = {
    id: uid("NTF"),
    title: `${claimId} — ${REVIEW_LABEL[action]}`,
    body: note.slice(0, 120),
    at: nowStamp(),
    read: false,
  };

  return {
    ...prev,
    statusOverrides: {
      ...prev.statusOverrides,
      [claimId]: STATUS_BY_ACTION[action],
    },
    reviews: [review, ...prev.reviews],
    audit,
    notifications: [notification, ...prev.notifications],
  };
}

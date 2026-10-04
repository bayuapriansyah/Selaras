import {
  OUTCOME_RESULT,
  signatureSeeds,
  type AdaptiveLevel,
  type RiskSignature,
  type SignatureFeedback,
  type VerificationSession,
  type VerificationStep,
  type SubmittableOutcome,
} from "@/data/app/network";
import { buildDataSource, nowStamp, pushAudit, uid, type PersistedState } from "@/lib/app/appState";
import { controlsOf, signatureBundle } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import { view as claimView } from "@/lib/app/services/claimService";
import type { AuditActor } from "@/lib/app/services/provenanceService";

/**
 * Phase 8 — Network verification service (reducers murni, tanpa backend).
 *
 * NETWORK MATCH → RISK-SPECIFIC VERIFICATION → HUMAN REVIEW → OUTCOME →
 * AUDIT → FEEDBACK.
 *
 * Aturan:
 * - RBAC: hanya pemegang permission `reviewClaim` (Reviewer/Admin) yang boleh
 *   memulai & menyetujui verifikasi; permission tidak ditambah (§5).
 * - Idempotency: satu sesi IN_PROGRESS per claim+signature; submit ganda tidak
 *   menghasilkan feedback/audit dobel (§19).
 * - Submit gate: semua required controls selesai + tanpa kontradiksi bukti (§8).
 * - Verification TIDAK mengubah score/signals/ranking/queue/payment gate/
 *   statusOverrides (§21).
 */

export type StartVerificationInput = {
  matchKey: string;
  claimId: string;
  signatureId: string;
  level: AdaptiveLevel;
};

export type StartVerificationResult = {
  state: PersistedState;
  session: VerificationSession | null;
  created: boolean;
  denied?: boolean;
};

export type SubmitVerificationBlocked =
  | "RBAC"
  | "SESSION_NOT_FOUND"
  | "ALREADY_COMPLETED"
  | "REQUIRED_PENDING"
  | "CONTRADICTION"
  | "BAD_OUTCOME";

export type SubmitVerificationResult = {
  state: PersistedState;
  session: VerificationSession | null;
  feedback: SignatureFeedback | null;
  blocked?: SubmitVerificationBlocked;
};

function resolveSignature(
  state: PersistedState,
  signatureId: string,
): RiskSignature | undefined {
  return signatureBundle(
    signatureSeeds,
    state.proposals,
    state.signatureStatus,
  ).all.find((s) => s.id === signatureId);
}

function stepsFor(signature: RiskSignature): VerificationStep[] {
  return controlsOf(signature).map((c) => ({
    id: `${signature.id}:${c.code}`,
    signatureId: signature.id,
    code: c.code,
    label: c.label,
    reason: c.reason,
    status: "PENDING" as const,
    required: c.required,
    evidence: c.evidence,
  }));
}

export function sessionStatusOf(
  session: VerificationSession | undefined,
): VerificationSession["status"] {
  return session ? session.status : "NOT_STARTED";
}

export function activeSessionOf(
  state: PersistedState,
  claimId: string,
  signatureId: string,
): VerificationSession | undefined {
  return state.verificationSessions.find(
    (s) =>
      s.claimId === claimId &&
      s.signatureId === signatureId &&
      s.status === "IN_PROGRESS",
  );
}

export function latestSessionOf(
  state: PersistedState,
  claimId: string,
  signatureId: string,
): VerificationSession | undefined {
  return [...state.verificationSessions]
    .reverse()
    .find((s) => s.claimId === claimId && s.signatureId === signatureId);
}

export function stepsCompletion(
  session: VerificationSession,
): { required: number; done: number; complete: boolean } {
  const required = session.steps.filter((s) => s.required);
  const done = required.filter((s) => s.status === "VERIFIED").length;
  return { required: required.length, done, complete: done === required.length };
}

/** Gate submit §8: required controls selesai + tidak ada kontradiksi bukti. */
export function submitGate(
  state: PersistedState,
  session: VerificationSession,
): { ok: boolean; reason?: "REQUIRED_PENDING" | "CONTRADICTION" } {
  if (!stepsCompletion(session).complete) return { ok: false, reason: "REQUIRED_PENDING" };
  const view = claimView(session.claimId, buildDataSource(state));
  if (view && view.evaluation.contradicted > 0) {
    return { ok: false, reason: "CONTRADICTION" };
  }
  return { ok: true };
}

/**
 * Mulai verifikasi jaringan (idempoten): mengembalikan sesi IN_PROGRESS yang
 * sudah ada untuk claim+signature, atau membuat NET-VER-XXXX baru + audit
 * NET_VERIFICATION_STARTED.
 */
export function startNetworkVerification(
  state: PersistedState,
  input: StartVerificationInput,
  actor: AuditActor,
): StartVerificationResult {
  if (!can(actor.role, "reviewClaim")) {
    return { state, session: null, created: false, denied: true };
  }
  const existing = activeSessionOf(state, input.claimId, input.signatureId);
  if (existing) return { state, session: existing, created: false };

  const signature = resolveSignature(state, input.signatureId);
  if (!signature) return { state, session: null, created: false };

  const id = `NET-VER-${String(state.verificationSessions.length + 1).padStart(4, "0")}`;
  const session: VerificationSession = {
    id,
    matchKey: input.matchKey,
    claimId: input.claimId,
    signatureId: input.signatureId,
    level: input.level,
    status: "IN_PROGRESS",
    steps: stepsFor(signature),
    startedBy: actor.name,
    startedAt: nowStamp(),
  };
  return {
    state: {
      ...state,
      verificationSessions: [...state.verificationSessions, session],
      audit: pushAudit(
        state.audit,
        {
          action: "NET_VERIFICATION_STARTED",
          entity: "Network",
          entityId: input.claimId,
          description: `Verifikasi step-up dimulai untuk ${input.claimId} (match ${input.signatureId}) — sesi ${session.id} oleh ${actor.name}.`,
        },
        actor.name,
        actor.role,
      ),
    },
    session,
    created: true,
  };
}

/** Toggle satu checklist item (disimpan di sesi; TANPA audit per klik §11). */
export function toggleVerificationStep(
  state: PersistedState,
  sessionId: string,
  stepId: string,
  actor: AuditActor,
): PersistedState {
  if (!can(actor.role, "reviewClaim")) return state;
  let changed = false;
  const sessions = state.verificationSessions.map((s) => {
    if (s.id !== sessionId || s.status !== "IN_PROGRESS") return s;
    const steps = s.steps.map((st) => {
      if (st.id !== stepId) return st;
      changed = true;
      const verified = st.status !== "VERIFIED";
      return verified
        ? { ...st, status: "VERIFIED" as const, checkedBy: actor.name, checkedAt: nowStamp() }
        : {
            ...st,
            status: "PENDING" as const,
            checkedBy: undefined,
            checkedAt: undefined,
          };
    });
    return changed ? { ...s, steps } : s;
  });
  return changed ? { ...state, verificationSessions: sessions } : state;
}

/**
 * Submit hasil verifikasi final (CLEARED / NEEDS_MORE_DATA / CONFIRMED).
 * Idempoten: sesi COMPLETED tidak menghasilkan feedback/audit baru.
 * Hasil TIDAK mengubah skor/klaim/pembayaran — hanya feedback + audit (§21).
 */
export function submitNetworkVerification(
  state: PersistedState,
  sessionId: string,
  outcome: SubmittableOutcome,
  note: string | undefined,
  actor: AuditActor,
): SubmitVerificationResult {
  if (!can(actor.role, "reviewClaim")) {
    return { state, session: null, feedback: null, blocked: "RBAC" };
  }
  const session = state.verificationSessions.find((s) => s.id === sessionId);
  if (!session) {
    return { state, session: null, feedback: null, blocked: "SESSION_NOT_FOUND" };
  }
  if (session.status === "COMPLETED") {
    return { state, session, feedback: null, blocked: "ALREADY_COMPLETED" };
  }
  const gate = submitGate(state, session);
  if (!gate.ok) {
    return { state, session, feedback: null, blocked: gate.reason };
  }
  if (!OUTCOME_RESULT[outcome]) {
    return { state, session, feedback: null, blocked: "BAD_OUTCOME" };
  }

  const completed: VerificationSession = {
    ...session,
    status: "COMPLETED",
    completedBy: actor.name,
    completedAt: nowStamp(),
    result: outcome,
    note: note || undefined,
  };
  const feedback: SignatureFeedback = {
    id: uid("FB"),
    matchKey: session.matchKey,
    signatureId: session.signatureId,
    claimId: session.claimId,
    result: OUTCOME_RESULT[outcome],
    outcome,
    note: note || undefined,
    by: actor.name,
    at: nowStamp(),
  };
  return {
    state: {
      ...state,
      verificationSessions: state.verificationSessions.map((s) =>
        s.id === sessionId ? completed : s,
      ),
      feedbacks: [feedback, ...state.feedbacks],
      audit: pushAudit(
        state.audit,
        {
          action: "NET_VERIFICATION_RESULT",
          entity: "Network",
          entityId: session.claimId,
          description: `Hasil verifikasi ${session.claimId} (${session.signatureId}): ${outcome} — sesi ${session.id} ditutup.`,
        },
        actor.name,
        actor.role,
      ),
    },
    session: completed,
    feedback,
  };
}

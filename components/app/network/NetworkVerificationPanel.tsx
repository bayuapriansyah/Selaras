"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { Button } from "@/components/ui/button";
import {
  OUTCOME_LABEL,
  SUBMITTABLE_OUTCOMES,
  type ControlEvidenceLink,
  type SignatureMatch,
  type SubmittableOutcome,
  type VerificationSession,
} from "@/data/app/network";
import { ROLE_LABEL } from "@/lib/app/actions";
import { formatDateTime } from "@/lib/app/format";
import { conditionLabel, controlsOf, adaptiveLevel } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import type { ClaimView, DataSource } from "@/lib/app/selectors";
import { view as claimView } from "@/lib/app/services/claimService";
import * as networkSvc from "@/lib/app/services/networkService";
import { submitGate } from "@/lib/app/services/verificationService";

/**
 * Phase 8 — STEP-UP VERIFICATION (risk-specific verification).
 * NETWORK MATCH → RISK-SPECIFIC VERIFICATION → HUMAN REVIEW → OUTCOME →
 * AUDIT → FEEDBACK. Additive: kontrak ClaimNetworkPanel (LOCAL/NETWORK/
 * RECOMMENDED) tidak diubah di sini.
 */

const OUTCOME_SHORT: Record<SubmittableOutcome, string> = {
  CLEARED: "klaim bersih",
  NEEDS_MORE_DATA: "perlu data lebih",
  CONFIRMED: "pola dikonfirmasi",
};

const EVIDENCE_LINK_LABEL: Record<ControlEvidenceLink, string> = {
  passport: "Lihat Service Passport",
  attestation: "Lihat event attestation",
  session: "Lihat evidence sesi",
  claimTrace: "Lihat Claim Trace",
};

function evidenceHref(
  evidence: ControlEvidenceLink,
  claimId: string,
  view: ClaimView,
): string {
  if (evidence === "session") {
    const gap = view.sessions.find((s) =>
      s.service.evidence.some(
        (e) => e.kind === "completion" && e.state !== "present",
      ),
    );
    const target = gap ?? view.sessions[0];
    return target ? `/app/passport/${target.service.id}` : `/app/proof/${claimId}`;
  }
  return `/app/proof/${claimId}`;
}

function controlHint(
  code: string,
  claimId: string,
  view: ClaimView,
  src: DataSource,
): string | null {
  const serviceIds = view.sessions.map((s) => s.service.id);
  switch (code) {
    case "SERVICE_UNIQUENESS":
      return `${view.sessions.length} episode tercatat pada klaim ini — pastikan tiap episode direpresentasikan hanya sekali.`;
    case "PROVIDER_ATTESTATION": {
      const n =
        src.proof?.attestations.filter(
          (a) =>
            (a.subjectType === "ServicePassport" &&
              serviceIds.includes(a.subjectId)) ||
            (a.subjectType === "Claim" && a.subjectId === claimId),
        ).length ?? 0;
      return `${n} attestation tercatat untuk episode ini.`;
    }
    case "COMPLETION_EVIDENCE": {
      const present = view.sessions.filter((s) =>
        s.service.evidence.find((e) => e.kind === "completion")?.state,
      ).length;
      const done = view.sessions.filter(
        (s) =>
          s.service.evidence.find((e) => e.kind === "completion")?.state ===
          "present",
      ).length;
      return `Completion present pada ${done}/${present || view.sessions.length} sesi.`;
    }
    case "BILLING_LINKAGE": {
      const done = view.sessions.filter(
        (s) => s.service.evidence.find((e) => e.kind === "billing")?.state === "present",
      ).length;
      return `Billing tercatat pada ${done}/${view.sessions.length} sesi — pastikan menunjuk episode yang sama.`;
    }
    default:
      return null;
  }
}

export function NetworkVerificationPanel({
  claimId,
  matches,
  selectedKey,
  onSelect,
}: {
  claimId: string;
  matches: SignatureMatch[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const {
    state,
    src,
    role,
    networkRuntime,
    startVerification,
    toggleVerificationStep,
    submitVerification,
  } = useApp();
  const [picked, setPicked] = React.useState<SubmittableOutcome | null>(null);
  const [note, setNote] = React.useState("");

  const claim = React.useMemo(() => claimView(claimId, src), [claimId, src]);

  if (!claim || matches.length === 0) return null;

  const match = matches.find((m) => m.key === selectedKey) ?? matches[0];
  const sig = networkSvc.signatureById(match.signatureId, networkRuntime, src);
  const controls = sig ? controlsOf(sig) : [];
  const sessions = state.verificationSessions.filter(
    (s) => s.claimId === claimId && s.signatureId === match.signatureId,
  );
  const active = sessions.find((s) => s.status === "IN_PROGRESS");
  const completed = [...sessions].reverse().find((s) => s.status === "COMPLETED");
  const feedback = networkRuntime.feedbacks.find(
    (f) => f.claimId === claimId && f.signatureId === match.signatureId,
  );
  const canVerify = can(role, "reviewClaim");
  const level = adaptiveLevel(claim, matches);
  const proofState = state.proofStates[claimId];
  const proofEvents =
    state.proofEvents.filter((e) =>
      claim.sessions.some((s) => s.service.id === e.serviceId),
    ).length;

  const gate = active ? submitGate(state, active) : null;
  const requiredTotal = active
    ? active.steps.filter((s) => s.required).length
    : controls.filter((c) => c.required).length;
  const requiredDone = active
    ? active.steps.filter((s) => s.required && s.status === "VERIFIED").length
    : 0;

  const start = () => {
    setPicked(null);
    setNote("");
    startVerification(match.key, claimId, match.signatureId, level);
  };

  const renderMeta = (session?: VerificationSession) =>
    session ? (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {[
          ["Claim", session.claimId],
          ["Signature", session.signatureId],
          ["Level", session.level],
          ["Started by", session.startedBy],
          ["Started at", formatDateTime(session.startedAt)],
          ["Status", session.status],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {k}
            </dt>
            <dd className="font-mono text-[11px] text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
    ) : null;

  const renderWhy = (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        Why this matched — {match.signatureId}
      </p>
      <p className="text-xs font-semibold text-slate-900">{sig?.name ?? "Risk Signature"}</p>
      <p className="text-[11px] text-slate-500">Matched because:</p>
      <ul aria-label="Kondisi match" className="flex flex-wrap gap-1.5">
        {match.matchedConditions.map((c, i) => (
          <li
            key={i}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-900"
          >
            <Check aria-hidden="true" className="size-3" />
            {conditionLabel(c)}
          </li>
        ))}
      </ul>
      <p className="font-mono text-[10px] tracking-wider text-slate-400">
        PROOF CONTEXT: {proofState ?? "NOT ASSESSED"} · {proofEvents} evidence event
      </p>
    </div>
  );

  const renderScope = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        Active signals:
      </span>
      {matches.map((m) => (
        <button
          key={m.key}
          type="button"
          aria-pressed={m.key === match.key}
          aria-label={`Scope ${m.signatureId}`}
          onClick={() => onSelect(m.key)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
            m.key === match.key
              ? "border-slate-700 bg-slate-700 text-white"
              : "border-slate-300 bg-white text-slate-600 hover:border-slate-500",
          )}
        >
          {m.signatureId}
        </button>
      ))}
      <span className="text-[11px] text-slate-500">
        — scope verifikasi: {match.signatureId}
      </span>
    </div>
  );

  const renderStart =
    canVerify && !active && !completed && !feedback ? (
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          aria-label="Mulai verifikasi jaringan"
          onClick={start}
          className="w-full rounded-full border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 sm:w-auto"
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          MULAI VERIFIKASI — {match.signatureId}
        </Button>
        <p className="text-[11px] text-slate-500">
          {requiredTotal} kontrol wajib mengikuti definisi signature — “What to
          verify” diturunkan dari {sig?.id ?? "signature"}.
        </p>
      </div>
    ) : null;

  const completedSession = completed ?? null;
  const legacy = !completedSession && !active && feedback ? feedback : null;
  const renderComplete =
    completedSession || legacy ? (
      <div
        aria-label="Verifikasi selesai"
        className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Verification complete
            </p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-900">
              Result:{" "}
              {completedSession ? completedSession.result : legacy?.outcome} —{" "}
              {completedSession
                ? OUTCOME_SHORT[completedSession.result as SubmittableOutcome] ??
                  completedSession.result
                : legacy?.outcome}
            </p>
          </div>
          <Link
            href="/app/network/matches"
            className="text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
          >
            Lihat semua match →
          </Link>
        </div>
        <p className="font-mono text-[10px] tracking-wider text-emerald-700">
          {completedSession
            ? `${completedSession.id} · ${completedSession.completedBy ?? completedSession.startedBy} · ${formatDateTime(completedSession.completedAt ?? completedSession.startedAt)}${
                completedSession.note ? ` · ${completedSession.note}` : ""
              }`
            : `${match.signatureId} · ${legacy?.by} · ${formatDateTime(legacy?.at ?? "")}${
                legacy?.note ? ` · ${legacy.note}` : ""
              }`}
        </p>
        <p className="text-[11px] text-emerald-800">
          Status lokal klaim tidak berubah — hasil verifikasi hanya menjadi
          feedback jaringan.
        </p>
        {completedSession?.result === "NEEDS_MORE_DATA" && canVerify ? (
          <Button
            type="button"
            aria-label="Mulai verifikasi jaringan"
            onClick={start}
            className="w-fit rounded-full border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            MULAI VERIFIKASI ULANG — {match.signatureId}
          </Button>
        ) : null}
      </div>
    ) : null;

  const renderRbacNote =
    !canVerify && !active && !completedSession && !legacy ? (
      <p
        aria-label="RBAC verifikasi"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
      >
        Peran {ROLE_LABEL[role] ?? role} tidak berwenang memulai atau
        menyetujui verifikasi jaringan — hanya Reviewer/Admin. Provider tetap
        dapat melengkapi evidence.
      </p>
    ) : null;

  const renderChecklist = active ? (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          What to verify — checklist
        </p>
        <p className="font-mono text-[11px] text-slate-500">
          {requiredDone}/{requiredTotal} kontrol wajib selesai
        </p>
      </div>
      <ul aria-label="Checklist verifikasi" className="flex flex-col gap-2">
        {active.steps.map((step) => (
          <li
            key={step.id}
            data-verification-step={step.code}
            className={
              "flex items-start gap-3 rounded-xl border p-3 " +
              (step.status === "VERIFIED"
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-slate-200 bg-white")
            }
          >
            <button
              type="button"
              aria-pressed={step.status === "VERIFIED"}
              aria-label={`Centang ${step.label}`}
              disabled={!canVerify}
              onClick={() => toggleVerificationStep(active.id, step.id)}
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                step.status === "VERIFIED"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white text-transparent hover:border-slate-400",
              )}
            >
              <Check aria-hidden="true" className="size-3.5" />
            </button>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-900">
                {step.label}
                <span
                  className={
                    "rounded-full border px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider " +
                    (step.required
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-300 bg-slate-50 text-slate-500")
                  }
                >
                  {step.required ? "wajib" : "opsional"}
                </span>
                {step.status === "VERIFIED" ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-600">
                    verified · {step.checkedBy} · {formatDateTime(step.checkedAt ?? "")}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {step.reason}
              </p>
              {controlHint(step.code, claimId, claim, src) ? (
                <p className="text-[11px] text-slate-500">
                  {controlHint(step.code, claimId, claim, src)}
                </p>
              ) : null}
              <Link
                href={evidenceHref(step.evidence, claimId, claim)}
                className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                {EVIDENCE_LINK_LABEL[step.evidence]}
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {gate && !gate.ok && gate.reason === "REQUIRED_PENDING" ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          {requiredTotal - requiredDone} kontrol wajib belum selesai — seluruh
          checklist wajib diselesaikan sebelum submit. Item opsional tidak
          dipaksa.
        </p>
      ) : null}
      {gate && !gate.ok && gate.reason === "CONTRADICTION" ? (
        <p
          role="status"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          Kontradiksi bukti terdeteksi pada klaim ini — selesaikan konflik bukti
          sebelum menyerahkan hasil.
        </p>
      ) : null}
    </div>
  ) : null;

  const renderResult = active ? (
    <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        Result
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {SUBMITTABLE_OUTCOMES.map((o) => (
          <button
            key={o}
            type="button"
            aria-label={`Hasil ${o}`}
            aria-pressed={picked === o}
            disabled={!canVerify || (gate ? !gate.ok : true)}
            onClick={() => setPicked(o)}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-50",
              picked === o
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
            )}
          >
            {OUTCOME_LABEL[o]}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        {picked
          ? `${OUTCOME_LABEL[picked]} — ${picked === "CLEARED"
              ? "sinyal tidak lagi membutuhkan eskalasi"
              : picked === "NEEDS_MORE_DATA"
                ? "minta bukti tambahan"
                : "pola tetap didukung — temuan untuk keputusan manusia"}.`
          : "Pilih hasil verifikasi."}
      </p>
      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        Note (opsional reviewer)
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan verifikasi (opsional)"
          aria-label="Catatan verifikasi"
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-sky-400"
        />
      </label>
      <Button
        type="button"
        aria-label="Kirim hasil verifikasi"
        disabled={!canVerify || !picked || (gate ? !gate.ok : true)}
        onClick={() => {
          if (!picked) return;
          submitVerification(active.id, picked, note.trim() || undefined);
          setPicked(null);
          setNote("");
        }}
        className="w-full rounded-full sm:w-auto"
      >
        SUBMIT RESULT
      </Button>
    </div>
  ) : null;

  const statusChip = active
    ? "IN_PROGRESS"
    : completedSession || legacy
      ? "COMPLETED"
      : "NOT_STARTED";

  return (
    <section
      aria-label="STEP-UP VERIFICATION"
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Step-up verification
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
            {claimId} · {match.signatureId}
            {active || completedSession ? ` · ${active?.id ?? completedSession?.id}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            statusChip === "COMPLETED"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : statusChip === "IN_PROGRESS"
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-slate-300 bg-white text-slate-500",
          )}
        >
          {statusChip}
        </span>
      </div>

      {renderScope}
      {renderMeta(active ?? completedSession ?? undefined)}
      {renderWhy}
      {renderStart}
      {renderChecklist}
      {renderResult}
      {renderComplete}
      {renderRbacNote}
    </section>
  );
}

"use client";

import * as React from "react";
import type {
  RiskSignature,
  SignatureFeedback,
  SignatureHistoryRecord,
  SignatureMatch,
} from "@/data/app/network";
import { SIGNATURE_STATUS_LABEL } from "@/data/app/network";
import { formatDateTime } from "@/lib/app/format";
import {
  learningMetrics,
  observationLines,
  percentLabel,
  recommendationOf,
  RECOMMENDATION_TEXT,
  FALSE_POSITIVE_RATE_UNAVAILABLE,
  MIN_VERIFIED_FOR_EVALUATION,
  MONITOR_FP_THRESHOLD,
} from "@/lib/app/services/learningService";

/**
 * Phase 9 — LEARNING LOOP section (signature detail).
 *
 * Counters + observation + facility distribution + visual loop §19 — semua
 * derived dari actual matches + SignatureFeedback (memoized di sini; tidak
 * menyentuh claimView hot path / dashboard per render §22). Tanpa chart ML:
 * timeline, counter, outcome distribution, lifecycle badge (§19/§20).
 */

function Counter({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "muted";
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === "warn"
          ? "border-amber-200 bg-amber-50"
          : tone === "muted"
            ? "border-slate-200 bg-slate-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          tone === "warn"
            ? "text-amber-700"
            : tone === "muted"
              ? "text-slate-500"
              : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const FLOW_STAGES = [
  "CLAIMS",
  "MATCH",
  "VERIFICATION",
  "OUTCOME",
  "FEEDBACK",
  "SIGNATURE MONITORING",
  "UPDATE / RETIRE",
] as const;

export function SignatureLearningPanel({
  sig,
  matches,
  feedbacks,
  history,
}: {
  sig: RiskSignature;
  matches: SignatureMatch[];
  feedbacks: SignatureFeedback[];
  history: SignatureHistoryRecord[];
}) {
  const metrics = React.useMemo(
    () => learningMetrics(sig.id, matches, feedbacks),
    [sig.id, matches, feedbacks],
  );
  const observation = React.useMemo(
    () => observationLines(metrics),
    [metrics],
  );
  const recommendation = React.useMemo(
    () => recommendationOf(metrics),
    [metrics],
  );
  const ownFeedback = React.useMemo(
    () => feedbacks.filter((f) => f.signatureId === sig.id),
    [feedbacks, sig.id],
  );
  const uniqueClaims = React.useMemo(
    () => new Set(matches.map((m) => m.claimId)).size,
    [matches],
  );
  const fpPercent = percentLabel(metrics.falsePositiveRate);
  const verPercent = percentLabel(metrics.verificationRate);

  const flowCounts: Record<(typeof FLOW_STAGES)[number], string> = {
    CLAIMS: String(uniqueClaims),
    MATCH: String(metrics.totalMatches),
    VERIFICATION: String(metrics.totalVerified),
    OUTCOME: `${metrics.clearedCount}/${metrics.needsMoreDataCount}/${metrics.confirmedCount}/${metrics.falsePositiveCount}`,
    FEEDBACK: String(ownFeedback.length),
    "SIGNATURE MONITORING": SIGNATURE_STATUS_LABEL[sig.status],
    "UPDATE / RETIRE": String(history.length),
  };

  return (
    <section
      aria-label="LEARNING LOOP"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Learning Loop
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Feedback verifikasi menjadi statistik kualitas signature — transparan,
            derived, tanpa aksi otomatis.
          </p>
        </div>
        <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-3 font-mono text-[11px] tracking-wider text-slate-600">
          v{sig.version} · {SIGNATURE_STATUS_LABEL[sig.status]}
        </span>
      </div>

      {/* Visual loop §19 — timeline sederhana, bukan chart. */}
      <div
        aria-label="LEARNING LOOP FLOW"
        className="flex flex-wrap items-center gap-1.5"
      >
        {FLOW_STAGES.map((stage, i) => (
          <React.Fragment key={stage}>
            {i > 0 ? (
              <span aria-hidden="true" className="text-xs text-slate-400">
                ↓
              </span>
            ) : null}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-700">
              {stage} · {flowCounts[stage]}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Counters §3/§4 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Counter label="Matches" value={String(metrics.totalMatches)} />
        <Counter label="Verified" value={String(metrics.totalVerified)} />
        <Counter label="Cleared" value={String(metrics.clearedCount)} />
        <Counter
          label="Needs More Data"
          value={String(metrics.needsMoreDataCount)}
        />
        <Counter label="Confirmed" value={String(metrics.confirmedCount)} />
        <Counter
          label="False Positive"
          value={String(metrics.falsePositiveCount)}
          tone={metrics.falsePositiveCount > 0 ? "warn" : "default"}
        />
        <Counter
          label="False Positive Rate"
          value={
            metrics.falsePositiveRate === null
              ? FALSE_POSITIVE_RATE_UNAVAILABLE
              : `${fpPercent}%`
          }
          tone={
            metrics.falsePositiveRate === null
              ? "muted"
              : metrics.falsePositiveRate > 0
                ? "warn"
                : "default"
          }
        />
        <Counter
          label="Verification Rate"
          value={
            metrics.verificationRate === null
              ? FALSE_POSITIVE_RATE_UNAVAILABLE
              : `${verPercent}%`
          }
          tone={metrics.verificationRate === null ? "muted" : "default"}
        />
      </div>

      {/* Observation + advisory §4/§17 */}
      <div
        aria-label="OBSERVATION"
        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
          Observation
        </p>
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {observation.map((line) => (
            <li key={line} className="text-xs text-slate-700">
              {line}
            </li>
          ))}
        </ul>
        <p
          className={`mt-2 text-xs font-semibold ${
            recommendation === "MONITOR"
              ? "text-amber-700"
              : recommendation === "GOOD"
                ? "text-emerald-700"
                : "text-slate-600"
          }`}
        >
          {RECOMMENDATION_TEXT[recommendation]}
        </p>
        <p className="mt-1 font-mono text-[10px] leading-relaxed tracking-wider text-slate-400">
          PROTOTYPE GOVERNANCE RULE: evaluasi butuh minimal{" "}
          {MIN_VERIFIED_FOR_EVALUATION} verifikasi; MONITOR saat false-positive
          rate ≥ {Math.round(MONITOR_FP_THRESHOLD * 100)}% — advisory saja, tanpa
          perubahan state otomatis.
        </p>
      </div>

      {/* Facility distribution §5 — unique facility dari actual matches. */}
      <div>
        <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
          Facilities Matched
        </p>
        {metrics.facilitiesMatched.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500">
            Belum ada match dengan faskes.
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {metrics.facilitiesMatched.map((f) => (
              <li
                key={f.facilityId}
                data-facility-id={f.facilityId}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5"
              >
                <span className="font-mono text-xs text-slate-700">
                  {f.facilityId}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900">
                  {f.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Feedback store §2 — bukti statistik berasal dari data riil. */}
      <div>
        <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
          Verification Outcomes
        </p>
        {ownFeedback.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500">
            Belum ada feedback verifikasi untuk signature ini.
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {ownFeedback.map((f) => (
              <li
                key={f.id}
                aria-label={`Feedback ${f.claimId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2"
              >
                <span className="font-mono text-[11px] tracking-wider text-slate-600">
                  {f.claimId} · {f.outcome}
                </span>
                <span className="text-[11px] text-slate-500">
                  {f.by} · {formatDateTime(f.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

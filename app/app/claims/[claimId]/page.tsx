"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Loader2,
  Minus,
  Play,
  Share2,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_REVIEWER_NOTE,
  GOLDEN_CLAIM_ID,
} from "@/data/app/seed";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import type { EvidenceItem, EvidenceKind, ReviewActionKind } from "@/data/app/types";
import {
  claimView,
  getFacility,
} from "@/lib/app/selectors";
import { REVIEW_LABEL } from "@/lib/app/actions";
import { buildExplanation, type ExplainResult } from "@/lib/app/explain";
import { impactOf } from "@/lib/app/rules";
import type { ImpactResult } from "@/data/app/types";
import { formatDateTime, periodLabel } from "@/lib/app/format";

function at(kind: EvidenceKind, evidence: EvidenceItem[]): string | undefined {
  return evidence.find((e) => e.kind === kind)?.at;
}

function cellState(
  kind: EvidenceKind,
  required: boolean,
  evidence: EvidenceItem[],
): "na" | "present" | "missing" | "conflict" {
  if (!required) return "na";
  const item = evidence.find((e) => e.kind === kind);
  if (item?.state !== "present") return "missing";

  const treatment = at("treatment", evidence);
  const billing = at("billing", evidence);
  const arrival = at("arrival", evidence);
  const note = at("note", evidence);
  if (kind === "billing" && treatment && billing && billing < treatment) return "conflict";
  if (kind === "note" && arrival && note && note < arrival) return "conflict";
  return "present";
}

function Cell({ state, title }: { state: ReturnType<typeof cellState>; title?: string }) {
  if (state === "na") {
    return (
      <span className="flex items-center justify-center text-slate-300" title="Tidak wajib">
        <Minus aria-hidden="true" className="size-3.5" />
      </span>
    );
  }
  if (state === "present") {
    return (
      <span
        className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        title={title ?? "Present"}
      >
        <Check aria-hidden="true" className="size-3.5" />
      </span>
    );
  }
  if (state === "missing") {
    return (
      <span
        className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-amber-700"
        title={title ?? "Belum tercatat"}
      >
        <CircleHelp aria-hidden="true" className="size-3.5" />
      </span>
    );
  }
  return (
    <span
      className="flex size-6 items-center justify-center rounded-full bg-red-100 text-red-700 ring-2 ring-red-200"
      title={title ?? "Konflik timestamp"}
    >
      <AlertTriangle aria-hidden="true" className="size-3.5" />
    </span>
  );
}

const SIGNAL_TONE: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export default function ClaimDetailPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  const { src, statusOf, role, submitReview } = useApp();

  const view = React.useMemo(() => claimView(claimId, src), [claimId, src]);

  const [explain, setExplain] = React.useState<ExplainResult | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiNotice, setAiNotice] = React.useState<string | null>(null);
  const [apiImpact, setApiImpact] = React.useState<(ImpactResult & { cachedAt?: string }) | null>(
    null,
  );
  const [reviewNote, setReviewNote] = React.useState(() =>
    claimId === GOLDEN_CLAIM_ID ? DEFAULT_REVIEWER_NOTE : "",
  );
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/claims/${claimId}/impact`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json) setApiImpact(json);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [claimId]);

  const canReview = role === "reviewer" || role === "admin";

  function submit(action: ReviewActionKind) {
    const note = reviewNote.trim();
    if (!note) return;
    submitReview(claimId, action, note);
    setSubmitted(REVIEW_LABEL[action]);
  }

  async function runExplain() {
    setAiLoading(true);
    setAiNotice(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setExplain((await res.json()) as ExplainResult);
    } catch {
      setExplain(buildExplanation(claimId, src));
      setAiNotice("Endpoint AI tidak tersedia — ringkasan dibangun lokal dari aturan evidence.");
    } finally {
      setAiLoading(false);
    }
  }

  if (!view) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 p-8">
        <h1 className="text-xl font-semibold text-slate-900">Klaim tidak ditemukan</h1>
        <p className="text-sm text-slate-500">
          ID <span className="font-mono">{claimId}</span> tidak ada di data.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/app/claims">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Kembali ke review queue
          </Link>
        </Button>
      </div>
    );
  }

  const { claim, template, patient, evaluation, sessions, signals, reviews } = view;
  const status = statusOf(claimId, view.baseStatus);
  const facility = getFacility(claim.facilityId);
  const stats: { label: string; value: number; tone: string }[] = [
    { label: "Total sesi", value: evaluation.claimed, tone: "text-slate-900" },
    { label: "Didukung", value: evaluation.supported, tone: "text-emerald-700" },
    { label: "Perlu tinjauan", value: evaluation.needsReview, tone: "text-amber-700" },
    { label: "Incomplete", value: evaluation.incomplete, tone: "text-slate-600" },
    { label: "Contradicted", value: evaluation.contradicted, tone: "text-red-700" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/app/claims"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Review queue
        </Link>
      </div>

      <PageHeader
        title={`Klaim ${claim.id}`}
        description={`${template.name} · ${patient?.display ?? claim.patientId} · ${
          facility?.name ?? claim.facilityId
        } · ${periodLabel(claim.periodFrom, claim.periodTo)} · tarif Rp ${template.rate.toLocaleString(
          "id-ID",
        )} per sesi`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/claims/${claim.id}/graph`}>
                <Share2 aria-hidden="true" className="size-3.5" />
                Graf
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/claims/${claim.id}/replay`}>
                <Play aria-hidden="true" className="size-3.5" />
                Replay
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/passport/${sessions[0]?.service.id ?? ""}`}>
                Passport sesi 1
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <section
        aria-label="Ringkasan evaluasi"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                {s.label}
              </p>
              <p className={"mt-1 text-2xl font-semibold tabular-nums " + s.tone}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Ringkasan AI"
        className="rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/70 to-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Ringkasan AI</h2>
              <p className="text-xs text-slate-500">
                Penjelasan otomatis status klaim, kesenjangan evidence, dan langkah
                berikutnya.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 rounded-full"
            onClick={runExplain}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                Menganalisis…
              </>
            ) : explain ? (
              "Ringkas ulang"
            ) : (
              <>
                <Sparkles aria-hidden="true" className="size-3.5" />
                Jelaskan klaim
              </>
            )}
          </Button>
        </div>

        {aiNotice ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            {aiNotice}
          </p>
        ) : null}

        {explain ? (
          <div className="mt-4 flex flex-col gap-4 border-t border-sky-100 pt-4">
            <p className="text-base font-medium leading-relaxed text-slate-900 text-pretty">
              {explain.headline}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {explain.bullets.map((b) => (
                <div
                  key={b.label}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <p className="text-[10px] tracking-wider text-slate-500 uppercase">
                    {b.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
                    {b.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {explain.paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-600">
                  {p}
                </p>
              ))}
            </div>

            {explain.gaps.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                  Gap:
                </span>
                {explain.gaps.map((g) => (
                  <span
                    key={g.sessionId}
                    className="inline-flex h-6 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 font-mono text-[10px] tracking-wider text-amber-700"
                  >
                    sesi {String(g.sessionId).padStart(2, "0")} · {g.kinds.join(", ")}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {explain.recommendation}
            </p>

            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              {explain.disclaimer} · {formatDateTime(explain.generatedAt.slice(0, 16).replace("T", " "))}
            </p>
          </div>
        ) : !aiLoading ? (
          <p className="mt-3 text-xs text-slate-500">
            Belum ada ringkasan. Tekan “Jelaskan klaim” untuk membangun penjelasan.
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Dampak klaim"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Dampak klaim</h2>
              <p className="text-xs text-slate-500">
                Simulasi finansial dari dukungan evidence (API impact).
              </p>
            </div>
            <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 font-mono text-[10px] tracking-wider text-slate-500">
              {apiImpact ? "server ✓" : "lokal"}
            </span>
          </div>

          {(() => {
            const local = impactOf(
              template.rate,
              evaluation.claimed,
              evaluation.supported,
            );
            const stale =
              apiImpact && apiImpact.supportedSessions !== local.supportedSessions;
            const impact = stale ? local : (apiImpact ?? local);
            return (
              <>
                <dl className="mt-4 flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">
                      Diajukan ({impact.currentSessions} sesi)
                    </dt>
                    <dd className="font-medium tabular-nums text-slate-800">
                      Rp {impact.currentAmount.toLocaleString("id-ID")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">
                      Didukung evidence ({impact.supportedSessions} sesi)
                    </dt>
                    <dd className="font-medium tabular-nums text-emerald-700">
                      Rp {impact.supportedAmount.toLocaleString("id-ID")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <dt className="text-amber-800">
                      Antrean tinjauan ({impact.reviewSessions} sesi)
                    </dt>
                    <dd className="font-semibold tabular-nums text-amber-900">
                      Rp {impact.reviewAmount.toLocaleString("id-ID")}
                    </dd>
                  </div>
                </dl>
                {stale ? (
                  <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-800">
                    Dihitung ulang dari evidence terbaru yang kamu catat di sesi ini.
                  </p>
                ) : null}
                <p className="mt-3 font-mono text-[10px] tracking-wider text-slate-400">
                  {impact.label}
                </p>
              </>
            );
          })()}
        </section>

        <section
          aria-label="Tindakan reviewer"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Tindakan reviewer
              </h2>
              <p className="text-xs text-slate-500">
                Aksi tercatat di log audit dan memperbarui status klaim.
              </p>
            </div>
            <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 font-mono text-[10px] tracking-wider text-slate-500">
              {role}
            </span>
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">
              Catatan reviewer
            </span>
            <Textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              disabled={!canReview}
              placeholder="Tulis alasan atau instruksi untuk provider…"
              className="min-h-20 text-sm focus-visible:border-sky-400 focus-visible:ring-sky-200"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-full"
              disabled={!canReview || reviewNote.trim().length === 0}
              onClick={() => submit("MARK_SUPPORTED")}
            >
              Tandai Didukung
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-amber-300 text-amber-800 hover:bg-amber-50"
              disabled={!canReview || reviewNote.trim().length === 0}
              onClick={() => submit("NEED_CLARIFICATION")}
            >
              Minta Klarifikasi
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={!canReview || reviewNote.trim().length === 0}
              onClick={() => submit("RETURN_FOR_REVIEW")}
            >
              Kembalikan untuk Tinjauan
            </Button>
          </div>

          {!canReview ? (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              Role <span className="font-medium">{role}</span> hanya dapat melihat.
              Ganti role lewat menu profil (mis. Reviewer) untuk bertindak.
            </p>
          ) : null}

          {submitted ? (
            <p
              role="status"
              className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800"
            >
              Aksi “{submitted}” tercatat — status klaim kini{" "}
              <span className="font-semibold">{statusOf(claimId, view.baseStatus)}</span>,
              riwayat & notifikasi diperbarui.
            </p>
          ) : null}
        </section>
      </div>

      <section
        aria-label="Evidence matrix"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Evidence matrix</h2>
            <p className="text-xs text-slate-500">
              Kehadiran evidence wajib per sesi — klik ikon passpor untuk buka detail.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-2.5" />
              </span>
              present
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <CircleHelp className="size-2.5" />
              </span>
              missing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="size-2.5" />
              </span>
              konflik
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 text-left text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                  Sesi
                </th>
                {EVIDENCE_ORDER.map((kind) => (
                  <th
                    key={kind}
                    className="px-1.5 py-2 text-center text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                    title={EVIDENCE_LABEL[kind]}
                  >
                    {EVIDENCE_LABEL[kind]}
                  </th>
                ))}
                <th className="py-2 pl-3 text-right text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.sessionId}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                >
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/app/passport/${s.service.id}`}
                      className="font-mono text-xs font-semibold tracking-wider text-slate-700 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                      {String(s.sessionId).padStart(2, "0")} →
                    </Link>
                  </td>
                  {EVIDENCE_ORDER.map((kind) => {
                    const state = cellState(
                      kind,
                      template.required.includes(kind),
                      s.service.evidence ?? [],
                    );
                    const item = (s.service.evidence ?? []).find((e) => e.kind === kind);
                    return (
                      <td key={kind} className="px-1.5 py-2.5 text-center">
                        <Cell
                          state={state}
                          title={
                            item?.at ? `${EVIDENCE_LABEL[kind]} · ${item.at}` : undefined
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-3 text-right">
                    <StatusBadge status={s.evaluation.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Sinyal risiko"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Sinyal risiko</h2>
          <p className="text-xs text-slate-500">
            {signals.length} sinyal terdeteksi dari pola evidence.
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {signals.map((s) => (
              <li
                key={s.id}
                className={
                  "rounded-xl border px-3.5 py-2.5 " + (SIGNAL_TONE[s.severity] ?? SIGNAL_TONE.info)
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold tracking-wider uppercase">
                    {s.code}
                  </span>
                  {s.sessionId ? (
                    <span className="font-mono text-[10px] tracking-wider opacity-70">
                      sesi {String(s.sessionId).padStart(2, "0")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm">{s.message}</p>
                <p className="mt-1 font-mono text-[10px] tracking-wider opacity-60">
                  {formatDateTime(s.at)}
                </p>
              </li>
            ))}
            {signals.length === 0 ? (
              <li className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                Tidak ada sinyal risiko. Seluruh sesi konsisten.
              </li>
            ) : null}
          </ul>
        </section>

        <section
          aria-label="Riwayat tinjauan"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Riwayat tinjauan</h2>
          <p className="text-xs text-slate-500">Aksi reviewer terhadap klaim ini.</p>
          <ol className="mt-3 flex flex-col gap-3 border-l border-slate-200 pl-4">
            {reviews.map((r) => (
              <li key={r.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-sky-500 ring-4 ring-white"
                />
                <p className="text-sm font-medium text-slate-800">
                  {REVIEW_LABEL[r.action]}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{r.note}</p>
                <p className="mt-1 font-mono text-[10px] tracking-wider text-slate-400">
                  {formatDateTime(r.at)} · {r.by}
                </p>
              </li>
            ))}
            {reviews.length === 0 ? (
              <li className="text-sm text-slate-500">
                Belum ada aksi tinjauan untuk klaim ini.
              </li>
            ) : null}
          </ol>
        </section>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import type { EvidenceKind } from "@/data/app/types";
import { claimView, getPatient, getTemplate } from "@/lib/app/selectors";
import { formatDate } from "@/lib/app/format";

type Step = {
  key: string;
  sessionId: number;
  serviceId: string;
  date: string;
  at?: string;
  label: string;
  kind: EvidenceKind;
  present: boolean;
  citation?: string;
  source?: string;
};

export default function ClaimReplayPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  const { src } = useApp();

  const view = React.useMemo(() => claimView(claimId, src), [claimId, src]);

  const { steps, groups } = React.useMemo(() => {
    if (!view) return { steps: [] as Step[], groups: [] as number[] };
    const list: Step[] = [];
    const groupAt: number[] = [];

    for (const s of view.sessions) {
      groupAt.push(list.length);
      for (const kind of EVIDENCE_ORDER) {
        if (!view.template.required.includes(kind)) continue;
        const item = s.service.evidence?.find((e) => e.kind === kind);
        const present = item?.state === "present";
        list.push({
          key: `${s.sessionId}:${kind}`,
          sessionId: s.sessionId,
          serviceId: s.service.id,
          date: s.service.date,
          at: present ? item?.at : s.service.endTime,
          label: EVIDENCE_LABEL[kind],
          kind,
          present,
          citation: item?.citation,
          source: item?.source,
        });
      }
    }
    return { steps: list, groups: groupAt };
  }, [view]);

  const [cursor, setCursor] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const activeRef = React.useRef<HTMLLIElement>(null);

  React.useEffect(() => {
    if (!playing || cursor >= steps.length) return;
    const t = setTimeout(() => setCursor((c) => c + 1), 320);
    return () => clearTimeout(t);
  }, [playing, cursor, steps.length]);

  React.useEffect(() => {
    if (!playing || cursor < steps.length) return;
    const t = setTimeout(() => setPlaying(false), 0);
    return () => clearTimeout(t);
  }, [playing, cursor, steps.length]);

  React.useEffect(() => {
    if (playing) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [cursor, playing]);

  if (!view) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 p-8">
        <h1 className="text-xl font-semibold text-slate-900">Klaim tidak ditemukan</h1>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/app/claims">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Review queue
          </Link>
        </Button>
      </div>
    );
  }

  const patient = getPatient(view.claim.patientId);
  const template = getTemplate(view.claim.templateId);
  const revealed = steps.slice(0, cursor);
  const revealedGaps = revealed.filter((s) => !s.present).length;
  const currentSession = revealed.length
    ? revealed[revealed.length - 1].sessionId
    : null;
  const done = cursor >= steps.length;

  const isGroupStart = (idx: number) => groups.includes(idx);
  const sessionDate = (sid: number) =>
    view.sessions.find((s) => s.sessionId === sid)?.service.date;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/app/claims/${claimId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Klaim {claimId}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Replay Episode
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {template.name} · {patient?.display ?? view.claim.patientId} ·{" "}
            {steps.length} langkah evidence dari {view.sessions.length} sesi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={view.baseStatus} />
        </div>
      </div>

      <section
        aria-label="Kontrol replay"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => {
                if (done) setCursor(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? (
                <>
                  <Pause aria-hidden="true" className="size-3.5" />
                  Jeda
                </>
              ) : (
                <>
                  <Play aria-hidden="true" className="size-3.5" />
                  {done ? "Putar ulang" : cursor > 0 ? "Lanjut" : "Putar"}
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setPlaying(false);
                setCursor(0);
              }}
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-slate-600"
              onClick={() => {
                setPlaying(false);
                setCursor(steps.length);
              }}
            >
              Lewati ke akhir
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {cursor}/{steps.length} langkah
              </span>
              <span>{done ? "Replay selesai" : playing ? "Memutar…" : "Berhenti"}</span>
            </div>
            <Progress
              value={steps.length ? (cursor / steps.length) * 100 : 0}
              className="h-1.5"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
          <div>
            <p className="text-lg font-semibold text-slate-900 tabular-nums">
              {revealed.length}
            </p>
            <p className="text-[11px] tracking-wider text-slate-500 uppercase">
              terekam
            </p>
          </div>
          <div>
            <p
              className={
                "text-lg font-semibold tabular-nums " +
                (revealedGaps > 0 ? "text-amber-700" : "text-slate-900")
              }
            >
              {revealedGaps}
            </p>
            <p className="text-[11px] tracking-wider text-slate-500 uppercase">gap</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 tabular-nums">
              {currentSession !== null ? String(currentSession).padStart(2, "0") : "—"}
            </p>
            <p className="text-[11px] tracking-wider text-slate-500 uppercase">
              sesi aktif
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Timeline replay"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">Timeline bukti</h2>
        <p className="text-xs text-slate-500">
          Setiap langkah = satu bukti wajib yang terekam pada waktunya.
        </p>

        <ol className="mt-4 flex flex-col gap-2 border-l border-slate-200 pl-4">
          {revealed.map((step, idx) => {
            const active = idx === cursor - 1;
            return (
              <li
                key={step.key}
                ref={active ? activeRef : undefined}
                className={
                  "relative rounded-lg px-3 py-2 transition-colors " +
                  (active ? "bg-sky-50 ring-1 ring-sky-200" : "")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "absolute top-2.5 -left-[21px] flex size-2.5 items-center justify-center rounded-full ring-4 ring-white " +
                    (step.present ? "bg-emerald-500" : "bg-amber-500")
                  }
                />
                {isGroupStart(idx) ? (
                  <p className="mb-1 font-mono text-[10px] tracking-[0.14em] text-slate-400 uppercase">
                    Sesi {String(step.sessionId).padStart(2, "0")} ·{" "}
                    {formatDate(sessionDate(step.sessionId) ?? step.date)}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-11 shrink-0 font-mono text-xs text-slate-500">
                    {step.at ?? "—:—"}
                  </span>
                  <span
                    aria-hidden="true"
                    className={
                      "flex size-5 shrink-0 items-center justify-center rounded-full " +
                      (step.present
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700")
                    }
                  >
                    {step.present ? (
                      <Check className="size-3" />
                    ) : (
                      <CircleHelp className="size-3" />
                    )}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{step.label}</span>
                  <span className="text-xs text-slate-500">
                    {step.present ? (
                      <>
                        <span className="font-mono">{step.citation}</span> · {step.source}
                      </>
                    ) : (
                      "Belum tercatat — masuk antrean review"
                    )}
                  </span>
                </div>
              </li>
            );
          })}
          {revealed.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
              Tekan Putar untuk memulai replay episode.
            </li>
          ) : null}
          {!done && revealed.length > 0 ? (
            <li className="px-3 py-1.5 text-xs text-slate-400">
              … {steps.length - cursor} langkah berikutnya
            </li>
          ) : null}
        </ol>

        {done ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Replay selesai — {revealed.length} bukti terekam
            {revealedGaps > 0 ? `, ${revealedGaps} gap menunggu tindak lanjut.` : ", tanpa gap."}
          </p>
        ) : null}
      </section>
    </div>
  );
}

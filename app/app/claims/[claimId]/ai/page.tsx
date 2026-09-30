"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  FileSearch,
  Share2,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { explain, view } from "@/lib/app/services/claimService";

const SECTION_TONE: Record<string, string> = {
  WHAT_WE_KNOW: "border-sky-200 bg-sky-50/60",
  IS_MISSING: "border-amber-200 bg-amber-50/60",
  IS_SUPPORTED: "border-emerald-200 bg-emerald-50/60",
  WHY_REVIEW: "border-red-200 bg-red-50/50",
  WHAT_TO_CHECK: "border-slate-200 bg-slate-50/70",
};

export default function ClaimAiPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  const { src, statusOf, hydrated } = useApp();

  const claim = React.useMemo(() => view(claimId, src), [claimId, src]);
  const result = React.useMemo(() => explain(claimId, src), [claimId, src]);

  if (!claim || !result) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Penjelasan AI"
          description={`Klaim ${claimId} tidak ditemukan.`}
          actions={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/app/claims">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Review queue
              </Link>
            </Button>
          }
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <FileSearch aria-hidden="true" className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Belum ada klaim untuk dijelaskan.
          </p>
        </div>
      </div>
    );
  }

  const status = statusOf(claimId, claim.baseStatus);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/app/claims/${claimId}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Klaim {claimId}
        </Link>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700">
          <FileSearch aria-hidden="true" className="size-3.5" />
          AI reasoner
        </span>
      </div>

      <PageHeader
        title={`Penjelasan AI · ${claimId}`}
        description="Lima blok penjelasan: apa yang diketahui, yang hilang, yang didukung, alasan ditinjau, dan yang perlu diperiksa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/claims/${claimId}/graph`}>
                <Share2 aria-hidden="true" className="size-3.5" />
                Graf
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/app/claims/${claimId}/impact`}>
                Dampak klaim
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <section
        aria-label="Headline AI"
        className="rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/70 to-white p-5 shadow-sm"
      >
        <p className="text-base font-medium leading-relaxed text-slate-900 text-pretty">
          {result.headline}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {result.bullets.map((b) => (
            <div
              key={b.label}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <p className="text-[10px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                {b.label}
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                {b.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {result.paragraphs[2]}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {result.sections.map((s) => (
          <section
            key={s.key}
            aria-label={s.key}
            className={
              "rounded-2xl border p-5 shadow-sm " +
              (SECTION_TONE[s.key] ?? "border-slate-200 bg-white")
            }
          >
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
              {s.eyebrow}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">
              {s.title}
            </h2>
            {s.items.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {s.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-slate-700"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-sm italic text-slate-500">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {s.emptyNote}
              </p>
            )}
          </section>
        ))}

        <section
          aria-label="Disclaimer"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <p className="text-xs leading-relaxed text-slate-500">
            {result.disclaimer}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-slate-400">
            {hydrated ? `generatedAt ${result.generatedAt}` : "generatedAt —"}
          </p>
        </section>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, FileSearch, TrendingUp } from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  impact as claimImpact,
  view,
} from "@/lib/app/services/claimService";

function MoneyCard({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </p>
      <p className={"mt-1.5 text-2xl font-semibold tabular-nums " + tone}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default function ClaimImpactPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  const { src, statusOf } = useApp();

  const claim = React.useMemo(() => view(claimId, src), [claimId, src]);
  const impact = React.useMemo(() => claimImpact(claimId, src), [claimId, src]);

  if (!claim || !impact) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dampak klaim"
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
          <TrendingUp aria-hidden="true" className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Belum ada data dampak untuk klaim ini.
          </p>
        </div>
      </div>
    );
  }

  const status = statusOf(claimId, claim.baseStatus);
  const ratio =
    impact.currentAmount > 0
      ? Math.round((impact.supportedAmount / impact.currentAmount) * 100)
      : 0;

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
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700">
          <TrendingUp aria-hidden="true" className="size-3.5" />
          Simulasi dampak
        </span>
      </div>

      <PageHeader
        title={`Dampak klaim · ${claimId}`}
        description={`${claim.template.name} · tarif Rp ${claim.template.rate.toLocaleString("id-ID")} per sesi · ${impact.currentSessions} sesi diajukan`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/claims/${claimId}/replay`}>
                Replay
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/app/claims/${claimId}/ai`}>
                <FileSearch aria-hidden="true" className="size-3.5" />
                Penjelasan AI
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard
          label="Diajukan"
          value={`Rp ${impact.currentAmount.toLocaleString("id-ID")}`}
          tone="text-slate-900"
          note={`${impact.currentSessions} sesi × tarif layanan`}
        />
        <MoneyCard
          label="Didukung evidence"
          value={`Rp ${impact.supportedAmount.toLocaleString("id-ID")}`}
          tone="text-emerald-700"
          note={`${impact.supportedSessions} sesi siap diproses`}
        />
        <MoneyCard
          label="Antrean tinjauan"
          value={`Rp ${impact.reviewAmount.toLocaleString("id-ID")}`}
          tone="text-amber-700"
          note={`${impact.reviewSessions} sesi menunggu reviewer`}
        />
      </div>

      <section
        aria-label="Rasio dukungan"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Rasio dukungan evidence
            </h2>
            <p className="text-xs text-slate-500">
              Porsi nilai klaim yang berbasis evidence lengkap.
            </p>
          </div>
          <span className="font-mono text-lg font-semibold text-emerald-700">
            {ratio}%
          </span>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${ratio}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>
            Sinyal risiko:{" "}
            <span className="font-medium text-slate-700">
              {claim.signals.length}
            </span>
          </span>
          <span>
            Status: <span className="font-medium text-slate-700">{status}</span>
          </span>
          <span>{impact.label}</span>
        </div>
      </section>

      <section
        aria-label="Sinyal dampak"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          Sinyal terhadap nilai klaim
        </h2>
        <p className="text-xs text-slate-500">
          Kesenjangan evidence menahan nilai klaim sampai bukti dilengkapi.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {claim.signals.length > 0 ? (
            claim.signals.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs font-semibold tracking-wider text-amber-800">
                    {s.code}
                  </p>
                  <p className="text-xs text-amber-700">{s.message}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-amber-600">
                  sesi {s.sessionId ?? "-"}
                </span>
              </li>
            ))
          ) : (
            <li className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-sm text-emerald-800">
              Tidak ada sinyal risiko — seluruh nilai klaim didukung evidence.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

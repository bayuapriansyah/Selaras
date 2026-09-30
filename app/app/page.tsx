"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  ScrollText,
  ThumbsUp,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { MetricCard } from "@/components/app/MetricCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { GOLDEN_CLAIM_ID } from "@/data/app/seed";
import { entries as auditEntries } from "@/lib/app/services/auditService";
import { dashboard as dashboardMetrics } from "@/lib/app/services/claimService";
import { AUDIT_LABEL } from "@/lib/app/actions";
import { formatDate, formatDateTime } from "@/lib/app/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-8 w-64 rounded-lg bg-slate-200/70" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-200/60" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl border border-slate-200 bg-slate-100/70" />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-100/70 lg:col-span-2" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-100/70" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { hydrated, src, state, user } = useApp();
  const metrics = React.useMemo(
    () => dashboardMetrics(state.statusOverrides, src),
    [state.statusOverrides, src],
  );
  const activity = React.useMemo(() => auditEntries(src).slice(0, 6), [src]);

  if (!hydrated) return <DashboardSkeleton />;

  const golden = metrics.rows.find((r) => r.claim.id === GOLDEN_CLAIM_ID);
  const others = metrics.rows
    .filter((r) => r.claim.id !== GOLDEN_CLAIM_ID)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={`Ringkasan operasional ${formatDate("2026-09-30")} — pantau evidence, passport, dan antrean klaim dalam satu layar.`}
        actions={
          <Button asChild size="sm" className="rounded-full">
            <Link href="/app/pelayanan">
              Mulai Pelayanan
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        }
      />

      <section aria-label="Metrik utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Layanan hari ini"
          value={metrics.todayCount}
          hint={`Per ${formatDate("2026-09-30")}`}
          icon={Clock3}
          tone="sky"
        />
        <MetricCard
          label="Didukung"
          value={metrics.supportedClaims}
          hint={`dari ${metrics.rows.length} klaim aktif`}
          icon={ThumbsUp}
          tone="emerald"
        />
        <MetricCard
          label="Perlu tinjauan"
          value={metrics.needsReviewClaims}
          hint="butuh tindakan reviewer"
          icon={CircleAlert}
          tone={metrics.needsReviewClaims > 0 ? "amber" : "default"}
        />
        <MetricCard
          label="Klarifikasi tertunda"
          value={metrics.clarificationPending}
          hint="menunggu balasan provider"
          icon={ScrollText}
          tone="slate"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section
          aria-label="Antrean prioritas"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Antrean prioritas
              </h2>
              <p className="text-xs text-slate-500">
                Klaim dengan evidence gap terbanyak di atas.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-slate-600">
              <Link href="/app/claims">
                Lihat semua
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>

          {golden ? (
            <div className="mt-4 flex flex-col gap-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold tracking-wider text-sky-700">
                    {golden.claim.id}
                  </span>
                  <StatusBadge status={golden.status} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-800">
                  {golden.template.name} · {golden.patient?.display ?? golden.claim.patientId}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {golden.evaluation.supported} dari {golden.evaluation.claimed} sesi didukung
                  {golden.evaluation.needsReview > 0
                    ? ` · ${golden.evaluation.needsReview} perlu tinjauan`
                    : ""}
                  {golden.evaluation.incomplete > 0
                    ? ` · ${golden.evaluation.incomplete} incomplete`
                    : ""}
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0 rounded-full">
                <Link href={`/app/claims/${golden.claim.id}`}>
                  Buka tinjauan
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Tidak ada klaim tertunda. Semua evidence terkumpul.
            </p>
          )}

          <ul className="mt-3 divide-y divide-slate-100">
            {others.map((row) => (
              <li key={row.claim.id}>
                <Link
                  href={`/app/claims/${row.claim.id}`}
                  className="flex flex-col gap-1.5 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium break-words text-slate-800">
                      <span className="font-mono text-xs tracking-wider text-slate-500">
                        {row.claim.id}
                      </span>{" "}
                      · {row.template.name}
                    </span>
                    <span className="block text-xs leading-relaxed break-words text-slate-500">
                      {row.patient?.display ?? row.claim.patientId} ·{" "}
                      {row.evaluation.supported}/{row.evaluation.claimed} didukung · diperbarui{" "}
                      {formatDateTime(row.claim.lastUpdated)}
                    </span>
                  </span>
                  <StatusBadge
                    status={row.status}
                    className="shrink-0 self-start sm:self-auto"
                  />
                </Link>
              </li>
            ))}
            {others.length === 0 ? (
              <li className="px-2 py-4 text-sm text-slate-500">
                Tidak ada klaim lain dalam antrean.
              </li>
            ) : null}
          </ul>
        </section>

        <section
          aria-label="Aktivitas terbaru"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Aktivitas terbaru
          </h2>
          <p className="text-xs text-slate-500">Jejak audit otomatis dari aksi pengguna.</p>
          <ol className="mt-4 flex flex-col gap-3.5">
            {activity.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-slate-700">
                    {AUDIT_LABEL[entry.action] ?? entry.action}
                  </span>
                  <span className="block text-xs leading-relaxed text-slate-500">
                    {entry.description}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-slate-400">
                    {formatDateTime(entry.at)} · {entry.user}
                  </span>
                </span>
              </li>
            ))}
            {activity.length === 0 ? (
              <li className="text-sm text-slate-500">Belum ada aktivitas.</li>
            ) : null}
          </ol>
        </section>
      </div>
    </div>
  );
}

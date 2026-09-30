"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CalendarClock, CircleAlert, Timer } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { formatDate } from "@/lib/app/format";
import type { SlaStage } from "@/lib/app/sla";
import { SLA_STAGE_LABEL, slaCounts, slaTasks } from "@/lib/app/sla";

const STAGE_TONE: Record<SlaStage, string> = {
  "H-1": "border-amber-200 bg-amber-50 text-amber-700",
  "H-0": "border-orange-200 bg-orange-50 text-orange-700",
  LATE: "border-red-200 bg-red-50 text-red-700",
};

export default function RemindersPage() {
  const { src } = useApp();

  const tasks = React.useMemo(() => slaTasks(src), [src]);
  const counts = React.useMemo(() => slaCounts(tasks), [tasks]);
  const late = tasks.filter((t) => t.escalated);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengingat & SLA"
        description="Bukti pelayanan wajib lengkap sebelum tenggat. Pengingat H-1/H-0 dan eskalasi Admin dicatat otomatis oleh sistem (kanal SYSTEM)."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {tasks.length} tugas terbuka
          </span>
        }
      />

      <section aria-label="Ringkasan SLA" className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="H-1 · jatuh tempo besok"
          value={counts["H-1"]}
          hint="Pengingat awal terkirim"
          icon={Timer}
          tone="sky"
        />
        <MetricCard
          label="H-0 · jatuh tempo hari ini"
          value={counts["H-0"]}
          hint="Lengkapi sebelum 17:00"
          icon={CalendarClock}
          tone="amber"
        />
        <MetricCard
          label="LATE · terlambat"
          value={counts.LATE}
          hint={`${late.length} dieskalasi ke Admin`}
          icon={CircleAlert}
          tone="default"
        />
      </section>

      <section
        aria-label="Daftar tugas bukti"
        className="flex flex-col gap-3"
      >
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Semua bukti pelayanan lengkap — tidak ada tugas SLA terbuka.
          </p>
        ) : null}
        {tasks.map((t) => (
          <article
            key={t.serviceId}
            aria-label={`SLA ${t.serviceId}`}
            className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-wider text-slate-500">
                  {t.serviceId} · {formatDate(t.date)} · {t.servicePoint}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {t.template} — {t.patient}
                </p>
                <p className="text-xs text-slate-500">Provider {t.provider}</p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider",
                  STAGE_TONE[t.stage],
                )}
              >
                {SLA_STAGE_LABEL[t.stage]}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {t.missingLabels.map((label) => (
                <span
                  key={label}
                  className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  {label} belum tercatat
                </span>
              ))}
              {t.escalated ? (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  <Bell aria-hidden="true" className="size-3" />
                  Eskalasi → Admin
                </span>
              ) : null}
            </div>

            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              Tenggat {formatDate(t.due)} pukul 17:00
              {t.claimId ? ` · terkait ${t.claimId}` : ""}
            </p>
          </article>
        ))}
      </section>

      <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
        Pengingat H-1/H-0 dan eskalasi keterlambatan dibuat otomatis oleh
        sistem dan tercatat di Log Audit dengan user &quot;Sistem&quot; (aksi
        SLA_REMINDER & SLA_ESCALATED). Selesaikan bukti lewat halaman{" "}
        <Link
          href="/app/passport"
          className="font-medium underline underline-offset-2 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Service Passport
        </Link>{" "}
        agar klaim tidak tertahan di gerbang pra-pembayaran.
      </p>
    </div>
  );
}

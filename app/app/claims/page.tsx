"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { queue as queueRows } from "@/lib/app/services/claimService";
import { formatDateTime } from "@/lib/app/format";
import type { ClaimStatus } from "@/data/app/types";

const FILTERS: { key: string; label: ClaimStatus | "ALL" }[] = [
  { key: "all", label: "ALL" },
  { key: "sup", label: "SUPPORTED" },
  { key: "rev", label: "NEEDS REVIEW" },
  { key: "inc", label: "INCOMPLETE" },
  { key: "con", label: "CONTRADICTED" },
  { key: "cla", label: "NEEDS CLARIFICATION" },
];

export default function ClaimsQueuePage() {
  const { src, state } = useApp();
  const [filter, setFilter] = React.useState<string>("ALL");

  const rows = React.useMemo(
    () => queueRows(state.statusOverrides, src),
    [state.statusOverrides, src],
  );

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = rows.filter((r) => filter === "ALL" || r.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Klaim"
        description="Review queue: daftar klaim terurut pembaruan terakhir, lengkap dengan komposisi evidence per sesi."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {rows.length} klaim
          </span>
        }
      />

      <div
        role="tablist"
        aria-label="Filter status klaim"
        className="flex flex-wrap gap-1.5"
      >
        {FILTERS.map((f) => {
          const count = counts[f.label] ?? 0;
          const active = filter === f.label;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.label)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px] tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                active
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  active ? "bg-white/20" : "bg-slate-100 text-slate-500",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map((row) => (
          <li key={row.claim.id}>
            <Link
              href={`/app/claims/${row.claim.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-sky-400 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                  <ClipboardList aria-hidden="true" className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold tracking-wider text-slate-700">
                      {row.claim.id}
                    </span>
                    <StatusBadge status={row.status} />
                  </span>
                  <span className="mt-1 block text-sm text-slate-700">
                    {row.template.name} · {row.patient?.display ?? row.claim.patientId} ·{" "}
                    {row.evaluation.supported}/{row.evaluation.claimed} sesi didukung
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Periode {row.claim.periodFrom}–{row.claim.periodTo} · diperbarui{" "}
                    {formatDateTime(row.claim.lastUpdated)}
                  </span>
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-sky-700">
                Buka klaim
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Tidak ada klaim dengan status ini.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

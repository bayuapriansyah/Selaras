"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { PassportStageBadge } from "@/components/app/PassportStageBadge";
import { passportRows } from "@/lib/app/services/passportService";
import { passportStageOf } from "@/lib/app/rules";
import { formatDate } from "@/lib/app/format";

export default function PassportListPage() {
  const { src } = useApp();
  const rows = React.useMemo(() => passportRows(src), [src]);

  const complete = rows.filter((r) => r.passport.status === "COMPLETE").length;
  const active = rows.filter((r) => r.passport.status === "ACTIVE").length;
  const draft = rows.filter((r) => r.passport.status === "DRAFT").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Service Passport"
        description="Paspor bukti per layanan: evidence, status, dan jejak audit dalam satu identitas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 font-mono text-[11px] tracking-wider text-emerald-700">
              {complete} COMPLETE
            </span>
            <span className="inline-flex h-8 items-center rounded-full border border-sky-200 bg-sky-50 px-3 font-mono text-[11px] tracking-wider text-sky-700">
              {active} ACTIVE
            </span>
            <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 font-mono text-[11px] tracking-wider text-slate-500">
              {draft} DRAFT
            </span>
          </div>
        }
      />

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.service.id}>
            <Link
              href={`/app/passport/${row.service.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-sky-400 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                  <FileCheck2 aria-hidden="true" className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold tracking-wider text-slate-700">
                      {row.service.id}
                    </span>
                    <PassportStageBadge
                      stage={passportStageOf(
                        row.service.evidence,
                        row.template.required,
                      )}
                    />
                    <StatusBadge status={row.passport.status} />
                    <StatusBadge status={row.sessionStatus} />
                  </span>
                  <span className="mt-1 block text-sm text-slate-700">
                    {row.template.name} · {row.patient?.display ?? row.service.patientId} ·{" "}
                    {row.provider?.name ?? row.service.providerId}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {row.service.servicePoint} · {formatDate(row.service.date)} ·{" "}
                    {row.service.startTime}
                    {row.service.endTime ? `–${row.service.endTime}` : ""}
                    {row.service.claimId ? ` · klaim ${row.service.claimId}` : ""}
                  </span>
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-sky-700">
                Buka passport
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Belum ada passport. Mulai pelayanan untuk membuat passport pertama.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

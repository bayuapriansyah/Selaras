import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { RiskSignature } from "@/data/app/network";
import { conditionLabel } from "@/lib/app/network";
import { StatusBadge, SeverityBadge } from "@/components/app/network/Badges";

export type SignatureRow = {
  signature: RiskSignature;
  matchCount: number;
  facilityCount: number;
  lastUpdated: string;
};

export function SignatureTable({
  rows,
  compact = false,
}: {
  rows: SignatureRow[];
  compact?: boolean;
}) {
  const visible = compact ? rows.slice(0, 4) : rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wider text-slate-500 uppercase">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Pola</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Kondisi
              </th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                Match
              </th>
              <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                Faskes
              </th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr
                key={r.signature.id}
                className={cn(
                  "transition-colors hover:bg-slate-50",
                  r.signature.status === "RETIRED" && "opacity-60",
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/app/network/signatures/${r.signature.id}`}
                    className="font-mono text-xs font-semibold text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
                  >
                    {r.signature.id}
                  </Link>
                </td>
                <td className="max-w-[16rem] px-4 py-3">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {r.signature.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {r.signature.detectionConditions[0]
                      ? conditionLabel(r.signature.detectionConditions[0])
                      : "—"}
                  </p>
                </td>
                <td className="hidden max-w-[14rem] px-4 py-3 text-[11px] text-slate-500 md:table-cell">
                  <span className="line-clamp-2">
                    {r.signature.originFacilityId
                      ? `Origin ${r.signature.originFacilityId}`
                      : "Semua faskes cakupan"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={r.signature.severity} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.signature.status} />
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-700 sm:table-cell">
                  {r.matchCount}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-700 lg:table-cell">
                  {r.facilityCount}
                </td>
                <td className="px-2 py-3 text-right">
                  <Link
                    href={`/app/network/signatures/${r.signature.id}`}
                    aria-label={`Buka ${r.signature.id}`}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-sky-400"
                  >
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? (
        <p className="p-5 text-center text-sm text-slate-500">
          Belum ada Risk Signature di registry.
        </p>
      ) : null}
      {compact && rows.length > 4 ? (
        <div className="border-t border-slate-100 px-4 py-3 text-right">
          <Link
            href="/app/network/signatures"
            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            Lihat semua {rows.length} signature →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

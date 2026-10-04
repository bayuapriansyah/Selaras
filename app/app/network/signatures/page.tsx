"use client";

import * as React from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { SignatureTable, type SignatureRow } from "@/components/app/network/SignatureTable";
import { NetworkPrivacyNote } from "@/components/app/network/NetworkPrivacyNote";
import { NETWORK_SIMULATION_LABEL, type SignatureStatus } from "@/data/app/network";
import { allMatches } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import * as networkSvc from "@/lib/app/services/networkService";

const FILTERS: ("ALL" | SignatureStatus)[] = [
  "ALL",
  "ACTIVE",
  "VALIDATED",
  "MONITORED",
  "UPDATED",
  "RETIRED",
];

const FILTER_LABEL: Record<string, string> = {
  ALL: "Semua",
  ACTIVE: "Aktif",
  VALIDATED: "Divalidasi",
  MONITORED: "Dipantau",
  UPDATED: "Diperbarui",
  RETIRED: "Tidak berlaku",
};

export default function SignaturesPage() {
  const { src, role, networkRuntime } = useApp();
  const [filter, setFilter] = React.useState<"ALL" | SignatureStatus>("ALL");

  const sigs = React.useMemo(
    () => networkSvc.signatures(networkRuntime, src),
    [networkRuntime, src],
  );
  const stats = React.useMemo(
    () => networkSvc.stats(networkRuntime, src),
    [networkRuntime, src],
  );
  const publishQueue = React.useMemo(
    () => networkSvc.publishQueue(networkRuntime, src),
    [networkRuntime, src],
  );

  const rows = React.useMemo<SignatureRow[]>(() => {
    return sigs.map((sig) => {
      const mine =
        sig.status === "ACTIVE"
          ? allMatches([sig], src)
          : [];
      return {
        signature: sig,
        matchCount: mine.length,
        facilityCount: new Set(mine.map((m) => m.facilityId)).size,
        lastUpdated: sig.updatedAt,
      };
    });
  }, [sigs, src]);

  const visible =
    filter === "ALL" ? rows : rows.filter((r) => r.signature.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registri Risk Signature"
        description="Pola risiko tervalidasi yang berlaku di jaringan simulasi. Setiap signature punya siklus hidup sendiri: DIVALIDASI → AKTIF → DIPANTAU/DIPERBARUI → TIDAK BERLAKU."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
              {NETWORK_SIMULATION_LABEL} · {rows.length} signature
            </span>
            {can(role, "publishSignature") && publishQueue.length > 0 ? (
              <Link
                href="/app/network/publish"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <Send aria-hidden="true" className="size-3.5" />
                Antrean Publikasi ({publishQueue.length})
              </Link>
            ) : null}
          </div>
        }
      />

      <div
        role="tablist"
        aria-label="Filter status signature"
        className="flex flex-wrap gap-1.5"
      >
        {FILTERS.map((f) => {
          const count =
            f === "ALL"
              ? rows.length
              : rows.filter((r) => r.signature.status === f).length;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                filter === f
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {FILTER_LABEL[f]}
              <span
                className={cn(
                  "font-mono text-[10px]",
                  filter === f ? "text-white/70" : "text-slate-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <SignatureTable rows={visible} />

      <section aria-label="Status ringkas" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-emerald-800 uppercase">
            Aktif
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-900">
            {stats.activeSignatures}
          </p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Sedang menjaga jaringan ({stats.networkMatches} match aktif)
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-sky-800 uppercase">
            Menunggu publikasi
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-900">
            {stats.pendingSignatures}
          </p>
          <p className="mt-0.5 text-xs text-sky-700">
            {stats.pendingMatches} match siap saat aktif
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
            Faskes terlindungi
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {stats.protectedFacilities} / {stats.connectedFacilities}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Dari match aktif signature
          </p>
        </div>
      </section>

      <NetworkPrivacyNote />
    </div>
  );
}

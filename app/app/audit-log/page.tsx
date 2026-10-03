"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { entries as auditEntries } from "@/lib/app/services/auditService";
import { AUDIT_LABEL, ROLE_LABEL } from "@/lib/app/actions";
import { formatDateTime } from "@/lib/app/format";

const ACTION_TONE: Record<string, string> = {
  SERVICE_STARTED: "border-sky-200 bg-sky-50 text-sky-700",
  SERVICE_COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EVIDENCE_ADDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLINICAL_NOTE_ADDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  BILLING_CREATED: "border-slate-200 bg-slate-50 text-slate-600",
  CLAIM_LINKED: "border-slate-200 bg-slate-50 text-slate-600",
  SIGNAL_GENERATED: "border-red-200 bg-red-50 text-red-700",
  CLAIM_REVIEWED: "border-amber-200 bg-amber-50 text-amber-700",
  REVIEW_ACTION: "border-amber-200 bg-amber-50 text-amber-700",
  CLARIFICATION_REQUESTED: "border-amber-200 bg-amber-50 text-amber-700",
  QR_VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  QR_REJECTED: "border-red-200 bg-red-50 text-red-700",
  SLA_REMINDER: "border-sky-200 bg-sky-50 text-sky-700",
  SLA_ESCALATED: "border-red-200 bg-red-50 text-red-700",
  ROLE_CHANGED: "border-sky-200 bg-sky-50 text-sky-700",
  SIG_PROPOSED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SIG_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SIG_REJECTED: "border-red-200 bg-red-50 text-red-700",
  SIG_REVISION: "border-amber-200 bg-amber-50 text-amber-700",
  SIG_PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NET_MATCH: "border-amber-200 bg-amber-50 text-amber-700",
  NET_VERIFICATION_STARTED: "border-sky-200 bg-sky-50 text-sky-700",
  NET_VERIFICATION_RESULT: "border-slate-200 bg-slate-50 text-slate-600",
  IDENTITY_BOUND: "border-sky-200 bg-sky-50 text-sky-700",
  SERVICE_ANCHORED: "border-sky-200 bg-sky-50 text-sky-700",
  EVIDENCE_RECORDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EVIDENCE_UPDATED: "border-amber-200 bg-amber-50 text-amber-700",
  PROOF_ASSESSED: "border-slate-200 bg-slate-50 text-slate-600",
  PROOF_SEALED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PROVENANCE_RECORDED: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function AuditLogPage() {
  const { src } = useApp();
  const [action, setAction] = React.useState<string>("ALL");

  const entries = React.useMemo(() => auditEntries(src), [src]);

  const actions = React.useMemo(() => {
    const set = new Set(entries.map((e) => e.action));
    return ["ALL", ...[...set].sort()];
  }, [entries]);

  const visible = entries.filter((e) => action === "ALL" || e.action === action);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Log Audit"
        description="Jejak aktivitas sistem: setiap aksi pengguna dan perubahan evidence tercatat di sini."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {entries.length} entri
          </span>
        }
      />

      <div role="tablist" aria-label="Filter aksi" className="flex flex-wrap gap-1.5">
        {actions.map((a) => {
          const active = action === a;
          return (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAction(a)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 font-mono text-[11px] tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                active
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {a === "ALL" ? "SEMUA" : (AUDIT_LABEL[a] ?? a)}
            </button>
          );
        })}
      </div>

      <section
        aria-label="Entri audit"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <ul className="flex flex-col divide-y divide-slate-100">
          {visible.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4"
            >
              <span className="flex w-full shrink-0 items-center gap-2 sm:w-56 sm:flex-col sm:items-start">
                <span
                  className={cn(
                    "inline-flex h-6 items-center rounded-full border px-2.5 font-mono text-[10px] tracking-wider",
                    ACTION_TONE[e.action] ?? "border-slate-200 bg-slate-50 text-slate-600",
                  )}
                >
                  {AUDIT_LABEL[e.action] ?? e.action}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-slate-400">
                  {formatDateTime(e.at)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-700">{e.description}</span>
                <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-slate-400">
                  {e.entity} · {e.entityId}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-start gap-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-700">
                    {e.user
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  {e.user}
                </span>
                {e.role ? (
                  <span className="ml-8 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-500">
                    {ROLE_LABEL[e.role] ?? e.role}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
              <ScrollText aria-hidden="true" className="size-5 text-slate-300" />
              Tidak ada entri untuk filter ini.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

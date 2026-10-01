"use client";

import * as React from "react";
import Link from "next/link";
import { Send, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { ProposalBadge, SeverityBadge } from "@/components/app/network/Badges";
import { NETWORK_SIMULATION_LABEL, type NetworkProposal } from "@/data/app/network";
import { allMatches, conditionLabel, facilityNodeLabel } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import { formatDateTime } from "@/lib/app/format";
import * as networkSvc from "@/lib/app/services/networkService";

export default function NetworkPublishPage() {
  const { src, role, networkRuntime, decideProposal, publishSignature } =
    useApp();
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [published, setPublished] = React.useState<string[]>([]);

  const proposals = React.useMemo(
    () => networkRuntime.proposals,
    [networkRuntime.proposals],
  );
  const queue = React.useMemo(
    () => networkSvc.publishQueue(networkRuntime, src),
    [networkRuntime, src],
  );

  const actionable = proposals.filter(
    (p) => p.status === "DRAFT" || p.status === "REVISION_REQUESTED",
  );
  const decided = proposals.filter(
    (p) => p.status === "APPROVED" || p.status === "REJECTED",
  );

  const canDecide = can(role, "reviewClaim");
  const canPublish = can(role, "publishSignature");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Antrean Publikasi & Tata Kelola"
        description="Alur tata kelola Risk Signature: USULAN → DISETUJUI → DIVALIDASI → PUBLIKASI → AKTIF. Reviewer memutuskan pola; Admin yang memublikasikan ke jaringan."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {NETWORK_SIMULATION_LABEL}
          </span>
        }
      />

      <section aria-label="Alur tata kelola" className="flex flex-wrap gap-2">
        {[
          "USULAN (belum ditinjau)",
          "DISETUJUI (reviewer)",
          "DIVALIDASI (antre publikasi)",
          "AKTIF (jaringan)",
        ].map((step, i) => (
          <React.Fragment key={step}>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] tracking-wider text-slate-700 shadow-sm">
              {step}
            </span>
            {i < 3 ? (
              <span aria-hidden="true" className="self-center text-slate-300">
                →
              </span>
            ) : null}
          </React.Fragment>
        ))}
      </section>

      <section aria-label="Proposal menunggu keputusan" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          1 · Proposal menunggu keputusan{" "}
          <span className="font-mono text-xs font-normal text-slate-400">
            ({actionable.length})
          </span>
        </h2>
        {actionable.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Tidak ada proposal aktif. Usulkan Risk Signature baru dari halaman
            klaim (tombol “Usulkan Risk Signature”).
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {actionable.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                note={notes[p.id] ?? ""}
                onNote={(v) => setNotes((n) => ({ ...n, [p.id]: v }))}
                disabled={!canDecide}
                onDecide={(decision) => {
                  decideProposal(p.id, decision, notes[p.id]?.trim() || undefined);
                }}
              />
            ))}
          </div>
        )}
        {!canDecide ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Peran {role} tidak memiliki izin &quot;Review &amp; aksi klaim&quot;
            untuk memutuskan proposal. Beralih ke Reviewer/Admin di Pengaturan.
          </p>
        ) : null}
      </section>

      <section aria-label="Antrean publikasi" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          2 · Siap publikasi ke jaringan{" "}
          <span className="font-mono text-xs font-normal text-slate-400">
            ({queue.length})
          </span>
        </h2>
        {queue.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Tidak ada signature DIVALIDASI yang menunggu publikasi.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((sig) => {
              const pendingMatches = allMatches(
                [{ ...sig, status: "ACTIVE" as const }],
                src,
              );
              const isPublished = published.includes(sig.id);
              return (
                <article
                  key={sig.id}
                  aria-label={`Antrean publikasi ${sig.id}`}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-colors sm:flex-row sm:items-center sm:justify-between",
                    isPublished
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-sky-200 bg-sky-50/60",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {sig.id} · v{sig.version}
                      </span>
                      <SeverityBadge severity={sig.severity} />
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-sky-700">
                        DIVALIDASI
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {sig.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                      {sig.whyItMatters}
                    </p>
                    <p className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">
                      {sig.detectionConditions[0]
                        ? conditionLabel(sig.detectionConditions[0])
                        : "—"}{" "}
                      · {pendingMatches.length} match akan aktif ·{" "}
                      {new Set(pendingMatches.map((m) => m.facilityId)).size}{" "}
                      faskes
                    </p>
                  </div>
                  {isPublished ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800">
                      <ShieldCheck aria-hidden="true" className="size-4" />
                      Aktif di jaringan
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Publikasikan ${sig.id}`}
                      disabled={!canPublish}
                      onClick={() => {
                        publishSignature(sig.id);
                        setPublished((prev) => [...prev, sig.id]);
                      }}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400",
                        canPublish
                          ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "cursor-not-allowed border border-slate-200 bg-white text-slate-400",
                      )}
                    >
                      <Send aria-hidden="true" className="size-3.5" />
                      Publikasikan
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {!canPublish ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Hanya Admin yang dapat memublikasikan signature (izin
            &quot;Publikasikan Risk Signature&quot;).
          </p>
        ) : null}
      </section>

      <section aria-label="Riwayat keputusan" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Riwayat keputusan
        </h2>
        {decided.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Belum ada keputusan reviewer.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {decided.map((p) => (
              <article
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] tracking-wider text-slate-500">
                      {p.proposedSignatureId}
                    </span>
                    <ProposalBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {p.name}
                  </p>
                  <p className="font-mono text-[10px] tracking-wider text-slate-400">
                    {p.decidedBy ?? "—"} ·{" "}
                    {p.decidedAt ? formatDateTime(p.decidedAt) : "—"}
                  </p>
                </div>
                <Link
                  href={
                    p.originClaimId
                      ? `/app/claims/${p.originClaimId}`
                      : "/app/network"
                  }
                  className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                >
                  {p.originClaimId ? `Klaim asal ${p.originClaimId} →` : "Dasbor →"}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
        Setiap keputusan (setujui/tolak/revisi) dan setiap publikasi tercatat
        di Log Audit dengan entitas &quot;Network&quot;. Setelah RS-017
        dipublikasikan, dasbor jaringan, daftar match, dan halaman klaim
        terkait langsung menampilkan perubahannya.
      </p>
    </div>
  );
}

function ProposalCard({
  proposal,
  note,
  onNote,
  onDecide,
  disabled,
}: {
  proposal: NetworkProposal;
  note: string;
  onNote: (v: string) => void;
  onDecide: (decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED") => void;
  disabled: boolean;
}) {
  return (
    <article
      aria-label={`Proposal ${proposal.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-wider text-slate-500">
            {proposal.id} → {proposal.proposedSignatureId}
          </span>
          <ProposalBadge status={proposal.status} />
          <SeverityBadge severity={proposal.severity} />
        </div>
        <span className="font-mono text-[10px] tracking-wider text-slate-400">
          {proposal.createdBy} · {formatDateTime(proposal.createdAt)}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">{proposal.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
          {proposal.pattern}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {proposal.detectionConditions.map((c, i) => (
            <span
              key={i}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[10px] text-slate-600"
            >
              {conditionLabel(c)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Kontrol: {proposal.recommendedControl}
          {proposal.originClaimId
            ? ` · asal ${proposal.originClaimId}${
                proposal.originFacilityId
                  ? ` · ${facilityNodeLabel(proposal.originFacilityId)}`
                  : ""
              }`
            : ""}
        </p>
      </div>

      {proposal.status === "REVISION_REQUESTED" && proposal.revisionNote ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Catatan revisi: {proposal.revisionNote}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          disabled={disabled}
          placeholder="Catatan keputusan (opsional)"
          aria-label={`Catatan keputusan ${proposal.id}`}
          className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:bg-slate-50"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecide("APPROVED")}
            className="inline-flex h-9 items-center rounded-full border border-emerald-300 bg-emerald-50 px-4 text-xs font-medium text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
          >
            Setujui
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecide("REVISION_REQUESTED")}
            className="inline-flex h-9 items-center rounded-full border border-amber-300 bg-amber-50 px-4 text-xs font-medium text-amber-800 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
          >
            Minta revisi
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecide("REJECTED")}
            className="inline-flex h-9 items-center rounded-full border border-red-300 bg-red-50 px-4 text-xs font-medium text-red-800 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
          >
            Tolak
          </button>
        </div>
      </div>
    </article>
  );
}

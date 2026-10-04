"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ClipboardList,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { PropagationVisual } from "@/components/app/network/PropagationVisual";
import { ImmunityVisual } from "@/components/app/network/ImmunityVisual";
import { SignatureTable, type SignatureRow } from "@/components/app/network/SignatureTable";
import { ProposalBadge } from "@/components/app/network/Badges";
import { NetworkPrivacyNote } from "@/components/app/network/NetworkPrivacyNote";
import {
  NETWORK_SIMULATION_LABEL,
  type RiskSignature,
} from "@/data/app/network";
import { can } from "@/lib/app/permissions";
import { formatDateTime } from "@/lib/app/format";
import * as networkSvc from "@/lib/app/services/networkService";

const FEATURED_SIGNATURE = "RS-017";

export default function NetworkPage() {
  const { src, role, networkRuntime } = useApp();

  const sigs = React.useMemo(
    () => networkSvc.signatures(networkRuntime, src),
    [networkRuntime, src],
  );
  const activeMatches = React.useMemo(
    () => networkSvc.activeMatches(networkRuntime, src),
    [networkRuntime, src],
  );
  const stats = React.useMemo(
    () => networkSvc.stats(networkRuntime, src),
    [networkRuntime, src],
  );
  const pending = React.useMemo(
    () => networkSvc.pendingProposals(networkRuntime),
    [networkRuntime],
  );
  const publishQueue = React.useMemo(
    () => networkSvc.publishQueue(networkRuntime, src),
    [networkRuntime, src],
  );
  const immunity = React.useMemo(
    () => networkSvc.immunity(FEATURED_SIGNATURE, networkRuntime, src),
    [networkRuntime, src],
  );

  const rows = React.useMemo<SignatureRow[]>(() => {
    return sigs.map((sig) => {
      const mine = activeMatches.filter((m) => m.signatureId === sig.id);
      return {
        signature: sig,
        matchCount: mine.length,
        facilityCount: new Set(mine.map((m) => m.facilityId)).size,
        lastUpdated: sig.updatedAt,
      };
    });
  }, [sigs, activeMatches]);

  const featured = React.useMemo<RiskSignature | undefined>(
    () => sigs.find((s) => s.id === FEATURED_SIGNATURE) ?? sigs[0],
    [sigs],
  );

  const totalMatches = activeMatches.length;
  const emerging = pending.length + publishQueue.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jaringan SELARAS — Integrity Mesh"
        description="Intelijen Risiko Jaringan di atas Node Lokal: satu pola tervalidasi menyebar ke seluruh jaringan sebagai verifikasi adaptif. Satu temuan. Menjadi perlindungan bersama."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
              {NETWORK_SIMULATION_LABEL}
            </span>
            {can(role, "publishSignature") ? (
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

      <section aria-label="Metrik jaringan" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Faskes terhubung"
          value={stats.connectedFacilities}
          hint="Faskes simulasi A–D (4 faskes)"
          icon={Network}
          tone="default"
        />
        <MetricCard
          label="Risk Signature aktif"
          value={stats.activeSignatures}
          hint={`${stats.pendingSignatures} menunggu publikasi`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <MetricCard
          label="Match jaringan"
          value={totalMatches}
          hint={`${stats.pendingMatches} match siap saat dipublikasikan`}
          icon={Waypoints}
          tone={totalMatches > 0 ? "amber" : "slate"}
        />
        <MetricCard
          label="Klaim dievaluasi"
          value={stats.claimsEvaluated}
          hint="Klaim di 4 faskes jaringan"
          icon={ClipboardList}
          tone="default"
        />
        <MetricCard
          label="Verifikasi step-up"
          value={stats.stepUpVerifications}
          hint={`${stats.verificationPass} lolos · ${stats.verificationClarify} klarifikasi · ${stats.verificationHuman} tinjauan manusia`}
          icon={Activity}
          tone="sky"
        />
        <MetricCard
          label="Pola muncul"
          value={emerging}
          hint={`${pending.length} usulan · ${publishQueue.length} siap publikasi`}
          icon={Sparkles}
          tone="amber"
        />
      </section>

      <section aria-label="Registri Risk Signature" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Registri Risk Signature
          </h2>
          <Link
            href="/app/network/signatures"
            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            Lihat semua →
          </Link>
        </div>
        <SignatureTable rows={rows} compact />
      </section>

      <section aria-label="Pola muncul" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Pola muncul
          </h2>
          <Link
            href="/app/network/publish"
            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            Kotak masuk tata kelola →
          </Link>
        </div>
        {emerging === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Belum ada pola baru. Usulkan Risk Signature dari halaman klaim atau
            tunggu sinyal berikutnya.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((p) => (
              <article
                key={p.id}
                aria-label={`Proposal ${p.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] tracking-wider text-slate-500">
                    {p.id} → {p.proposedSignatureId}
                  </span>
                  <ProposalBadge status={p.status} />
                </div>
                <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{p.pattern}</p>
                <p className="font-mono text-[10px] tracking-wider text-slate-400">
                  {p.createdBy} · {formatDateTime(p.updatedAt)}
                </p>
              </article>
            ))}
            {publishQueue.map((s) => (
              <article
                key={s.id}
                aria-label={`Antrean publikasi ${s.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] tracking-wider text-sky-700">
                    {s.id} · v{s.version}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-sky-700">
                    SIAP PUBLIKASI
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                <p className="line-clamp-2 text-xs text-slate-600">{s.whyItMatters}</p>
                <Link
                  href="/app/network/publish"
                  className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                >
                  Buka antrean publikasi →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <PropagationVisual
        signature={featured}
        active={featured?.status === "ACTIVE"}
        matchCount={totalMatches}
      />

      <ImmunityVisual view={immunity} />

      <section
        aria-label="Siklus belajar"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
          Siklus Belajar
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {[
            "1 · Sinyal lokal terdeteksi",
            "2 · Usulan Risk Signature",
            "3 · Validasi reviewer",
            "4 · Publikasikan ke jaringan",
            "5 · Umpan balik verifikasi",
            "6 · Pola diperbarui / pensiun",
          ].map((step, i) => (
            <React.Fragment key={step}>
              <span className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-medium text-slate-700">
                {step}
              </span>
              {i < 5 ? (
                <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
                  →
                </span>
              ) : null}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Umpan balik LOLOS/PERLU KLARIFIKASI/TINJAUAN MANUSIA → statistik
          false positive → signature ditingkatkan (v+1) atau TIDAK BERLAKU.
          Tidak ada klaim otomatis ditolak; selalu ada jalur tinjauan manusia.
        </p>
      </section>

      <NetworkPrivacyNote
        extra={
          <>
            Semua data di halaman ini adalah simulasi jaringan sintetis (4
            faskes) — bukan data JKN nyata. Lapisan jaringan hanya menambah
            rekomendasi (LOCAL STATUS + NETWORK STATUS + RECOMMENDED ACTION);
            skor, ranking, dan perilaku klaim yang sudah ada tidak berubah.
          </>
        }
      />
    </div>
  );
}

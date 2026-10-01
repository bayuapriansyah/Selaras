"use client";

import * as React from "react";
import Link from "next/link";
import { Waypoints } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { NETWORK_SIMULATION_LABEL, type SignatureFeedback } from "@/data/app/network";
import { allMatches, facilityNodeLabel } from "@/lib/app/network";
import { formatDateTime } from "@/lib/app/format";
import * as networkSvc from "@/lib/app/services/networkService";

const RESULT_TONE: Record<string, string> = {
  PASS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_CLARIFICATION: "border-amber-200 bg-amber-50 text-amber-700",
  HUMAN_REVIEW: "border-red-200 bg-red-50 text-red-700",
};

const RESULT_LABEL: Record<string, string> = {
  PASS: "LOLOS",
  NEEDS_CLARIFICATION: "PERLU KLARIFIKASI",
  HUMAN_REVIEW: "TINJAUAN MANUSIA",
};

const OUTCOME_LABEL: Record<string, string> = {
  CONFIRMED: "pola dikonfirmasi",
  CLEARED: "klaim bersih",
  FALSE_POSITIVE: "false positive",
  NEEDS_MORE_DATA: "perlu data lebih",
};

export default function NetworkMatchesPage() {
  const { src, networkRuntime } = useApp();

  const activeMatches = React.useMemo(
    () => networkSvc.activeMatches(networkRuntime, src),
    [networkRuntime, src],
  );
  const pendingMatches = React.useMemo(() => {
    const queue = networkSvc.publishQueue(networkRuntime, src);
    return queue.flatMap((sig) => allMatches([sig], src));
  }, [networkRuntime, src]);
  const feedbacks = React.useMemo(
    () => networkSvc.feedbacks(networkRuntime),
    [networkRuntime],
  );
  const stats = React.useMemo(
    () => networkSvc.stats(networkRuntime, src),
    [networkRuntime, src],
  );

  const feedbackByKey = React.useMemo(() => {
    const map = new Map<string, SignatureFeedback>();
    for (const f of feedbacks) map.set(f.matchKey, f);
    return map;
  }, [feedbacks]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Match Jaringan"
        description="Klaim yang terdeteksi oleh Risk Signature aktif. Match hanya menambah rekomendasi — skor dan status klaim asli tidak berubah."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {NETWORK_SIMULATION_LABEL} · {activeMatches.length} match aktif
          </span>
        }
      />

      <section aria-label="Ringkasan verifikasi" className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Match aktif
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {activeMatches.length}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-sky-700 uppercase">
            Siap publikasi
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-900">
            {pendingMatches.length}
          </p>
          <p className="mt-0.5 text-[11px] text-sky-600">
            Dari {stats.pendingSignatures} signature DIVALIDASI
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">
            Verifikasi lolos
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-900">
            {stats.verificationPass}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600">
            dari {feedbacks.length} step-up
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase">
            Perlu perhatian
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-900">
            {stats.verificationClarify + stats.verificationHuman}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-600">
            {stats.verificationClarify} klarifikasi · {stats.verificationHuman}{" "}
            tinjauan manusia
          </p>
        </div>
      </section>

      <section aria-label="Match aktif" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Match aktif
        </h2>
        {activeMatches.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Belum ada match aktif. Publikasikan RS-017 dari{" "}
            <Link
              href="/app/network/publish"
              className="font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              Antrean Publikasi
            </Link>{" "}
            untuk melihat klaim terlindungi di sini.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wider text-slate-500 uppercase">
                    <th className="px-4 py-3 font-medium">Klaim</th>
                    <th className="px-4 py-3 font-medium">Signature</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                      Faskes
                    </th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      Kondisi
                    </th>
                    <th className="px-4 py-3 font-medium">Hasil verifikasi</th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeMatches.map((m) => {
                    const fb = feedbackByKey.get(m.key);
                    return (
                      <tr key={m.key} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/claims/${m.claimId}`}
                            className="font-mono text-xs font-semibold text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
                          >
                            {m.claimId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {m.signatureId}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-600 sm:table-cell">
                          {facilityNodeLabel(m.facilityId)}
                        </td>
                        <td className="hidden px-4 py-3 text-[11px] text-slate-500 md:table-cell">
                          {m.matchedConditions.length} kondisi terpenuhi
                        </td>
                        <td className="px-4 py-3">
                          {fb ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wider",
                                RESULT_TONE[fb.result] ??
                                  "border-slate-200 bg-slate-50 text-slate-600",
                              )}
                            >
                              {RESULT_LABEL[fb.result] ?? fb.result}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] tracking-wider text-slate-400">
                              BELUM DIVERIFIKASI
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Link
                            href={`/app/claims/${m.claimId}`}
                            aria-label={`Buka klaim ${m.claimId}`}
                            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                          >
                            Buka
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Match siap publikasi" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Match siap publikasi
        </h2>
        {pendingMatches.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Tidak ada match tertunda.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingMatches.slice(0, 10).map((m) => (
              <article
                key={m.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-4"
              >
                <div>
                  <p className="font-mono text-[11px] tracking-wider text-sky-700">
                    {m.claimId} · {facilityNodeLabel(m.facilityId)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {m.signatureId} — aktif setelah dipublikasikan
                  </p>
                </div>
                <Link
                  href="/app/network/publish"
                  className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                >
                  Ke antrean publikasi →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        aria-label="Riwayat verifikasi step-up"
        className="flex flex-col gap-3"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
          <Waypoints aria-hidden="true" className="size-4 text-slate-400" />
          Riwayat verifikasi step-up
        </h2>
        {feedbacks.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Belum ada verifikasi step-up. Buka klaim dengan match aktif untuk
            memulai verifikasi adaptif.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {feedbacks.map((f) => (
              <article
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-wider text-slate-500">
                    {f.claimId} · {f.signatureId} ·{" "}
                    {RESULT_LABEL[f.result] ?? f.result}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {f.note ? f.note : `Hasil: ${OUTCOME_LABEL[f.outcome] ?? f.outcome}`}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-wider text-slate-400">
                    {f.by} · {formatDateTime(f.at)}
                  </p>
                </div>
                <Link
                  href={`/app/claims/${f.claimId}`}
                  className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                >
                  Buka klaim →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
        Match &amp; status “NETWORK STATUS” ditampilkan sebagai lapisan tambahan.
        Status klaim asli (SUPPORTED / gap) dan antrean prioritas reviewer tetap
        dihitung oleh mesin klaim yang lama — jaringan tidak mengubahnya.
      </p>
    </div>
  );
}

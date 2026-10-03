import { Fingerprint, Link2 } from "lucide-react";
import type { ProvenanceRecord, ServiceAnchorEvent } from "@/data/app/proof";
import { cn } from "cn";
import { SECTIONS, shortRef } from "@/components/proof/proofUi";
import { formatDateTime } from "@/lib/app/format";

/**
 * Presentasi provenance — istilah yang diizinkan: Integrity Reference,
 * Version History, Provenance Trail. Tanpa jargon ledger/tambang data.
 */
export function ProvenancePanel({
  records,
  anchors,
}: {
  records: ProvenanceRecord[];
  anchors: ServiceAnchorEvent[];
}) {
  const ordered = [...records].sort((a, b) => b.version - a.version);
  const latest = ordered[0];

  return (
    <section
      aria-label={SECTIONS.provenance}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fingerprint aria-hidden="true" className="size-4 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Provenance trail
            </h2>
            <p className="text-xs text-slate-500">
              Riwayat versi dan integrity reference untuk objek proof ini.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-500">
          {ordered.length} REKAM
        </span>
      </div>

      {!latest ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center">
          <p className="text-sm font-medium text-slate-600">
            Belum ada catatan provenance.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Catatan terbentuk saat evidence dibuat/diperbarui atau proof diseal.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase">
              Versi terbaru · {latest.action}
            </p>
            <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {[
                ["VERSION", `v${latest.version}`],
                ["CREATED BY", latest.actorId],
                ["WHEN", formatDateTime(latest.timestamp)],
                ["REASON", latest.reason ?? "—"],
                ["INTEGRITY REFERENCE", latest.integrityRef],
                [
                  "PREVIOUS",
                  previousText(latest, ordered),
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex flex-col gap-0.5 rounded-lg border border-emerald-200/70 bg-white px-3 py-2"
                >
                  <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                    {k}
                  </dt>
                  <dd className="font-medium break-words text-slate-700">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Version history
            </p>
            <ol className="mt-2 flex flex-col gap-1.5 border-l border-slate-200 pl-4">
              {ordered.map((r) => (
                <li key={r.id} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute top-2 -left-[21px] size-2 rounded-full bg-slate-300 ring-4 ring-white"
                  />
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-700">
                    <span className="font-mono font-semibold">v{r.version}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-500">
                      {r.action}
                    </span>
                    <span className="text-slate-500">{r.actorId}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {formatDateTime(r.timestamp)}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-wider break-all text-slate-400">
                    {r.integrityRef}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {anchors.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            <Link2 aria-hidden="true" className="size-3" />
            Service anchor tercatat
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {anchors.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs"
              >
                <span className="font-mono font-semibold text-slate-700">
                  {a.id}
                </span>
                <span className="text-slate-500">{a.serviceId}</span>
                <span className="font-mono text-[10px] tracking-wider text-slate-400">
                  urutan {a.sequence} · {formatDateTime(a.anchoredAt)}
                </span>
                <span
                  className={cn(
                    "ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider",
                    a.state === "ANCHORED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : a.state === "FAILED"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  {a.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function previousText(
  latest: ProvenanceRecord,
  ordered: ProvenanceRecord[],
): string {
  if (latest.previousIntegrityRef) return shortRef(latest.previousIntegrityRef);
  return ordered.length > 1 ? shortRef(ordered[1].integrityRef) : "— (rekam pertama)";
}

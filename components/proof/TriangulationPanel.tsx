import { Waypoints } from "lucide-react";
import type { TriangulationOutcome, Witness } from "@/data/app/proof";
import { cn } from "cn";
import {
  SECTIONS,
  TRIANGULATION_UI,
  triangulationLabel,
} from "@/components/proof/proofUi";
import { formatDateTime } from "@/lib/app/format";

/** Kesepakatan antar saksi bukti (witness) — hasil evaluator Phase 3. */
export function TriangulationPanel({
  outcome,
  witnesses,
}: {
  outcome: TriangulationOutcome | undefined;
  witnesses: Witness[];
}) {
  const key = outcome ?? "PENDING";
  const bySource = new Map<string, number>();
  for (const w of witnesses) {
    bySource.set(w.source, (bySource.get(w.source) ?? 0) + 1);
  }
  const latest = [...witnesses].sort((a, b) => b.at.localeCompare(a.at))[0];

  return (
    <section
      aria-label={SECTIONS.triangulation}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Waypoints aria-hidden="true" className="size-4 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Triangulasi bukti
            </h2>
            <p className="text-xs text-slate-500">
              Berapa saksi independen yang mendukung pernyataan klaim.
            </p>
          </div>
        </div>
        <span
          data-testid="triangulation"
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider",
            TRIANGULATION_UI[key],
          )}
        >
          {triangulationLabel(outcome)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[11px] tracking-wider text-slate-600">
          {witnesses.length} SAKSI
        </span>
        {[...bySource.entries()].map(([source, n]) => (
          <span
            key={source}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
          >
            {source} · {n}
          </span>
        ))}
        {witnesses.length === 0 ? (
          <span className="text-xs text-slate-500">
            Belum ada saksi bukti yang tercatat.
          </span>
        ) : null}
      </div>

      {latest ? (
        <p className="mt-3 border-t border-slate-100 pt-3 font-mono text-[10px] tracking-wider text-slate-400">
          SAKSI TERBARU {latest.id} · {latest.source} · {formatDateTime(latest.at)}
        </p>
      ) : null}
    </section>
  );
}

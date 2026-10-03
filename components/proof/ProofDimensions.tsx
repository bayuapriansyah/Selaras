import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  PROOF_DIMENSIONS,
  PROOF_DIMENSION_LABEL,
  type ProofDimensionResult,
} from "@/data/app/proof";
import { cn } from "cn";
import { SECTIONS, VERDICT_UI } from "@/components/proof/proofUi";

/**
 * Ringkasan 7 dimensi proof — hanya tampilan hasil evaluator Phase 3,
 * tidak ada penilaian ulang di komponen ini.
 */
export function ProofDimensions({
  dimensions,
}: {
  dimensions: ProofDimensionResult[];
}) {
  const [open, setOpen] = React.useState<string | null>(null);

  const rows = PROOF_DIMENSIONS.map(
    (d) =>
      dimensions.find((x) => x.dimension === d) ?? {
        dimension: d,
        verdict: "UNKNOWN" as const,
        refs: [],
      },
  );

  return (
    <section
      aria-label={SECTIONS.dimensions}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Ringkasan 7 dimensi proof
          </h2>
          <p className="text-xs text-slate-500">
            Klik satu dimensi untuk melihat alasan penilaiannya.
          </p>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {(["PASS", "GAP", "CONFLICT", "UNKNOWN"] as const).map((v) => (
            <li
              key={v}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider",
                VERDICT_UI[v].chip,
              )}
            >
              <span aria-hidden="true">{VERDICT_UI[v].glyph}</span>
              {VERDICT_UI[v].token}
            </li>
          ))}
        </ul>
      </div>

      <ul
        aria-label="Daftar dimensi proof"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {rows.map((d) => {
          const ui = VERDICT_UI[d.verdict];
          const expanded = open === d.dimension;
          return (
            <li key={d.dimension} className="min-w-0">
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`Dimensi ${PROOF_DIMENSION_LABEL[d.dimension]} ${ui.token}`}
                onClick={() => setOpen(expanded ? null : d.dimension)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                  expanded
                    ? "border-sky-300 bg-sky-50/60"
                    : "border-slate-200 bg-slate-50/60 hover:border-slate-300",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-800">
                      {PROOF_DIMENSION_LABEL[d.dimension]}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                      {d.dimension}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 text-slate-400 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider",
                    ui.chip,
                  )}
                >
                  <span aria-hidden="true">{ui.glyph}</span>
                  {ui.token}
                </span>
                {expanded ? (
                  <span className="block border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-600">
                    {d.reason ?? ui.label + "."}
                    {d.refs.length > 0 ? (
                      <span className="mt-1 block font-mono text-[10px] tracking-wider text-slate-400">
                        rujukan: {d.refs.slice(0, 4).join(", ")}
                        {d.refs.length > 4 ? ` +${d.refs.length - 4}` : ""}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

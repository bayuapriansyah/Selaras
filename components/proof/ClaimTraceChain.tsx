import { ArrowRight, Share2 } from "lucide-react";
import Link from "next/link";
import {
  CLAIM_TRACE_CHAIN,
  type ClaimTrace,
  type ClaimTraceNodeKind,
  type ClaimTraceStatus,
} from "@/data/app/proof";
import { cn } from "cn";
import { SECTIONS, TRACE_UI } from "@/components/proof/proofUi";

const CHAIN_LABEL: Record<ClaimTraceNodeKind, string> = {
  claim: "CLAIM",
  invoice: "INVOICE",
  charge: "CHARGE",
  service: "SERVICE",
  encounter: "ENCOUNTER",
  provider: "PROVIDER",
  evidence: "EVIDENCE",
};

/** Jejak klaim: CLAIM → INVOICE → CHARGE → SERVICE → ENCOUNTER → PROVIDER → EVIDENCE */
export function ClaimTraceChain({
  trace,
  status,
  graphHref,
}: {
  trace: ClaimTrace | undefined;
  status: ClaimTraceStatus | "PENDING";
  graphHref: string;
}) {
  const counts = new Map<ClaimTraceNodeKind, number>();
  for (const n of trace?.nodes ?? []) {
    counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
  }

  return (
    <section
      aria-label={SECTIONS.trace}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Jejak klaim</h2>
          <p className="text-xs text-slate-500">
            Tautan bukti dari klaim sampai evidence — membaca hasil evaluator,
            tanpa data baru.
          </p>
        </div>
        <span
          data-testid="trace-status"
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider",
            TRACE_UI[status],
          )}
        >
          {status}
        </span>
      </div>

      <ol
        aria-label="Rantai jejak klaim"
        className="mt-4 flex flex-wrap items-center gap-y-3"
      >
        {CLAIM_TRACE_CHAIN.map((kind, i) => {
          const count = counts.get(kind) ?? 0;
          return (
            <li key={kind} className="flex items-center">
              <span className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-600">
                  {CHAIN_LABEL[kind]}
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-wider",
                    count > 0 ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  {count > 0 ? `${count} node` : "—"}
                </span>
              </span>
              {i < CLAIM_TRACE_CHAIN.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="mx-1.5 size-3.5 shrink-0 text-slate-300"
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">
          {status === "TRACEABLE"
            ? "Seluruh sesi tertaut ke klaim, billing, dan evidence."
            : status === "LINKAGE_GAP"
              ? "Sebagian tautan belum utuh — rincian pada daftar celah."
              : "Jejak belum dievaluasi."}
        </p>
        <Link
          href={graphHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <Share2 aria-hidden="true" className="size-3.5" />
          Buka Graf bukti
        </Link>
      </div>
    </section>
  );
}

"use client";

import { ChevronRight, CircleHelp, ShieldAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { reasonerBlocks, type ReasonerBlock } from "@/data/golden-case";
import { cn } from "@/lib/utils";

export function ReasonerPanel({
  blocks = reasonerBlocks,
  className,
}: {
  blocks?: ReasonerBlock[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <p className="font-mono text-xs font-bold tracking-[0.2em] text-sky-600 uppercase">
          AI Evidence Reasoner
        </p>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 font-mono text-[10.5px] tracking-wider text-amber-800 uppercase font-semibold">
          <ShieldAlert aria-hidden="true" className="size-3 text-amber-600" />
          Human review required
        </span>
      </div>

      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {blocks.map((block, index) => (
          <div
            key={block.label}
            className={cn(index === blocks.length - 1 && "sm:col-span-2")}
          >
            <dt className="font-mono text-xs font-semibold tracking-wider text-emerald-700 uppercase">
              {block.label}
            </dt>
            <dd className="mt-1.5">
              {block.items ? (
                <ul className="flex flex-col gap-1.5">
                  {block.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-700"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-sky-600"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    block.tone === "gap" ? "font-semibold text-amber-700" : "text-slate-800",
                  )}
                >
                  {block.value}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-0.5 rounded-full text-sky-600 outline-none transition-colors hover:text-sky-800"
              aria-label="Tentang peran AI pada panel ini"
            >
              <CircleHelp aria-hidden="true" className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[18rem] bg-slate-900 border border-slate-700 text-white shadow-xl">
            AI provides evidence-based assistance. Final decision remains with the reviewer.
          </TooltipContent>
        </Tooltip>
        <p className="text-xs leading-relaxed text-slate-500">
          AI memberikan penjelasan berbasis bukti. Keputusan akhir tetap pada reviewer BPJS / Faskes.
        </p>
      </div>
    </div>
  );
}

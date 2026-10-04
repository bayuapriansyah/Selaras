import { CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ProofGapItem } from "@/data/app/proof";
import { PROOF_DIMENSION_LABEL } from "@/data/app/proof";
import { EVIDENCE_LABEL } from "@/data/app/types";
import { cn } from "cn";
import { SECTIONS } from "@/components/proof/proofUi";

const SEVERITY_CLS: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

/**
 * Celah & konflik dari assessment evaluator — penjelasan netral per sesi,
 * tanpa kesimpulan atas niat pihak mana pun.
 */
export function ProofGapList({
  gaps,
  conflicts,
  replayHref,
}: {
  gaps: ProofGapItem[];
  conflicts: string[];
  replayHref?: string;
}) {
  const clean = gaps.length === 0 && conflicts.length === 0;

  return (
    <section
      aria-label={SECTIONS.gaps}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Celah dan ketidaksesuaian
          </h2>
          <p className="text-xs text-slate-500">
            Alasan status proof — siapa, sesi mana, bukti apa yang belum lengkap.
          </p>
        </div>
        <span
          data-testid="gap-count"
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-500"
        >
          {gaps.length} CELAH · {conflicts.length} KONFLIK
        </span>
      </div>

      {replayHref && !clean ? (
        <Link
          href={replayHref}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Verifikasi bukti lewat episode replay →
        </Link>
      ) : null}

      {clean ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            Tidak ada celah maupun konflik — seluruh dimensi proof terpenuhi.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {gaps.map((g, i) => (
            <article
              key={`${g.serviceId}-${g.dimension}-${i}`}
              className={cn(
                "rounded-xl border px-3.5 py-3",
                SEVERITY_CLS[g.severity] ?? SEVERITY_CLS.warning,
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                <span className="text-xs font-semibold">
                  {PROOF_DIMENSION_LABEL[g.dimension]}
                </span>
                <span className="font-mono text-[10px] tracking-wider opacity-70">
                  {g.serviceId}
                </span>
                <span className="ml-auto rounded-full border border-current/30 px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase opacity-80">
                  {g.status ?? "OPEN"} · {g.severity}
                </span>
              </div>
              {g.gaps.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {g.gaps.map((kind) => (
                    <li
                      key={kind}
                      className="rounded-full border border-current/25 bg-white/70 px-2 py-0.5 font-mono text-[10px] tracking-wider"
                    >
                      {EVIDENCE_LABEL[kind]}
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul className="mt-2 flex flex-col gap-1">
                {g.reasons.map((r, k) => (
                  <li key={k} className="text-xs leading-relaxed opacity-90">
                    {r}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          {conflicts.length > 0 ? (
            <article className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <TriangleAlert aria-hidden="true" className="size-4 text-red-600" />
                <span className="text-xs font-semibold text-red-800">
                  Ketidaksesuaian ({conflicts.length})
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-1">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-xs leading-relaxed text-red-800">
                    {c}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}

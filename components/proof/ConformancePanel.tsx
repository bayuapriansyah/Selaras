import {
  CONFORMANCE_STAGE_LABEL,
  CONFORMANCE_STAGE_ORDER,
  type ConformanceResult,
  type ConformanceWorkflow,
} from "@/data/app/proof";
import { cn } from "cn";
import { CONFORMANCE_UI, SECTIONS } from "@/components/proof/proofUi";

const STATUS_NOTE: Record<string, string> = {
  CONFORMANT: "Urutan tahapan sesuai EXPECTED workflow.",
  DEVIATED: "Tahapan tercatat di luar jendela layanan.",
  MISSING_STAGE: "Ada tahapan EXPECTED yang belum tercatat.",
  OUT_OF_ORDER: "Urutan tahapan terbalik dibanding EXPECTED.",
};

/** Expected vs actual dari evaluator Phase 3 — UI murni tampilan. */
export function ConformancePanel({
  conformance,
  workflows,
}: {
  conformance: ConformanceResult | undefined;
  workflows: ConformanceWorkflow[];
}) {
  const status = conformance?.status ?? "MISSING_STAGE";

  return (
    <section
      aria-label={SECTIONS.conformance}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Conformance</h2>
          <p className="text-xs text-slate-500">
            EXPECTED workflow vs ACTUAL — dinilai mesin conformance Phase 3.
          </p>
        </div>
        <span
          data-testid="conformance-status"
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider",
            CONFORMANCE_UI[status],
          )}
        >
          {conformance?.status ?? "—"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Expected
          </p>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {CONFORMANCE_STAGE_ORDER.map((stage, i) => (
              <li key={stage} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-600">
                  <span className="text-slate-400">{i + 1}</span>
                  {CONFORMANCE_STAGE_LABEL[stage]}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Actual
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="flex flex-col gap-1.5 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
              >
                <p className="font-mono text-[10px] tracking-wider text-slate-400">
                  {wf.serviceId}
                </p>
                <ol className="flex flex-wrap gap-1.5">
                  {wf.stages.map((st) => (
                    <li
                      key={st.stage}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider",
                        st.status === "DONE"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                      )}
                    >
                      {CONFORMANCE_STAGE_LABEL[st.stage]}
                      <span className="opacity-70">
                        {st.status === "DONE" ? st.at : "PENDING"}
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
            {workflows.length === 0 ? (
              <li className="text-xs text-slate-500">
                Belum ada workflow untuk klaim ini.
              </li>
            ) : null}
          </ul>
        </div>

        <p className="text-xs text-slate-600">{STATUS_NOTE[status]}</p>

        {(conformance?.reasons.length ?? 0) > 0 ? (
          <ul className="flex max-h-40 flex-col gap-1.5 overflow-auto rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            {conformance?.reasons.map((r, i) => (
              <li key={i} className="text-xs leading-relaxed text-amber-900">
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

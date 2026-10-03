import * as React from "react";
import { Stamp, TriangleAlert } from "lucide-react";
import { PROOF_HAPPY_PATH, type ProofState } from "@/data/app/proof";
import { cn } from "cn";
import { SECTIONS, STATE_UI, stateLabel } from "@/components/proof/proofUi";

/**
 * Visualisasi state machine proof (tanpa state baru):
 * REGISTERED → IDENTITY_BOUND → ATTESTED → CORROBORATED → SEALED,
 * dengan dua jalur eksepsi PROOF_GAP / INCONSISTENT.
 */
export function ProofStateRail({
  state,
  recorded,
  sealedIndicators,
}: {
  state: ProofState;
  recorded?: ProofState;
  sealedIndicators?: { evidence: boolean; provenance: boolean; integrity: boolean };
}) {
  const ui = STATE_UI[state];
  const isException = !PROOF_HAPPY_PATH.includes(state);
  const [open, setOpen] = React.useState(false);

  return (
    <section
      aria-label={SECTIONS.state}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-slate-400 uppercase">
            Proof state
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              data-testid="proof-state"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wider",
                ui.chip,
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full", ui.dot)}
              />
              {state}
            </span>
            <span className="text-sm font-medium text-slate-700">
              {stateLabel(state)}
            </span>
            {state === "SEALED" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-700">
                <Stamp aria-hidden="true" className="size-3" />
                SEALED
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{ui.note}</p>
        </div>
        <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] tracking-wider text-slate-500">
          {recorded
            ? recorded === state
              ? `STATE TERCATAT ${recorded}`
              : `STATE TERCATAT ${recorded} · EVALUASI ${state}`
            : "EVALUASI LANGSUNG · BELUM ADA STATE TERSIMPAN"}
        </p>
      </div>

      {state === "SEALED" && sealedIndicators ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {sealedIndicators.evidence ? (
            <li className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-700">
              EVIDENCE: CORROBORATED
            </li>
          ) : null}
          {sealedIndicators.provenance ? (
            <li className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-700">
              PROVENANCE: SEALED
            </li>
          ) : null}
          {sealedIndicators.integrity ? (
            <li className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-700">
              INTEGRITY: VERIFIED
            </li>
          ) : null}
        </ul>
      ) : null}

      <ol
        aria-label="Jalur state proof"
        className="mt-5 flex flex-wrap items-center gap-y-3"
      >
        {PROOF_HAPPY_PATH.map((s, i) => {
          const current = state === s;
          const reached = !isException && PROOF_HAPPY_PATH.indexOf(state) >= i;
          return (
            <li key={s} className="flex items-center">
              <span className="flex items-center gap-2">
                <span
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border font-mono text-[10px] font-semibold transition-colors",
                    reached
                      ? current
                        ? "border-emerald-500 bg-emerald-500 text-white ring-2 ring-emerald-200"
                        : "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-400",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "font-mono text-[11px] tracking-wider",
                    current
                      ? "font-semibold text-emerald-700"
                      : reached
                        ? "text-emerald-600"
                        : "text-slate-400",
                  )}
                >
                  {s}
                </span>
              </span>
              {i < PROOF_HAPPY_PATH.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-px w-6 sm:w-10",
                    !isException && PROOF_HAPPY_PATH.indexOf(state) > i
                      ? "bg-emerald-400"
                      : "bg-slate-200",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {isException ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-4 flex w-full items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3 text-left transition-colors hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-amber-600"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-amber-900">
              Jalur eksepsi {state} — di luar jalur utama yang menuju SEALED.
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-amber-800">
              {open
                ? "Penyelesaian celah atau konflik mengembalikan proof ke REGISTERED untuk dinilai ulang — lihat daftar celah dan ketidaksesuaian di bawah."
                : "Buka untuk tahu langkah pemulihannya."}
            </span>
          </span>
        </button>
      ) : null}
    </section>
  );
}

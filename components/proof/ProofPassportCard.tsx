import Link from "next/link";
import type { ProofState } from "@/data/app/proof";
import { STATE_UI, SECTIONS, stateLabel } from "@/components/proof/proofUi";
import { cn } from "cn";

export type PassportEntry = {
  serviceId: string;
  patient: string;
  service: string;
  provider: string;
  facility: string;
  href?: string;
};

export function spAlias(serviceId: string): string {
  return serviceId.replace(/^SVC-/, "SP-");
}

/**
 * Kartu ATTESTED SERVICE PASSPORT — identitas ringkas objek bukti:
 * SERVICE PASSPORT (SP-…) · Patient · Service · Provider · Facility · PROOF STATE.
 */
export function ProofPassportCard({
  entries,
  state,
}: {
  entries: PassportEntry[];
  state: ProofState;
}) {
  const ui = STATE_UI[state];

  return (
    <section
      aria-label={SECTIONS.passport}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
            Attested service passport
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-900">
            Service passport terkait dengan klaim ini
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold tracking-wider",
            ui.chip,
          )}
        >
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", ui.dot)} />
          PROOF STATE: {state}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {entries.map((e) => (
          <li
            key={e.serviceId}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-wider text-sky-700">
                  {spAlias(e.serviceId)}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-slate-400">
                  {e.serviceId}
                </span>
                {e.href ? (
                  <Link
                    href={e.href}
                    className="text-[11px] font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
                  >
                    Buka passport →
                  </Link>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {e.patient} · {e.service}
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <div>
                <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                  PROVIDER
                </dt>
                <dd className="font-medium text-slate-700">{e.provider}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                  FACILITY
                </dt>
                <dd className="font-medium text-slate-700">{e.facility}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                  PROOF STATE
                </dt>
                <dd className="font-mono text-xs font-semibold text-slate-800">
                  {state}{" "}
                  <span className="font-sans text-[11px] font-normal text-slate-500">
                    ({stateLabel(state)})
                  </span>
                </dd>
              </div>
            </dl>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
            Belum ada service passport tertaut.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

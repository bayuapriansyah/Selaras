import * as React from "react";
import { Radio, X } from "lucide-react";
import type { EvidenceEvent, ProvenanceRecord } from "@/data/app/proof";
import { EVIDENCE_LABEL } from "@/data/app/types";
import { cn } from "cn";
import {
  PROOF_EVENT_LABEL,
  SECTIONS,
  roleLabel,
  shortRef,
} from "@/components/proof/proofUi";
import { formatDateTime } from "@/lib/app/format";

function whatOf(ev: EvidenceEvent): string {
  if (ev.proofType) return PROOF_EVENT_LABEL[ev.proofType] ?? ev.proofType;
  if (ev.kind) return EVIDENCE_LABEL[ev.kind];
  return ev.source;
}

/**
 * Live proof stream — membaca slice `proofEvents` apa adanya (tanpa event
 * buatan). Klik satu baris membuka panel detail: WHAT / WHO / ROLE / WHEN /
 * SERVICE / VERSION / PROVENANCE / INTEGRITY REFERENCE.
 */
export function ProofStream({
  events,
  provenance,
  framed = true,
}: {
  events: EvidenceEvent[];
  provenance: ProvenanceRecord[];
  framed?: boolean;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  const ordered = React.useMemo(
    () =>
      [...events].sort((a, b) =>
        b.recordedAt.localeCompare(a.recordedAt) ||
        b.observedAt.localeCompare(a.observedAt),
      ),
    [events],
  );

  return (
    <section
      aria-label={SECTIONS.stream}
      className={
        framed
          ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          : ""
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio aria-hidden="true" className="size-4 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Live proof stream
            </h2>
            <p className="text-xs text-slate-500">
              Urutan peristiwa proof yang benar-benar tercatat pada sesi klaim ini.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-500">
          {ordered.length} EVENT
        </span>
      </div>

      {ordered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-600">
            Belum ada proof event untuk klaim ini.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Stream terisi ketika bukti direkam, layanan dimulai, atau proof dinilai
            — bukan simulasi, hanya peristiwa tersimpan.
          </p>
        </div>
      ) : (
        <ol className="mt-4 flex flex-col gap-2 border-l border-slate-200 pl-4">
          {ordered.map((ev) => {
            const expanded = openId === ev.id;
            const record = provenance.find(
              (p) =>
                p.integrityRef &&
                (ev.version == null || p.version === ev.version) &&
                (p.resourceId === ev.serviceId || p.resourceId === ev.claimId),
            );
            return (
              <li key={ev.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-3 -left-[21px] size-2.5 rounded-full bg-sky-500 ring-4 ring-white"
                />
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`Detail event ${ev.proofType ?? ev.kind ?? ev.source}`}
                  onClick={() => setOpenId(expanded ? null : ev.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                    expanded
                      ? "border-sky-300 bg-sky-50/70"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] font-semibold tracking-wider text-sky-700">
                      {ev.proofType ?? "EVIDENCE_EVENT"}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {whatOf(ev)}
                    </span>
                    {ev.version != null ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-500">
                        v{ev.version}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-slate-400">
                    {formatDateTime(ev.observedAt)} · {ev.actorId ?? "sistem"} ·{" "}
                    {roleLabel(ev.actorRole)} · {ev.serviceId}
                  </span>
                </button>

                {expanded ? (
                  <div
                    aria-label="Detail proof event"
                    className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        Detail peristiwa
                      </p>
                      <button
                        type="button"
                        aria-label="Tutup detail event"
                        onClick={() => setOpenId(null)}
                        className="inline-flex size-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      {[
                        ["WHAT", whatOf(ev)],
                        ["WHO", ev.actorId ?? "sistem"],
                        ["ROLE", roleLabel(ev.actorRole)],
                        ["WHEN", formatDateTime(ev.observedAt)],
                        [
                          "SERVICE",
                          `${ev.serviceId}${
                            ev.sessionId != null ? ` · sesi ${ev.sessionId}` : ""
                          }${ev.claimId ? ` · ${ev.claimId}` : ""}`,
                        ],
                        ["VERSION", ev.version != null ? `v${ev.version}` : "—"],
                        [
                          "PROVENANCE",
                          ev.provenance
                            ? `${ev.provenance.source} · ${ev.provenance.eventId}`
                            : "—",
                        ],
                        [
                          "INTEGRITY REFERENCE",
                          shortRef(record?.integrityRef ?? ev.payloadHash),
                        ],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                            {k}
                          </dt>
                          <dd className="font-medium break-words text-slate-700">
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 font-mono text-[10px] tracking-wider text-slate-400">
                      DIREKAM {formatDateTime(ev.recordedAt)}
                      {ev.status ? ` · STATUS ${ev.status}` : ""}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

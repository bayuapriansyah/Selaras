"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Plus } from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  PassportNextActionChip,
  PassportStageBadge,
} from "@/components/app/PassportStageBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EVIDENCE_LABEL } from "@/data/app/types";
import { getPatient, getProvider } from "@/lib/app/selectors";
import {
  passportNextAction,
  passportStageOf,
} from "@/lib/app/rules";
import { passportRow } from "@/lib/app/services/passportService";
import { previewProof } from "@/lib/app/services/proofService";
import { formatDate, formatDateTime } from "@/lib/app/format";
import { ProofStream } from "@/components/proof/ProofStream";
import {
  PROOF_DIMENSIONS,
  PROOF_DIMENSION_LABEL,
} from "@/data/app/proof";
import { SECTIONS, STATE_UI, VERDICT_UI } from "@/components/proof/proofUi";

const STATUS_TEXT: Record<string, string> = {
  SUPPORTED: "Didukung",
  "NEEDS REVIEW": "Perlu tinjauan",
  INCOMPLETE: "Belum lengkap",
  CONTRADICTED: "Bertentangan",
  "NEEDS CLARIFICATION": "Perlu klarifikasi",
  DRAFT: "Draf",
  ACTIVE: "Aktif",
  COMPLETE: "Lengkap",
};

export default function PassportDetailPage() {
  const params = useParams<{ serviceId: string }>();
  const serviceId = params.serviceId;
  const { src, state, addEvidence } = useApp();

  const row = React.useMemo(() => passportRow(serviceId, src), [serviceId, src]);
  const claimId = row?.service.claimId;
  const proof = React.useMemo(
    () => (claimId ? previewProof(state, claimId) : null),
    [state, claimId],
  );
  const proofEvents = React.useMemo(
    () => state.proofEvents.filter((ev) => ev.serviceId === serviceId),
    [state.proofEvents, serviceId],
  );
  const provenance = React.useMemo(
    () =>
      state.provenance
        .filter(
          (r) =>
            r.resourceId === serviceId || (claimId && r.resourceId === claimId),
        )
        .sort((a, b) => b.version - a.version),
    [state.provenance, serviceId, claimId],
  );
  const proofState =
    state.proofStates[serviceId] ?? proof?.assessment.state ?? null;
  const attestationRec = state.attestations.find(
    (a) =>
      a.subjectType === "ServicePassport" &&
      a.subjectId === serviceId &&
      a.status === "ATTESTED",
  );
  const anchorRec = state.anchors.find(
    (a) => a.serviceId === serviceId && a.state === "ANCHORED",
  );

  if (!row) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Passport tidak ditemukan
        </h1>
        <p className="text-sm text-slate-500">
          Service ID <span className="font-mono">{serviceId}</span> tidak ada di data.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/app/passport">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Kembali ke daftar passport
          </Link>
        </Button>
      </div>
    );
  }

  const { service, template, passport, sessionStatus } = row;
  const patient = getPatient(service.patientId);
  const provider = getProvider(service.providerId);
  const stage = passportStageOf(service.evidence, template.required);
  const next = passportNextAction(service.evidence, template.required);
  const present = service.evidence.filter(
    (e) => e.state === "present" && template.required.includes(e.kind),
  ).length;
  const pct = Math.round((present / template.required.length) * 100);
  const events = [...service.events].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/app/passport"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Semua passport
        </Link>
      </div>

      <PageHeader
        title={`Passport ${service.id}`}
        description={`${template.name} · ${patient?.display ?? service.patientId} · ${
          provider?.name ?? service.providerId
        } · ${service.servicePoint} · ${formatDate(service.date)} ${service.startTime}${
          service.endTime ? `–${service.endTime}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PassportStageBadge stage={stage} />
            {next ? <PassportNextActionChip action={next} /> : null}
            <StatusBadge status={passport.status} />
            <StatusBadge status={sessionStatus} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <section
          aria-label="Checklist evidence"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Checklist evidence</h2>
              <p className="text-xs text-slate-500">
                {present}/{template.required.length} wajib tercatat
              </p>
            </div>
            <Progress value={pct} className="h-1.5 w-full sm:w-40" />
          </div>

          <ul className="mt-4 flex flex-col divide-y divide-slate-100">
            {template.required.map((kind) => {
              const item = service.evidence.find((e) => e.kind === kind);
              const ok = item?.state === "present";
              return (
                <li
                  key={kind}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full " +
                        (ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
                      }
                    >
                      {ok ? (
                        <Check className="size-3.5" />
                      ) : (
                        <CircleAlert className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">
                        {EVIDENCE_LABEL[kind]}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {ok ? (
                          <>
                            <span className="font-mono">{item?.citation}</span> · {item?.at} ·{" "}
                            {item?.source}
                          </>
                        ) : (
                          (item?.note ?? "Belum tercatat")
                        )}
                      </span>
                    </span>
                  </div>
                  {ok ? (
                    <span className="shrink-0 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-700 sm:self-auto">
                      TERCATAT
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addEvidence(service.id, kind)}
                      className="inline-flex h-7 shrink-0 items-center gap-1 self-start rounded-full border border-dashed border-amber-300 bg-amber-50/70 px-2.5 text-[11px] font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-sky-400 sm:self-auto"
                    >
                      <Plus aria-hidden="true" className="size-3" />
                      Catat {EVIDENCE_LABEL[kind]}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-5">
          <section
            aria-label="Identitas passport"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-slate-900">Identitas</h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-sm">
              {[
                ["Status passport", STATUS_TEXT[passport.status] ?? passport.status],
                ["Status sesi", STATUS_TEXT[sessionStatus] ?? sessionStatus],
                ["Cakupan", `${passport.coverage}%`],
                ["Tarif", `Rp ${template.rate.toLocaleString("id-ID")}`],
                ["Provider", provider?.name ?? service.providerId],
                ["Titik layanan", service.servicePoint],
                ["Tanggal", formatDate(service.date)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium break-words text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            {service.claimId ? (
              <Button asChild size="sm" variant="outline" className="mt-4 w-full rounded-full">
                <Link href={`/app/claims/${service.claimId}`}>
                  Lihat klaim {service.claimId}
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Belum tertaut ke klaim.
              </p>
            )}
          </section>

          <section
            aria-label="Timeline event"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-slate-900">Timeline event</h2>
            <ol className="mt-3 flex flex-col gap-3 border-l border-slate-200 pl-4">
              {events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-sky-500 ring-4 ring-white"
                  />
                  <p className="text-sm text-slate-700">{ev.description}</p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-wider text-slate-400">
                    {ev.at} · {ev.source}
                  </p>
                </li>
              ))}
              {events.length === 0 ? (
                <li className="text-sm text-slate-500">Belum ada event.</li>
              ) : null}
            </ol>
            <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] tracking-wider text-slate-400 uppercase">
              Diperbarui {formatDateTime(service.date + " " + (service.endTime ?? service.startTime))}
            </p>
          </section>
        </div>
      </div>

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
              Proof state, 7 dimensi, stream, dan provenance passport ini
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {proofState ? (
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold tracking-wider " +
                  (STATE_UI[proofState]?.chip ?? "border-slate-200 bg-slate-50 text-slate-600")
                }
              >
                PROOF STATE: {proofState}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 font-mono text-[11px] tracking-wider text-slate-600">
                NOT YET ASSESSED
              </span>
            )}
            {claimId ? (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href={`/app/proof/${claimId}`}>
                  Buka Proof View
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {proof ? (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {PROOF_DIMENSIONS.map((d) => {
              const verdict =
                proof.assessment.dimensions.find((x) => x.dimension === d)
                  ?.verdict ?? "UNKNOWN";
              const ui = VERDICT_UI[verdict];
              return (
                <li
                  key={d}
                  className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2"
                >
                  <span className="text-[10px] font-medium leading-tight text-slate-500">
                    {PROOF_DIMENSION_LABEL[d]}
                  </span>
                  <span
                    className={
                      "inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider " +
                      ui.chip
                    }
                  >
                    <span aria-hidden="true">{ui.glyph}</span>
                    {ui.token}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500">
            {claimId
              ? "Dimensi proof belum dapat dinilai untuk passport ini."
              : "Passport belum tertaut ke klaim — 7 dimensi belum dapat dinilai."}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["PROVENANCE VERSION", provenance[0] ? `v${provenance[0].version}` : "—"],
            ["INTEGRITY REFERENCE", provenance[0]?.integrityRef ?? "—"],
            ["CREATED BY", provenance[0]?.actorId ?? "—"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
            >
              <p className="font-mono text-[10px] tracking-wider text-slate-400">
                {k}
              </p>
              <p className="mt-0.5 text-xs font-medium break-words text-slate-700">
                {v}
              </p>
            </div>
          ))}
        </div>
        {provenance.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            Belum ada catatan provenance untuk passport ini.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">
            {claimId
              ? `Jejak klaim ${claimId} — CLAIM → INVOICE → CHARGE → SERVICE → ENCOUNTER → PROVIDER → EVIDENCE.`
              : "Jejak klaim tersedia setelah passport tertaut ke klaim."}
          </p>
          {claimId ? (
            <span className="flex flex-wrap items-center gap-3">
              <Link
                href={`/app/proof/${claimId}`}
                className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                Claim trace di Proof View →
              </Link>
              <Link
                href={`/app/claims/${claimId}/graph`}
                className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                Graf bukti →
              </Link>
            </span>
          ) : null}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <ProofStream
            events={proofEvents}
            provenance={provenance}
            framed={false}
          />
        </div>
      </section>

      <section
        aria-label="Service context"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <p className="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
          Service context
        </p>
        <h2 className="mt-0.5 text-sm font-semibold text-slate-900">
          Provider attestation dan anchor titik layanan passport ini
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div
            data-testid="service-context-attestation"
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
          >
            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              PROVIDER ATTESTATION
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-700">
              {attestationRec
                ? `✓ ATTESTED · ${attestationRec.actorId} · ${attestationRec.at}`
                : "Belum ada attestasi provider"}
            </p>
          </div>
          <div
            data-testid="service-context-anchor"
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
          >
            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              SERVICE POINT
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-700">
              {anchorRec
                ? `✓ ANCHORED · ${anchorRec.servicePointId} · ${anchorRec.facilityId} · ${anchorRec.method ?? "VIRTUAL"} · ${anchorRec.anchoredAt}`
                : "Belum dikonfirmasi"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              SERVICE EPISODE
            </p>
            <p className="mt-0.5 break-words text-xs font-medium text-slate-700">
              {serviceId} · {service.servicePoint} · {service.providerId}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Anchor adalah context witness atas sesi layanan — bukan bukti
          tunggal; proof assessment tetap berdiri di atas identitas, provider,
          evidence, temporal, billing, dan klaim.
        </p>
      </section>
    </div>
  );
}

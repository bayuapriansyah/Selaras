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
import { formatDate, formatDateTime } from "@/lib/app/format";

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
  const { src, addEvidence } = useApp();

  const row = React.useMemo(() => passportRow(serviceId, src), [serviceId, src]);

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
    </div>
  );
}

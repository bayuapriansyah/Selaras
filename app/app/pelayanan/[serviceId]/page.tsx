"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Lock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { QrPanel } from "@/components/app/QrPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import type { CaptureChannel, EvidenceKind } from "@/data/app/types";
import { patients, providers } from "@/data/app/seed";
import { getTemplate } from "@/lib/app/selectors";
import { passportRow } from "@/lib/app/services/passportService";
import { makeQrToken } from "@/lib/app/qr";

function VerifyItem({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <span
        aria-hidden="true"
        className={
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full " +
          (ok ? "bg-emerald-500 text-white" : "bg-amber-400 text-white")
        }
      >
        {ok ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="truncate text-xs font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function ServiceWorkspacePage() {
  const params = useParams<{ serviceId: string }>();
  const serviceId = params.serviceId;
  const { src, state, addEvidence } = useApp();

  const row = React.useMemo(
    () => passportRow(serviceId, src),
    [serviceId, src],
  );

  const [channel, setChannel] = React.useState<CaptureChannel | null>(null);
  const [note, setNote] = React.useState("");

  if (!row) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Workspace pelayanan"
          description="Sesi layanan tidak ditemukan."
          actions={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/app/pelayanan">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Kembali ke pelayanan
              </Link>
            </Button>
          }
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <ClipboardList
            aria-hidden="true"
            className="mx-auto size-8 text-slate-400"
          />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Pelayanan {serviceId} tidak ada.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mulai pelayanan baru di halaman pelayanan.
          </p>
        </div>
      </div>
    );
  }

  const { service, template, patient, provider } = row;
  const token = makeQrToken(serviceId);
  const steps = EVIDENCE_ORDER.filter(
    (k) => template.required.includes(k) && k !== "note",
  ) as EvidenceKind[];
  const patientName =
    patient?.display ??
    patients.find((p) => p.id === service.patientId)?.display ??
    service.patientId;
  const providerName =
    provider?.name ??
    providers.find((p) => p.id === service.providerId)?.name ??
    service.providerId;
  const missing = template.required.filter(
    (kind) => service.evidence.find((e) => e.kind === kind)?.state !== "present",
  );
  const done = service.status === "SELESAI" && missing.length === 0;
  const locked = channel === null;
  const noteItem = service.evidence.find((e) => e.kind === "note");
  const noteChannel = state.evidenceAdds
    .filter((a) => a.serviceId === serviceId && a.kind === "note")
    .slice(-1)[0]?.channel;

  function capture(kind: EvidenceKind, via?: CaptureChannel) {
    if (locked && !via) return;
    addEvidence(serviceId, kind, via ?? channel ?? "MANUAL");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Workspace ${template.name}`}
        description={`${serviceId} · ${patientName} · ${service.servicePoint}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/pelayanan"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Layanan hari ini
            </Link>
            <Link
              href={`/app/passport/${serviceId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Service Passport
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        }
      />

      <section
        aria-label="Verifikasi point of care"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <ShieldCheck aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Verifikasi sesi layanan
            </h2>
            <p className="text-xs text-slate-500">
              Empat syarat wajib sebelum evidence dapat dicatat.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <VerifyItem label="Episode" value={serviceId} ok={Boolean(service.id)} />
          <VerifyItem label="Provider" value={providerName} ok={Boolean(provider)} />
          <VerifyItem
            label="Titik layanan"
            value={service.servicePoint}
            ok={service.servicePoint.length > 0}
          />
          <VerifyItem
            label="Timestamp"
            value={`${service.date} · mulai ${service.startTime}`}
            ok={Boolean(service.startTime)}
          />
        </div>
      </section>

      <section
        aria-label="Pindai QR point of care"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Scan untuk membuka capture
            </h2>
            <p className="text-xs text-slate-500">
              Pindai QR di perangkat point of care — atau pakai DEMO SCAN.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <QrPanel
            token={token}
            serviceId={serviceId}
            channel={channel}
            onVerified={setChannel}
          />
        </div>
      </section>

      <section
        aria-label="Alur evidence"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Capture evidence
            </h2>
            <p className="text-xs text-slate-500">
              {template.required.length - missing.length}/
              {template.required.length} langkah selesai
              {missing.length > 0
                ? ` · ${missing.length} belum tercatat`
                : " · seluruh langkah lengkap"}
            </p>
          </div>
          {done ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-medium text-emerald-700">
              <Check aria-hidden="true" className="size-3" />
              Selesai — seluruh evidence lengkap
            </span>
          ) : locked ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-[11px] font-medium text-amber-700">
              <Lock aria-hidden="true" className="size-3" />
              Terkunci — scan QR dulu
            </span>
          ) : (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-medium text-emerald-700">
              <Check aria-hidden="true" className="size-3" />
              Terbuka · channel {channel}
            </span>
          )}
        </div>

        <ol className="mt-4 flex flex-col gap-3">
          {steps.map((kind, index) => {
            const item = service.evidence.find((e) => e.kind === kind);
            const ok = item?.state === "present";
            const addChannel = state.evidenceAdds
              .filter((a) => a.serviceId === serviceId && a.kind === kind)
              .slice(-1)[0]?.channel;

            return (
              <li
                key={kind}
                className={
                  "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between " +
                  (ok
                    ? "border-emerald-200 bg-emerald-50/50"
                    : locked
                      ? "border-slate-200 bg-slate-50/60"
                      : "border-amber-200 bg-amber-50/40")
                }
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={
                      "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold " +
                      (ok
                        ? "bg-emerald-500 text-white"
                        : locked
                          ? "bg-slate-300 text-slate-600"
                          : "bg-amber-400 text-white")
                    }
                  >
                    {ok ? <Check className="size-3.5" strokeWidth={3.5} /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {EVIDENCE_LABEL[kind]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ok
                        ? `Tercatat ${item?.at ?? "-"}${
                            addChannel ? ` · via ${addChannel}` : ""
                          }`
                        : locked
                          ? "Menunggu verifikasi QR"
                          : "Siap dicatat"}
                    </p>
                  </div>
                </div>

                {ok ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant={locked ? "outline" : "default"}
                    disabled={locked}
                    className="h-8 shrink-0 rounded-full"
                    onClick={() => capture(kind)}
                  >
                    {locked ? (
                      <Lock aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Plus aria-hidden="true" className="size-3.5" />
                    )}
                    Catat {EVIDENCE_LABEL[kind]}
                  </Button>
                )}
              </li>
            );
          })}

          <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Catatan klinis
                </p>
                <p className="text-xs text-slate-500">
                  {noteItem?.state === "present"
                    ? `Tercatat ${noteItem.at ?? "-"}${
                        noteChannel ? ` · via ${noteChannel}` : ""
                      }`
                    : template.required.includes("note")
                      ? "Wajib — bagian dari evidence template layanan ini."
                      : "Opsional — catatan bebas untuk tim berikutnya."}
                </p>
              </div>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={locked}
              placeholder={
                locked
                  ? "Scan QR untuk membuka input catatan."
                  : "Tulis catatan klinis singkat…"
              }
              className="mt-3 min-h-[72px] bg-white text-sm"
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={locked || note.trim().length === 0}
                className="h-8 rounded-full"
                onClick={() => {
                  capture("note");
                  setNote("");
                }}
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Simpan catatan klinis
              </Button>
            </div>
          </li>
        </ol>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Setelah seluruh langkah lengkap, Service Passport berstatus
            COMPLETE dan evidence siap mengunci klaim.
          </p>
          {done ? (
            <Button asChild size="sm" className="shrink-0 rounded-full">
              <Link href={`/app/passport/${serviceId}`}>
                Buka Service Passport
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="shrink-0 rounded-full" disabled>
              Buka Service Passport
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleAlert, Plus, Stethoscope } from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import type { EvidenceKind } from "@/data/app/types";
import {
  patients,
  providers,
  templates,
} from "@/data/app/seed";
import { getTemplate, servicesToday } from "@/lib/app/selectors";

const SERVICE_POINTS = [
  "Ruang Fisioterapi 1",
  "Ruang Fisioterapi 2",
  "Poli Gigi 1",
  "Poli Umum",
  "Laboratorium Lantai 1",
  "Rontgen 1",
];

function NativeSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition-colors hover:border-slate-300 focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-200"
      >
        {children}
      </select>
    </label>
  );
}

function ServiceStatusChip({ status }: { status: "AKTIF" | "SELESAI" }) {
  return (
    <span
      className={
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11px] font-medium tracking-wider " +
        (status === "AKTIF"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700")
      }
    >
      <span
        aria-hidden="true"
        className={
          "size-1.5 rounded-full " + (status === "AKTIF" ? "bg-sky-500" : "bg-emerald-500")
        }
      />
      {status}
    </span>
  );
}

export default function PelayananPage() {
  const router = useRouter();
  const { src, startService, addEvidence } = useApp();

  const [patientId, setPatientId] = React.useState(patients[0].id);
  const [providerId, setProviderId] = React.useState(providers[0].id);
  const [templateId, setTemplateId] = React.useState(templates[0].id);
  const [servicePoint, setServicePoint] = React.useState(SERVICE_POINTS[0]);

  const today = React.useMemo(() => servicesToday(src), [src]);
  const chosen = getTemplate(templateId);
  const activeCount = today.filter((s) => s.status === "AKTIF").length;

  function onStart() {
    const id = startService({ patientId, providerId, templateId, servicePoint });
    router.push(`/app/passport/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pelayanan"
        description="Point of care: mulai pelayanan, catat evidence sesuai template, dan lengkapi Service Passport pasien."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-sky-200 bg-sky-50 px-3 font-mono text-[11px] font-medium tracking-wider text-sky-700">
            {activeCount} pelayanan aktif
          </span>
        }
      />

      <section
        aria-label="Mulai pelayanan baru"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-white">
            <Stethoscope aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Mulai pelayanan baru</h2>
            <p className="text-xs text-slate-500">
              Evidence kedatangan tercatat otomatis saat pelayanan dimulai.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <NativeSelect label="Pasien" value={patientId} onChange={setPatientId}>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect label="Provider" value={providerId} onChange={setProviderId}>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.profession}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect label="Template layanan" value={templateId} onChange={setTemplateId}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.required.length} evidence
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            label="Titik layanan"
            value={servicePoint}
            onChange={setServicePoint}
          >
            {SERVICE_POINTS.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {chosen.name} · tarif{" "}
            <span className="font-medium text-slate-700">
              {chosen.rate.toLocaleString("id-ID")}
            </span>{" "}
            · wajib:{" "}
            <span className="text-slate-700">
              {chosen.required.map((k) => EVIDENCE_LABEL[k]).join(", ")}
            </span>
          </p>
          <Button size="sm" className="shrink-0 rounded-full" onClick={onStart}>
            Mulai Pelayanan
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </section>

      <section
        aria-label="Layanan hari ini"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Layanan hari ini</h2>
            <p className="text-xs text-slate-500">
              {today.length} pelayanan · workspace evidence di baris pelayanan aktif.
            </p>
          </div>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {today.map((s) => {
            const tpl = getTemplate(s.templateId);
            const patient = patients.find((p) => p.id === s.patientId);
            const present = s.evidence.filter(
              (e) => e.state === "present" && tpl.required.includes(e.kind),
            ).length;
            const required = tpl.required.length;
            const pct = Math.round((present / required) * 100);
            const missing = EVIDENCE_ORDER.filter(
              (k) =>
                tpl.required.includes(k) &&
                s.evidence.find((e) => e.kind === k)?.state !== "present",
            ) as EvidenceKind[];

            return (
              <li
                key={s.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-slate-300"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold tracking-wider text-slate-700">
                        {s.id}
                      </span>
                      <ServiceStatusChip status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {tpl.name} · {patient?.display ?? s.patientId} · {s.servicePoint}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <span className="text-xs text-slate-500">
                      {present}/{required} evidence
                    </span>
                    <Progress value={pct} className="h-1.5 w-32" />
                  </div>
                </div>

                {s.status === "AKTIF" ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tpl.required.map((kind) => {
                      const item = s.evidence.find((e) => e.kind === kind);
                      const ok = item?.state === "present";
                      if (ok) {
                        return (
                          <span
                            key={kind}
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700"
                          >
                            <Check aria-hidden="true" className="size-3" />
                            {EVIDENCE_LABEL[kind]}
                            <span className="font-mono text-[10px] text-emerald-600">
                              {item?.at}
                            </span>
                          </span>
                        );
                      }
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => addEvidence(s.id, kind)}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-amber-300 bg-amber-50/70 px-2.5 text-[11px] font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-sky-400"
                        >
                          <Plus aria-hidden="true" className="size-3" />
                          Catat {EVIDENCE_LABEL[kind]}
                        </button>
                      );
                    })}
                    {missing.length > 0 ? (
                      <span className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500">
                        <CircleAlert aria-hidden="true" className="size-3" />
                        {missing.length} belum tercatat
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={`/app/passport/${s.id}`}
                      className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                      Lihat passport
                    </a>
                    {missing.length > 0 ? (
                      <span className="inline-flex h-7 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] text-amber-700">
                        <CircleAlert aria-hidden="true" className="size-3" />
                        {missing.length} evidence belum tercatat
                      </span>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
          {today.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Belum ada pelayanan hari ini. Mulai pelayanan baru di atas.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

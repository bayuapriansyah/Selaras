"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Layers, Stethoscope } from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import { templates } from "@/data/app/seed";

export default function ServiceTemplatesPage() {
  const { src } = useApp();

  const usage = React.useMemo(() => {
    const map = new Map<string, { services: number; claims: number }>();
    for (const t of templates) map.set(t.id, { services: 0, claims: 0 });
    for (const s of src.services) {
      const u = map.get(s.templateId);
      if (u) u.services += 1;
    }
    for (const s of src.services) {
      if (!s.claimId) continue;
      const u = map.get(s.templateId);
      if (u) u.claims += 1;
    }
    return map;
  }, [src]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Template Layanan"
        description="Katalog template: evidence wajib, tarif, dan definisi status untuk setiap jenis layanan."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {templates.length} template
          </span>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const u = usage.get(t.id) ?? { services: 0, claims: 0 };
          return (
            <section
              key={t.id}
              aria-label={`Template ${t.name}`}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-sky-600 text-white">
                    <Stethoscope aria-hidden="true" className="size-4.5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{t.name}</h2>
                    <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                      {t.nameEn}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700">
                  Rp {t.rate.toLocaleString("id-ID")}
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {t.description}
              </p>

              <p className="mt-4 text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                Evidence wajib ({t.required.length})
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {EVIDENCE_ORDER.filter((k) => t.required.includes(k)).map(
                  (k, i) => (
                    <li
                      key={k}
                      className="inline-flex h-6 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] text-slate-600"
                    >
                      <span className="font-mono text-[9px] text-slate-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {EVIDENCE_LABEL[k]}
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Layers aria-hidden="true" className="size-3.5" />
                  {u.services} pelayanan · {u.claims} tertaut klaim
                </span>
                <span className="font-mono text-[10px] tracking-wider text-slate-400">
                  {t.id}
                </span>
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 p-5">
        <p className="text-sm text-slate-600">
          Pasien membutuhkan layanan lain? Mulai dari{" "}
          <Link
            href="/app/pelayanan"
            className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            Pelayanan
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>{" "}
          — evidence akan dievaluasi memakai template yang sama.
        </p>
      </section>
    </div>
  );
}

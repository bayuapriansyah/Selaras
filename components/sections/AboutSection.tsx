import { X } from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

const NOT_LIST = [
  "Mesin yang memberikan vonis fraud otomatis",
  "Pengganti RME atau SIMRS",
  "Sistem klaim baru",
  "Chatbot kesehatan",
  "Dashboard anomaly score tanpa bukti pendukung",
];

const META = [
  { label: "Program", value: "Healthkathon BPJS Kesehatan 2026" },
  { label: "Kategori", value: "Efisiensi Risiko Fasilitas Kesehatan" },
  { label: "Fokus", value: "Phantom & Repeat Billing" },
  { label: "MVP", value: "Integritas Pelayanan Fisioterapi" },
];

export function AboutSection() {
  return (
    <section
      id="tentang"
      aria-labelledby="about-title"
      className="bg-white py-20 lg:py-28 border-t border-slate-200/80 text-slate-900 relative overflow-hidden"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">09 / Tentang</span>
              <div className="h-px w-12 bg-slate-200" />
            </div>
            <SectionHeading
              id="about-title"
              title={
                <>
                  Lapisan evidence intelligence{" "}
                  <span className="text-sky-600">
                    dari pelayanan ke klaim.
                  </span>
                </>
              }
              lead="SELARAS adalah lapisan integritas pelayanan yang membentuk bukti sejak titik pelayanan, mengikatnya dalam Service Passport, merekonstruksi episode, lalu merekonsiliasi jejak pelayanan dengan billing dan klaim BPJS Kesehatan."
              size="md"
            />

            <Reveal delay={0.05} y={18}>
              <blockquote className="mt-8 border-l-2 border-emerald-500 bg-emerald-50/50 rounded-r-2xl pl-5 py-3.5 pr-4">
                <p className="text-base sm:text-lg leading-relaxed font-semibold text-slate-900">
                  Pelayanan terjadi → bukti terbentuk → episode direkonstruksi → klaim dicocokkan → verifikator memperoleh konteks utuh yang dapat diaudit.
                </p>
              </blockquote>

              <dl className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {META.map((item) => (
                  <div key={item.label} className="border-t border-slate-100 pt-3">
                    <dt className="font-mono text-xs text-emerald-700 uppercase tracking-wider font-semibold">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-slate-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.1} y={18}>
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-6 shadow-sm">
                <p className="font-mono text-xs font-bold tracking-[0.18em] text-amber-700 uppercase flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Prinsip Batasan · SELARAS bukan:
                </p>
                <ul className="mt-5 flex flex-col gap-3">
                  {NOT_LIST.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 border-t border-slate-200/60 pt-3 text-xs sm:text-sm text-slate-700 first:border-t-0 first:pt-0"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-xs">
                        <X aria-hidden="true" className="size-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

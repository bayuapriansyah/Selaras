"use client";

import { motion, useReducedMotion } from "motion/react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Lane = {
  index: string;
  name: string;
  local: string;
  tag: "MVP" | "Roadmap";
  footprint: string[];
  bars: number[];
};

const LANES: Lane[] = [
  {
    index: "01",
    name: "Fisioterapi",
    local: "Physiotherapy",
    tag: "MVP",
    footprint: [
      "Janji temu",
      "Penugasan provider",
      "Treatment",
      "Catatan klinis",
      "Penyelesaian",
    ],
    bars: [10, 20, 30, 16, 26, 12, 24, 18, 28, 14],
  },
  {
    index: "02",
    name: "Radiologi",
    local: "Radiology",
    tag: "Roadmap",
    footprint: ["Perintah", "Akuisisi", "Pembacaan", "Laporan", "Otorisasi"],
    bars: [8, 16, 26, 32, 18, 22, 14, 28, 20, 12],
  },
  {
    index: "03",
    name: "Laboratorium",
    local: "Laboratory",
    tag: "Roadmap",
    footprint: ["Perintah", "Spesimen", "Analisis", "Hasil", "Verifikasi"],
    bars: [12, 24, 18, 30, 22, 16, 26, 20, 14, 28],
  },
  {
    index: "04",
    name: "Farmasi",
    local: "Pharmacy",
    tag: "Roadmap",
    footprint: [
      "Resep",
      "Penebusan",
      "Pemberian",
      "Inventaris",
      "Rekonsiliasi",
    ],
    bars: [26, 14, 22, 18, 30, 12, 20, 24, 16, 28],
  },
  {
    index: "05",
    name: "Alat Kesehatan",
    local: "Medical Devices",
    tag: "Roadmap",
    footprint: [
      "Indikasi",
      "Log perangkat",
      "Rekam penggunaan",
      "Pemeliharaan",
      "Serah terima",
    ],
    bars: [18, 28, 12, 24, 20, 30, 16, 10, 26, 22],
  },
  {
    index: "06",
    name: "Rawat Inap",
    local: "Inpatient",
    tag: "Roadmap",
    footprint: [
      "Admisi",
      "Event ruangan",
      "Prosedur",
      "Obat",
      "Pulang",
    ],
    bars: [30, 22, 16, 26, 14, 28, 20, 24, 12, 18],
  },
];

const BAR_MAX = 32;

export function ScaleSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="skalabilitas"
      aria-labelledby="scale-title"
      className="bg-white py-20 lg:py-28 border-y border-slate-200/80 text-slate-900 relative overflow-hidden"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">07 / Skala</span>
          <div className="h-px w-12 bg-slate-200" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="scale-title"
            title={
              <>
                Satu template sidik jari untuk{" "}
                <span className="text-sky-600">
                  setiap lini layanan kesehatan.
                </span>
              </>
            }
            lead="Service Passport dibentuk dari Service Fingerprint tiap jenis layanan. Fisioterapi menjadi MVP implementasi, lalu pola deterministik yang sama diskalakan ke radiologi, laboratorium, dan farmasi."
            size="md"
            className="max-w-2xl"
          />
          <p className="font-mono text-xs font-bold tracking-wider text-sky-700 uppercase">
            ✦ Arsitektur Skalabel
          </p>
        </div>

        <Reveal className="mt-12" y={24}>
          <ol className="border-b border-slate-200">
            {LANES.map((lane, index) => (
              <motion.li
                key={lane.name}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                  delay: Math.min(index * 0.05, 0.25),
                }}
                className="group grid grid-cols-[2.5rem_1fr] items-start gap-x-5 gap-y-3 border-t border-slate-100 py-5 transition-colors duration-200 hover:bg-slate-50/80 sm:grid-cols-[2.5rem_minmax(0,13rem)_1fr] lg:grid-cols-[2.5rem_minmax(0,14rem)_1fr_auto] lg:items-center lg:gap-x-8 rounded-xl px-3"
              >
                <span className="font-mono text-xs text-slate-500 font-semibold transition-colors group-hover:text-sky-600">
                  {lane.index}
                </span>

                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-950 group-hover:text-sky-700 transition-colors">
                    {lane.name}
                  </p>
                  <p className="font-mono text-[10.5px] tracking-wider text-emerald-700 uppercase font-semibold">
                    {lane.local}
                  </p>
                </div>

                <div className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1 lg:col-span-1">
                  {lane.footprint.map((item) => (
                    <span
                      key={item}
                      className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 text-xs text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 lg:col-span-1 lg:justify-end">
                  <svg
                    viewBox="0 0 96 36"
                    aria-hidden="true"
                    className="h-9 w-24 shrink-0"
                  >
                    {lane.bars.map((value, barIndex) => (
                      <rect
                        key={barIndex}
                        x={barIndex * 10}
                        y={BAR_MAX - value + 2}
                        width={6}
                        height={value}
                        rx={2}
                        className={
                          lane.tag === "MVP"
                            ? "fill-emerald-500"
                            : "fill-slate-200"
                        }
                      />
                    ))}
                  </svg>

                  <span
                    className={cn(
                      "rounded-full px-3 py-1 font-mono text-[10px] tracking-wider uppercase font-semibold",
                      lane.tag === "MVP"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "border border-slate-200 bg-slate-100 text-slate-500",
                    )}
                  >
                    {lane.tag}
                  </span>
                </div>
              </motion.li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

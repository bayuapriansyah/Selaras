"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ServicePassportCard } from "@/components/passport/ServicePassportCard";
import { heroPassport, type PassportStatus } from "@/data/passport";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    stage: "Layanan",
    sentence: "Pelayanan terjadi di faskes.",
    desc: "Setiap tindakan medis dan kehadiran pasien dicatat langsung di titik pelayanan.",
    status: "DRAFT" as PassportStatus,
    nodes: 1,
  },
  {
    stage: "Bukti",
    sentence: "Bukti klinis terbentuk.",
    desc: "SOAP klinis, foto terapi, dan check-in biometrik terverifikasi ke graf rantai bukti.",
    status: "ACTIVE" as PassportStatus,
    nodes: 3,
  },
  {
    stage: "Passport",
    sentence: "Episode direkonstruksi.",
    desc: "Service Passport deterministik mengikat jejak kronologis 10 sesi secara utuh dan terlacak perubahannya.",
    status: "COMPLETE" as PassportStatus,
    nodes: 5,
  },
  {
    stage: "Klaim",
    sentence: "Klaim diverifikasi berbasis bukti.",
    desc: "Klaim diterima berbekal bukti — 8 didukung bukti, 2 menunggu tinjauan manusia.",
    status: "SUPPORTED" as PassportStatus,
    nodes: 6,
  },
];

const LEFT_NODES = ["Pasien", "Provider", "Treatment"];
const RIGHT_NODES = ["Catatan", "Billing", "Claim"];

function NodeChip({
  label,
  active,
  align,
}: {
  label: string;
  active: boolean;
  align: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-all duration-500 backdrop-blur-md",
        align === "left" ? "flex-row" : "flex-row-reverse",
        active
          ? "border-sky-300 bg-sky-50 text-sky-800 shadow-sm"
          : "border-slate-200/90 bg-white/80 text-slate-400",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-sky-600 shadow-[0_0_6px_rgba(2,132,199,0.5)]" : "bg-slate-300")} />
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "h-px w-5 transition-colors duration-500",
          active ? "bg-sky-500" : "bg-slate-200",
        )}
      />
    </span>
  );
}

function StaticStory() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((step, index) => (
          <div key={step.stage} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="font-mono text-xs text-sky-600 font-semibold">
              0{index + 1}
            </span>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">
              {step.stage}
            </p>
            <p className="mt-1 text-xs text-slate-600">{step.sentence}</p>
          </div>
        ))}
      </div>
      <div className="max-w-md mx-auto w-full">
        <ServicePassportCard
          data={{ ...heroPassport, status: "SUPPORTED" }}
          coverage={100}
          theme="light"
        />
      </div>
    </div>
  );
}

export function HeroScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const coverage = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [25, 50, 75, 90, 100],
  );

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next =
      value < 0.25 ? 0 : value < 0.5 ? 1 : value < 0.75 ? 2 : 3;
    setStep((prev) => (prev === next ? prev : next));
  });

  if (reduce) {
    return (
      <section
        aria-label="Alur pelayanan menjadi klaim"
        className="border-y border-slate-200 bg-[#f8fafc] text-slate-900 py-16"
      >
        <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
          <StaticStory />
        </div>
      </section>
    );
  }

  const current = STEPS[step];

  return (
    <section
      aria-label="Alur pelayanan menjadi klaim"
      className="relative bg-[#f8fafc] text-slate-900 border-b border-slate-200"
    >
      <div ref={ref} className="relative h-[280vh]">
        <div className="sticky top-20 h-[calc(100dvh-5rem)] overflow-hidden">
          <div className="mx-auto flex h-full max-w-[88rem] items-center px-5 lg:px-8">
            <div className="grid w-full items-center gap-10 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-5">
                {/* Stepper Interactive Navigation */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs tracking-wider text-sky-700 font-semibold">
                      0{step + 1} / 04
                    </span>
                    <div className="flex flex-1 gap-2" aria-hidden="true">
                      {STEPS.map((item, index) => (
                        <button
                          key={item.stage}
                          type="button"
                          onClick={() => setStep(index)}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-all duration-300",
                            index <= step
                              ? "bg-sky-600"
                              : "bg-slate-200 hover:bg-slate-300",
                          )}
                          aria-label={`Beralih ke tahap ${item.stage}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stage Pill Quick Switches */}
                  <div className="flex flex-wrap gap-2">
                    {STEPS.map((item, index) => (
                      <button
                        key={item.stage}
                        type="button"
                        onClick={() => setStep(index)}
                        className={cn(
                          "rounded-full px-3 py-1 font-mono text-[11px] font-medium transition-all duration-200",
                          step === index
                            ? "bg-white text-sky-800 border border-sky-300 shadow-xs font-semibold"
                            : "bg-slate-100/90 text-slate-600 border border-slate-200/80 hover:bg-white hover:text-slate-900",
                        )}
                      >
                        0{index + 1} {item.stage}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 min-h-[14rem]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={current.stage}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      <p className="text-[2.6rem] leading-none font-bold tracking-tight text-slate-950 uppercase sm:text-[3.4rem] lg:text-[4rem]">
                        {current.stage}
                      </p>
                      <p className="mt-4 text-xl font-semibold text-emerald-700 sm:text-2xl">
                        {current.sentence}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-[45ch]">
                        {current.desc}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[auto_minmax(0,24rem)_auto] lg:gap-4">
                  <div className="hidden flex-col gap-5 lg:flex">
                    {LEFT_NODES.map((label, index) => (
                      <NodeChip
                        key={label}
                        label={label}
                        active={index < current.nodes}
                        align="left"
                      />
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
                    <ServicePassportCard
                      data={{ ...heroPassport, status: current.status }}
                      coverage={coverage}
                      theme="light"
                    />
                  </div>

                  <div className="hidden flex-col gap-5 lg:flex">
                    {RIGHT_NODES.map((label, index) => (
                      <NodeChip
                        key={label}
                        label={label}
                        active={index + 3 < current.nodes}
                        align="right"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

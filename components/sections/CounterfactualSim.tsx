"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Repeat, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Scenario = {
  key: "current" | "counterfactual";
  title: string;
  rows: { label: string; value: string; state?: "supported" | "gap" }[];
  note: string;
};

const SCENARIOS: Scenario[] = [
  {
    key: "current",
    title: "Current scenario",
    rows: [
      { label: "Layanan pada klaim", value: "10" },
      { label: "Evidence-supported", value: "8", state: "supported" },
      { label: "Potential gap", value: "2", state: "gap" },
    ],
    note: "Keseluruhan episode diteruskan ke alur klaim dengan penanda Review pada dua sesi.",
  },
  {
    key: "counterfactual",
    title: "Counterfactual",
    rows: [
      { label: "Layanan diteruskan", value: "8", state: "supported" },
      { label: "Ditahan untuk review", value: "2", state: "gap" },
      { label: "Event dimutasi", value: "0" },
    ],
    note: "Simulasi hanya memilah: dua sesi menunggu reviewer. Tidak ada event, bukti, atau nominal yang diubah.",
  },
];

export function CounterfactualSim() {
  const [simulated, setSimulated] = useState(false);
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="counterfactual-title"
      className="border-t border-hairline bg-ivory-deep py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <SectionHeading
          id="counterfactual-title"
          title="Understand the consequence."
          lead="Counterfactual Simulator menjawab satu pertanyaan sederhana: apa yang terjadi jika hanya layanan dengan bukti lengkap yang diteruskan."
          size="md"
        />

        <Reveal className="mt-10" y={24}>
          <div className="rounded-2xl border border-hairline bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5">
              <div>
                <p className="font-mono text-[10.5px] tracking-[0.18em] text-forest-800 uppercase">
                  Counterfactual Simulator
                </p>
                <p className="mt-1 text-sm text-ash">
                  Input: 10 layanan · evidence-supported 8 · potential gap 2
                </p>
              </div>

              <Button
                onClick={() => setSimulated((prev) => !prev)}
                className="h-10 rounded-full bg-forest-900 px-5 text-sm font-medium text-ivory hover:bg-forest-800"
              >
                <Repeat aria-hidden="true" />
                {simulated ? "Lihat current" : "Simulate without mutation"}
              </Button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={simulated ? "counterfactual" : "current"}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="grid gap-4 pt-6 sm:grid-cols-2"
              >
                {SCENARIOS.map((scenario) => {
                  const isActive =
                    (scenario.key === "counterfactual") === simulated;

                  return (
                    <div
                      key={scenario.key}
                      className={cn(
                        "rounded-2xl border p-5 transition-colors duration-300",
                        isActive
                          ? "border-forest-900 bg-forest-900 text-ivory"
                          : "border-hairline bg-ivory-deep",
                      )}
                    >
                      <p
                        className={cn(
                          "font-mono text-[10.5px] tracking-[0.16em] uppercase",
                          isActive ? "text-leaf-100/80" : "text-forest-800",
                        )}
                      >
                        {scenario.title}
                      </p>

                      <dl className="mt-4 flex flex-col gap-3">
                        {scenario.rows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-4 border-b border-dashed pb-3 last:border-none last:pb-0"
                            style={
                              isActive
                                ? { borderColor: "rgba(230,246,238,0.25)" }
                                : undefined
                            }
                          >
                            <dt
                              className={cn(
                                "text-sm",
                                isActive ? "text-leaf-100/90" : "text-ash",
                              )}
                            >
                              {row.label}
                            </dt>
                            <dd className="flex items-center gap-2">
                              {row.state ? (
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "size-2 rounded-[2px]",
                                    row.state === "supported"
                                      ? isActive
                                        ? "bg-leaf-500"
                                        : "bg-leaf-600"
                                      : isActive
                                        ? "bg-review"
                                        : "bg-review",
                                  )}
                                />
                              ) : null}
                              <span
                                className={cn(
                                  "font-mono text-base font-semibold",
                                  isActive ? "text-ivory" : "text-ink",
                                )}
                              >
                                {row.value}
                              </span>
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <p
                        className={cn(
                          "mt-4 text-sm leading-relaxed",
                          isActive ? "text-leaf-100/80" : "text-ash",
                        )}
                      >
                        {scenario.note}
                      </p>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-start gap-3 border-t border-hairline pt-5">
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-ash"
              />
              <p className="text-xs leading-relaxed text-ash">
                Synthetic Demonstration. Seluruh angka pada simulator ini adalah
                data simulasi untuk keperluan prototipe. Jika nominal uang
                ditampilkan, angka tersebut juga synthetic dan bukan
                rujukan tarif. Tidak ada perhitungan klaim nyata yang
                dilakukan.{" "}
                <span className="inline-flex items-center gap-1.5 align-middle">
                  <ArrowRight aria-hidden="true" className="size-3" />
                  Model ukurannya ada pada{" "}
                  <a
                    href="#measurement"
                    className="text-forest-800 underline decoration-leaf-600 underline-offset-4 hover:text-forest-900"
                  >
                    Measurement Framework
                  </a>
                </span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

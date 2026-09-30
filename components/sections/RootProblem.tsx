"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";

const CHAIN = [
  "Appointment",
  "Arrival",
  "Provider",
  "Treatment",
  "Clinical Note",
  "Billing",
  "Claim",
] as const;

const GAP_INDEX = 3;

function Connector() {
  return (
    <>
      <ArrowRight
        aria-hidden="true"
        className="hidden h-4 w-4 shrink-0 text-ash lg:block"
      />
      <ArrowDown
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-ash lg:hidden"
      />
    </>
  );
}

export function RootProblem() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="root-title"
      className="border-y border-hairline bg-ivory-deep py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <SectionHeading
          id="root-title"
          title="Where the story breaks."
          lead="Cerita pelayanan hanya utuh jika seluruh simpulnya terbukti. Satu simpul yang kosong membuat reviewer berhenti menerka."
          size="md"
        />

        <Reveal className="mt-12" y={24}>
          <ol
            className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-0"
            aria-label="Rantai cerita pelayanan"
          >
            {CHAIN.map((label, index) => {
              const isGap = index === GAP_INDEX;

              return (
                <li
                  key={label}
                  className="flex w-full flex-col items-center gap-2 lg:w-auto lg:flex-row"
                >
                  <div
                    className={cn(
                      "flex w-full min-w-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 lg:w-auto",
                      isGap
                        ? "border-dashed border-review/50 bg-review-soft"
                        : "border-hairline bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-medium whitespace-nowrap",
                        isGap ? "text-review" : "text-ink",
                      )}
                    >
                      {label}
                      {isGap ? (
                        <span className="font-mono font-semibold" aria-hidden="true">
                          ?
                        </span>
                      ) : null}
                    </span>
                    <motion.span
                      initial={reduce ? false : { opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.45, ease: EASE, delay: 0.5 }}
                      className={cn(
                        "font-mono text-[10px] tracking-[0.14em] uppercase",
                        isGap ? "text-review" : "invisible",
                      )}
                      aria-hidden={!isGap}
                    >
                      {isGap ? "Evidence Gap" : "\u00A0"}
                    </motion.span>
                  </div>

                  {index < CHAIN.length - 1 ? <Connector /> : null}
                </li>
              );
            })}
          </ol>
        </Reveal>

        <Reveal className="mt-10 max-w-2xl" y={16} delay={0.1}>
          <p className="border-l-2 border-forest-900 pl-4 text-lg leading-relaxed text-ink">
            Missing evidence is a signal to investigate: not a verdict.
          </p>
          <p className="mt-3 text-sm text-ash">
            SELARAS menandai celah bukti, bukan menyimpulkan kesalahan.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

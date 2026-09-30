"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import { ServicePassportCard } from "@/components/passport/ServicePassportCard";
import { passportFacets, passportStates, type PassportData, type PassportStatus } from "@/data/passport";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";

type Scenario = {
  status: PassportStatus;
  coverage: number;
  states: PassportData["evidence"][number]["state"][];
};

const SCENARIOS: Record<PassportStatus, Scenario> = {
  DRAFT: {
    status: "DRAFT",
    coverage: 0,
    states: ["pending", "pending", "pending", "pending", "pending", "pending"],
  },
  ACTIVE: {
    status: "ACTIVE",
    coverage: 40,
    states: ["supported", "supported", "pending", "pending", "pending", "pending"],
  },
  COMPLETE: {
    status: "COMPLETE",
    coverage: 100,
    states: ["supported", "supported", "supported", "supported", "supported", "supported"],
  },
  INCOMPLETE: {
    status: "INCOMPLETE",
    coverage: 68,
    states: ["supported", "supported", "supported", "gap", "supported", "gap"],
  },
  REVIEW: {
    status: "REVIEW",
    coverage: 82,
    states: ["supported", "supported", "supported", "gap", "supported", "supported"],
  },
  VERIFIED: {
    status: "VERIFIED",
    coverage: 100,
    states: ["supported", "supported", "supported", "supported", "supported", "supported"],
  },
  SUPPORTED: {
    status: "SUPPORTED",
    coverage: 100,
    states: ["supported", "supported", "supported", "supported", "supported", "supported"],
  },
};

export function PassportSection() {
  const [status, setStatus] = useState<PassportStatus>("COMPLETE");
  const reduce = useReducedMotion();

  const scenario = SCENARIOS[status];
  const activeState = passportStates.find((item) => item.status === status);

  const data: PassportData = {
    id: "SRV-1025-08",
    service: "Physiotherapy",
    patient: "P-1025",
    provider: "T-031",
    window: "14:03 · 14:41",
    evidence: [
      { id: "identity", label: "Identity", state: scenario.states[0] },
      { id: "provider", label: "Provider", state: scenario.states[1] },
      { id: "point", label: "Service Point", state: scenario.states[2] },
      { id: "treatment", label: "Treatment", state: scenario.states[3] },
      { id: "note", label: "Clinical Note", state: scenario.states[4] },
      { id: "completion", label: "Completion", state: scenario.states[5] },
    ],
    coverage: scenario.coverage,
    status: scenario.status,
  };

  return (
    <section
      id="paspor"
      aria-labelledby="passport-title"
      className="border-y border-slate-200/80 bg-white py-20 lg:py-28 text-slate-900 relative overflow-hidden"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">03 / Service Passport</span>
            <div className="h-px w-12 bg-slate-200" />
          </div>
        <SectionHeading
          id="passport-title"
          title={
            <>
              One service.{" "}
              <span className="text-sky-600">
                One deterministic evidence story.
              </span>
            </>
          }
          lead="Service Passport adalah satu tempat bagi seluruh bukti satu episode pelayanan: identitas, timeline, coverage, provenance, dan status klinisnya."
          size="md"
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <Reveal>
              <motion.div
                key={status}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-2 shadow-sm">
                  <ServicePassportCard data={data} theme="light" />
                </div>
              </motion.div>
              <p className="mt-4 font-mono text-[10.5px] tracking-wider text-slate-600 uppercase font-medium">
                ✦ Interactive State Playground
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={0.05}>
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-sky-600 uppercase">
                Pilih State Service Passport
              </p>

              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Pilih status Service Passport">
                {passportStates.map((item) => {
                  const isActive = item.status === status;
                  return (
                    <button
                      key={item.status}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setStatus(item.status)}
                      className={cn(
                        "h-9 rounded-full border px-4 font-mono text-[11px] tracking-wider uppercase outline-none transition-all duration-200",
                        isActive
                          ? "border-sky-600 bg-sky-600 text-white font-bold shadow-sm shadow-sky-600/20 scale-105"
                          : "border-slate-200 bg-slate-100/80 text-slate-600 hover:border-slate-300 hover:bg-slate-200/60 hover:text-slate-900",
                      )}
                    >
                      {item.status}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <p className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  {activeState?.title ?? "Supported"}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {activeState?.description ??
                    "Seluruh bukti menopang klaim pada episode ini secara lengkap."}
                </p>
              </div>

              <dl className="mt-8 divide-y divide-slate-100 border-t border-slate-200">
                {passportFacets.map((facet) => (
                  <div
                    key={facet.label}
                    className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4"
                  >
                    <dt className="font-mono text-xs font-semibold tracking-wider text-emerald-700 uppercase">
                      {facet.label}
                    </dt>
                    <dd>
                      <p className="text-sm font-semibold text-slate-900">
                        {facet.value}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">{facet.note}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

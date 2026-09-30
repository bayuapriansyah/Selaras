"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowRight,
  ChevronLeft,
  CircleHelp,
  Play,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import { EvidenceRow } from "@/components/passport/EvidenceRow";
import { SessionGrid } from "@/components/golden/SessionGrid";
import { EpisodeTimeline } from "@/components/golden/EpisodeTimeline";
import { ReasonerPanel } from "@/components/golden/ReasonerPanel";
import {
  goldenSessions,
  sessionNineReplay,
  type GoldenSession,
  type ReasonerBlock,
  type ReplayEvent,
} from "@/data/golden-case";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const CAPTIONS = [
  "10 sesi fisioterapi diajukan dalam satu klaim.",
  "SELARAS merekonstruksi episode dari bukti yang tersedia.",
  "8 sesi didukung bukti, 2 sesi perlu ditinjau.",
  "Bukti per sesi: mana yang menopang, mana yang belum.",
  "Episode diputar ulang per event, bukan per klaim.",
  "Penjelasan berbasis bukti, bukan vonis.",
];

const SUPPORT_LABEL: Record<string, string> = {
  Arrival: "Patient arrival",
  Provider: "Provider assignment",
  Treatment: "Treatment event",
  "Clinical Note": "Clinical note",
  Billing: "Billing record",
  Claim: "Claim entry",
};

const EVENT_TIME: Record<string, string> = {
  Arrival: "09:02",
  Provider: "09:05",
  Treatment: "09:07",
  "Clinical Note": "09:44",
  Billing: "09:46",
  Claim: "09:50",
};

function buildTimeline(session: GoldenSession): ReplayEvent[] {
  if (session.id === 9) return sessionNineReplay;

  return session.checklist.map((item) => ({
    time: EVENT_TIME[item.label] ?? "09:55",
    label: item.label,
    state: item.state,
    detail:
      item.state === "gap" ? "Event tidak ditemukan" : "Tercatat pada sistem",
  }));
}

function buildReasoner(session: GoldenSession): ReasonerBlock[] | null {
  const gaps = session.checklist.filter((item) => item.state === "gap");
  if (gaps.length === 0) return null;

  const supported = session.checklist
    .filter((item) => item.state === "supported")
    .map((item) => SUPPORT_LABEL[item.label] ?? item.label);

  const missing = gaps.map((item) => SUPPORT_LABEL[item.label] ?? item.label);
  if (session.id === 9) missing.push("Completion event");

  return [
    {
      label: "What changed?",
      value: `${gaps.map((item) => item.label).join(" & ")} evidence missing`,
      tone: "gap",
    },
    {
      label: "When?",
      value: EVENT_TIME[gaps[0].label] ?? "09:07",
    },
    {
      label: "What supports it?",
      items: supported,
    },
    {
      label: "What is missing?",
      items: missing,
      tone: "gap",
    },
    {
      label: "Why review?",
      value:
        "Claim contains the service, but the evidence chain is incomplete.",
    },
  ];
}

function StepAction({
  children,
  icon: Icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className="h-11 rounded-full bg-sky-600 hover:bg-sky-500 px-6 text-sm font-semibold text-white transition-all hover:scale-[1.02] cursor-pointer"
    >
      {children}
      <Icon aria-hidden="true" className="ml-1.5 size-4" />
    </Button>
  );
}

export function GoldenCase() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(9);

  const session =
    goldenSessions.find((item) => item.id === selected) ?? goldenSessions[8];

  useEffect(() => {
    if (step !== 1) return;
    const timer = window.setTimeout(() => setStep(2), 1700);
    return () => window.clearTimeout(timer);
  }, [step]);

  const reasoner = buildReasoner(session);
  const timeline = buildTimeline(session);

  const canGoBack = step > 0 && step !== 1;

  const handleAction = () => {
    setStep((prev) => Math.min(prev + 1, 5));
  };

  return (
    <section
      id="golden-case"
      aria-labelledby="golden-title"
      className="bg-[#f8fafc] py-20 lg:py-28 border-y border-slate-200/80 text-slate-900 relative overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">04 / Golden Case</span>
          <div className="h-px w-12 bg-slate-200" />
        </div>
        <SectionHeading
          id="golden-title"
          title={
            <>
              See what happens when a claim{" "}
              <span className="text-sky-600">
                meets its deterministic evidence.
              </span>
            </>
          }
          lead="Simulasi Golden Case: 10 sesi fisioterapi. Ikuti bagaimana SELARAS merekonstruksi setiap bukti tindakan hingga memverifikasi mana yang valid dan mana yang butuh audit."
          size="md"
        />

        <Reveal className="mt-12" y={26}>
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-3.5 sm:px-7">
              <span className="font-mono text-xs font-bold tracking-[0.18em] text-sky-700 uppercase flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Golden Case · Physiotherapy Episode
              </span>
              <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[10.5px] tracking-wider text-slate-600 uppercase font-medium">
                ✦ Synthetic Demonstration
              </span>
            </div>

            <div className="px-5 pt-6 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="shrink-0 font-mono text-xs font-bold tracking-wider text-sky-600">
                  {String(step + 1).padStart(2, "0")} / 06
                </span>
                <span className="flex flex-1 gap-1.5" aria-hidden="true">
                  {CAPTIONS.map((caption, index) => (
                    <span
                      key={caption}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-500",
                        index <= step
                          ? "bg-sky-600"
                          : "bg-slate-200",
                      )}
                    />
                  ))}
                </span>
              </div>
              <p className="mt-3 text-sm sm:text-base font-semibold text-slate-800" aria-live="polite">
                {CAPTIONS[step]}
              </p>
            </div>

            <div className="min-h-[22rem] px-5 py-6 sm:min-h-[20rem] sm:px-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {step === 0 ? (
                    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                      <div>
                        <p className="font-mono text-[11px] tracking-[0.2em] text-slate-500 uppercase font-semibold">
                          Claim
                        </p>
                        <p className="mt-4 text-6xl leading-none font-bold tracking-[-0.04em] text-slate-950 sm:text-7xl">
                          10
                        </p>
                        <p className="mt-3 text-base text-slate-600">
                          Physiotherapy Sessions
                        </p>
                        <div
                          className="mt-6 flex gap-1.5"
                          role="img"
                          aria-label="Sepuluh sesi dalam satu klaim"
                        >
                          {Array.from({ length: 10 }).map((_, index) => (
                            <span
                              key={index}
                              className="h-10 flex-1 rounded-sm bg-slate-100 border border-slate-200/80"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                        <p className="text-sm leading-relaxed text-slate-800">
                          Klaim tiba sebagai daftar angka: 10 sesi, satu
                          tagihan. Cerita pelayanan di baliknya belum tersusun.
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-500">
                          SELARAS mulai merekonstruksi episode dari bukti yang
                          tercatat pada titik layanan.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="py-6">
                      <p className="font-mono text-xs font-bold tracking-[0.18em] text-sky-600 uppercase">
                        Service-to-claim reconciliation in progress
                      </p>
                      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full bg-sky-600"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "linear" }}
                        />
                      </div>
                      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                        {[
                          "Quantity check",
                          "Temporal check",
                          "Identity check",
                          "Evidence completeness",
                          "Duplicate check",
                          "Conflict check",
                        ].map((check, index) => (
                          <motion.li
                            key={check}
                            initial={reduce ? false : { opacity: 0, x: -8 }}
                            animate={reduce ? undefined : { opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              ease: EASE,
                              delay: reduce ? 0 : index * 0.16,
                            }}
                            className="flex items-center gap-2.5 font-mono text-xs tracking-wider text-slate-700 uppercase font-medium"
                          >
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full bg-emerald-500"
                            />
                            {check}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
                      <div className="flex flex-col justify-between gap-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                            <p className="text-5xl leading-none font-bold tracking-tight text-emerald-700 sm:text-6xl">
                              8
                            </p>
                            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                              <span
                                aria-hidden="true"
                                className="size-2 rounded-full bg-emerald-500"
                              />
                              Supported
                            </p>
                          </div>
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                            <p className="text-5xl leading-none font-bold tracking-tight text-amber-700 sm:text-6xl">
                              2
                            </p>
                            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                              <span
                                aria-hidden="true"
                                className="size-2 rounded-full bg-amber-500"
                              />
                              Review Needed
                            </p>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">
                          Dua sesi tidak menemukan kelengkapan bukti di titik layanan. Pilih nomor sesi pada kisi di sebelah kanan untuk melihat rincian bukti per event.
                        </p>
                      </div>

                      <div>
                        <p className="font-mono text-xs font-bold tracking-[0.18em] text-sky-600 uppercase">
                          Pilih Sesi Fisioterapi
                        </p>
                        <div className="mt-3">
                          <SessionGrid selected={selected} onSelect={setSelected} />
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          Sesi terpilih saat ini:{" "}
                          <span className="font-mono font-bold text-sky-700">
                            Sesi {String(selected).padStart(2, "0")}
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-mono text-xs font-bold tracking-[0.18em] text-sky-600 uppercase">
                            Sesi {String(selected).padStart(2, "0")} · Evidence Trail
                          </p>
                          <span
                            className={cn(
                              "inline-flex h-6 items-center rounded-full border px-3 font-mono text-[10.5px] tracking-wider uppercase font-semibold",
                              session.status === "review"
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-emerald-300 bg-emerald-50 text-emerald-800",
                            )}
                          >
                            {session.status === "review"
                              ? "Need review"
                              : "Supported"}
                          </span>
                        </div>

                        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50 px-4">
                          {session.checklist.map((item) => (
                            <EvidenceRow
                              key={item.label}
                              label={item.label}
                              state={item.state}
                              onDark={false}
                            />
                          ))}
                        </ul>

                        <div className="mt-5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10.5px] tracking-[0.14em] text-slate-500 uppercase">
                              Coverage Rate
                            </span>
                            <span className="font-mono text-sm font-bold text-emerald-600">
                              {session.coverage}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width] duration-700",
                                session.coverage === 100
                                  ? "bg-sky-600"
                                  : "bg-amber-500",
                              )}
                              style={{ width: `${session.coverage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 flex flex-col justify-center">
                        <p className="font-mono text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                          Temuan Integritas Pelayanan
                        </p>
                        <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-800 font-medium">
                          {session.checklist.every(
                            (item) => item.state === "supported",
                          )
                            ? "Seluruh bukti klinis pada sesi ini tersedia, konsisten, dan saling menopang klaim BPJS secara valid."
                            : "Sebagian bukti klinis tidak ditemukan pada episode ini, sementara billing tetap menagihkan 10 sesi penuh."}
                        </p>
                        <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-500">
                          Selisih ini memberikan sinyal audit yang transparan bagi verifikator, mencegah sengketa berkepanjangan.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-xs font-bold tracking-[0.18em] text-sky-600 uppercase">
                          Episode Replay · Sesi{" "}
                          {String(selected).padStart(2, "0")}
                        </p>
                        <p className="font-mono text-[10.5px] tracking-wider text-slate-500 uppercase">
                          ✦ Replay Kronologis Event
                        </p>
                      </div>
                      <EpisodeTimeline
                        events={timeline}
                        className="mt-4"
                        delayStep={reduce ? 0 : 0.14}
                      />
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <div>
                      <p className="mb-4 font-mono text-xs font-bold tracking-[0.18em] text-sky-600 uppercase">
                        AI Evidence Reasoner · Sesi{" "}
                        {String(selected).padStart(2, "0")}
                      </p>
                      {reasoner ? (
                        <ReasonerPanel blocks={reasoner} />
                      ) : (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-slate-900 shadow-sm">
                          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 font-mono text-[10px] tracking-wider text-emerald-800 uppercase font-semibold">
                            <span className="size-1.5 rounded-full bg-emerald-600" />
                            No evidence gap detected
                          </span>
                          <p className="mt-4 text-base font-bold text-slate-900">
                            Seluruh bukti pada sesi ini menopang klaim secara lengkap.
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Tidak ada proof gap ataupun inkonsistensi yang perlu direview oleh verifikator.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-7">
              <div>
                {canGoBack ? (
                  <Button
                    variant="ghost"
                    onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                    className="h-10 rounded-full px-4 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer"
                  >
                    <ChevronLeft aria-hidden="true" className="mr-1 size-4" />
                    Kembali
                  </Button>
                ) : (
                  <span className="hidden font-mono text-[10.5px] tracking-wider text-slate-500 uppercase sm:inline">
                    ✦ Human-in-the-loop review
                  </span>
                )}
              </div>

              {step === 0 ? (
                <StepAction icon={ArrowRight} onClick={handleAction}>
                  Reconcile dengan bukti
                </StepAction>
              ) : null}
              {step === 1 ? (
                <span className="font-mono text-xs tracking-wider text-sky-700 uppercase animate-pulse font-semibold">
                  Mencocokkan bukti…
                </span>
              ) : null}
              {step === 2 ? (
                <StepAction icon={ArrowRight} onClick={handleAction}>
                  Periksa sesi {String(selected).padStart(2, "0")}
                </StepAction>
              ) : null}
              {step === 3 ? (
                <StepAction icon={Play} onClick={handleAction}>
                  Replay Episode
                </StepAction>
              ) : null}
              {step === 4 ? (
                <StepAction icon={CircleHelp} onClick={handleAction}>
                  Why? Reasoner
                </StepAction>
              ) : null}
              {step === 5 ? (
                <StepAction
                  icon={RotateCcw}
                  onClick={() => {
                    setSelected(9);
                    setStep(0);
                  }}
                >
                  Mulai lagi
                </StepAction>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

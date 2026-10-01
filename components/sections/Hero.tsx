"use client";

import {
  ArrowRight,
  ShieldCheck,
  Clock,
  BarChart3,
  CheckCircle2,
  Lock,
  UserCheck,
  Stethoscope,
  Activity,
  FileCheck2,
  Check,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/layout/Reveal";
import { ServicePassportCard } from "@/components/passport/ServicePassportCard";
import { heroPassport } from "@/data/passport";
import { EASE } from "@/lib/motion";

const METRICS = [
  { icon: ShieldCheck, value: "100%", label: "Deterministik" },
  { icon: Clock, value: "<2s", label: "Verifikasi" },
  { icon: BarChart3, value: "10 Sesi", label: "Terlindungi" },
];

const VERIFICATION_STEPS = [
  {
    icon: UserCheck,
    title: "Check-in Pasien",
    desc: "Biometrik & NIK terverifikasi",
    status: "TERVERIFIKASI",
    badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    icon: Stethoscope,
    title: "Autentikasi Provider",
    desc: "Kredensial SIP nakes aktif",
    status: "VALID",
    badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    icon: Activity,
    title: "Tindakan Klinis",
    desc: "Sesi fisioterapi 38m tercatat",
    status: "TERCATAT",
    badgeColor: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    icon: FileCheck2,
    title: "SOAP & Billing Hash",
    desc: "Rekam medis terkunci SHA-256",
    status: "TERKUNCI",
    badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      className="relative overflow-hidden pt-20 sm:pt-24 lg:pt-28"
      style={{
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #e2e8f0 75%, #cbd5e1 100%)",
      }}
    >
      {/* Ambient orb glows — Linear/Vercel style */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-[60%] w-[700px] h-[700px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.06) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-20 right-0 translate-x-1/3 w-[480px] h-[480px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(52,211,153,0.13) 0%, rgba(52,211,153,0.04) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* 21st.dev subtle dot grid overlay for light theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(15,23,42,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 25%, black 30%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 25%, black 30%, transparent 85%)",
        }}
      />

      {/* Fresh, clean ambient glow behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 w-[750px] h-[340px] blur-[120px] z-0 opacity-35"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(14,165,233,0.18) 0%, rgba(16,185,129,0.09) 45%, transparent 75%)",
        }}
      />

      {/* ── PROPORTIONAL & BALANCED HERO CONTENT (LIGHT THEME) ── */}
      <div className="relative z-10 mx-auto max-w-[72rem] px-5 lg:px-8 text-center">
        {/* Announcement pill */}
        <Reveal delay={0}>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-3.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] backdrop-blur-md mb-6 hover:border-slate-300 transition-colors">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-emerald-500 animate-pulse"
            />
            <span className="font-mono text-[10.5px] font-semibold tracking-[0.14em] text-slate-800 uppercase">
              Healthkathon BPJS Kesehatan 2026
            </span>
            <span className="hidden sm:inline h-3 w-px bg-slate-300" />
            <span className="hidden sm:inline font-mono text-[10px] text-slate-500 uppercase tracking-wider">
              Lapisan Integritas Pelayanan
            </span>
          </div>
        </Reveal>

        {/* Main heading */}
        <Reveal delay={0.06} y={18}>
          <h1 className="text-3xl leading-[1.08] font-bold tracking-[-0.035em] text-slate-950 text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.06]">
            Setiap pelayanan meninggalkan{" "}
            <span className="text-sky-600">bukti</span>{" "}
            <br className="hidden sm:block" />
            sebelum menjadi klaim.
          </h1>
        </Reveal>

        {/* Sub-heading: clean, crisp, elegant */}
        <Reveal delay={0.12}>
          <p className="mt-4 mx-auto max-w-[46ch] text-sm leading-relaxed text-slate-600 font-normal sm:text-base lg:text-[1.05rem]">
            Kunci rantai bukti klinis langsung di titik layanan faskes.
            <br className="hidden sm:block" />
            Deterministik, anti-dispute, dan siap verifikasi klaim BPJS.
          </p>
        </Reveal>

        {/* CTA Buttons */}
        <Reveal delay={0.18}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="h-10 rounded-full px-5 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all hover:scale-[1.02] shadow-[0_4px_16px_rgba(15,23,42,0.18)]"
            >
              <a href="#paspor" className="flex items-center gap-2">
                Lihat Service Passport
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full px-5 text-xs sm:text-sm font-semibold text-slate-700 bg-white/90 hover:bg-white hover:text-slate-950 border border-slate-200/90 shadow-sm transition-all hover:scale-[1.02]"
            >
              <a href="#golden-case">
                Simulasi Kasus →
              </a>
            </Button>
          </div>
        </Reveal>

        {/* Minimalist Trust Metric Strip (Airy & Crisp) */}
        <Reveal delay={0.24}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-2 text-xs font-mono text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-sky-600" />
              <strong className="text-slate-900 font-semibold">100%</strong>
              <span>Deterministik</span>
            </span>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-sky-600" />
              <strong className="text-slate-900 font-semibold">&lt;2s</strong>
              <span>Target Verifikasi</span>
            </span>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="size-3.5 text-sky-600" />
              <strong className="text-slate-900 font-semibold">10 Sesi</strong>
              <span>Terlindungi</span>
            </span>
          </div>
        </Reveal>
      </div>

      {/* ── 21ST.DEV STYLE PRODUCT APPLICATION FRAME (HIGH-CONTRAST DARK TERMINAL) ── */}
      <div className="relative z-10 mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 mt-9 sm:mt-11 pb-4">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 35 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.28 }}
          className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden"
        >
          {/* Window Mockup Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-400 inline-block" />
              <span className="size-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="size-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="ml-3 hidden sm:inline font-mono text-[11px] text-slate-500 tracking-wider">
                selaras-core prototipe · point-of-care runtime deterministik
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] text-emerald-700 font-semibold">
                <Check className="size-3" /> Sinkron (Simulasi)
              </span>
              <span className="font-mono text-[11px] text-slate-500 font-medium hidden md:inline">
                Target: VClaim / SATUSEHAT
              </span>
            </div>
          </div>

          {/* Two-Column Workspace Layout */}
          <div className="p-4 sm:p-6 lg:p-8 grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Live Verification Pipeline */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Pipeline Point-of-Care Langsung
                  </p>
                  <span className="font-mono text-[10px] text-slate-500 font-medium">
                    ID: EV-2026-FASKES
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Verifikasi bukti otomatis di titik layanan faskes.
                </p>

                <div className="mt-5 space-y-2.5">
                  {VERIFICATION_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.title}
                        className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/50"
                      >
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 truncate">
                              {idx + 1}. {step.title}
                            </h4>
                            <span
                              className={`shrink-0 rounded-full border px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase ${step.badgeColor}`}
                            >
                              {step.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cryptographic hash proof telemetry */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 font-mono text-[10px] text-slate-700">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Lock className="size-3 text-sky-700" /> Segel Anti-Tamper
                  </span>
                  <span className="text-emerald-700 font-bold">LOLOS 100%</span>
                </div>
                <div className="truncate text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">
                  sha256: 9b2d8f1e4c70a31481e3a95c47fb1...
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-slate-500">
                  <span>Validasi Klaim (Simulasi)</span>
                  <span>Target latensi: 1,4s</span>
                </div>
              </div>
            </div>

            {/* Right Column: The Service Passport Card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-1.5 shadow-[0_8px_32px_rgba(15,23,42,0.05)]">
                <ServicePassportCard data={heroPassport} reveal theme="light" />
              </div>
              <div className="mt-3 flex items-center justify-between px-1">
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Selaras Passport: 6/6 bukti lengkap & tervalidasi
                </p>
                <a
                  href="#paspor"
                  className="font-mono text-[11px] text-sky-700 hover:text-sky-600 underline underline-offset-4 font-medium"
                >
                  Lihat spesifikasi teknis →
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── ROLLING WAVE TRANSITION TO NEXT SECTION ── */}
      <div className="relative w-full overflow-hidden leading-none z-20 mt-12 sm:mt-16">
        <svg
          viewBox="0 0 1440 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative block w-full h-12 sm:h-18 lg:h-20 text-[#f8fafc]"
          preserveAspectRatio="none"
        >
          <path
            d="M0,32 C320,85 460,10 740,48 C1020,86 1220,18 1440,54 L1440,96 L0,96 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}

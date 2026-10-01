import { ArrowRight, ScanSearch } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/layout/Reveal";

const CHAIN = ["Catat", "Passport", "Rekonstruksi", "Rekonsiliasi"];

export function FinalCTA() {
  return (
    <section
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden border-t border-slate-200 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] pt-20 pb-16 lg:pt-28 text-slate-900"
    >
      {/* Premium spotlight orb — large centered glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0.05) 50%, transparent 75%)",
          filter: "blur(30px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-[500px] h-[500px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, rgba(99,102,241,0.02) 55%, transparent 75%)",
          filter: "blur(60px)",
        }}
      />
      {/* Decorative diagonal tick marks — far left */}
      <svg
        aria-hidden="true"
        viewBox="0 0 80 300"
        className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-[60px] h-[240px] opacity-[0.08] z-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[0, 40, 80, 120, 160, 200, 240].map((y, i) => (
          <line key={i} x1="0" y1={y} x2="80" y2={y + 30} stroke="rgb(51,65,85)" strokeWidth={i % 2 === 0 ? "1" : "0.5"} />
        ))}
      </svg>

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 lg:px-8">
        <Reveal y={26}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20">
            {/* Left: CTA Text */}
            <div className="flex-1">
              <ol className="flex flex-wrap items-center gap-2" aria-hidden="true">
                {CHAIN.map((item, index) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200/90 bg-white px-3 py-1 font-mono text-[10px] tracking-wider text-slate-600 uppercase font-semibold shadow-xs">
                      {item}
                    </span>
                    {index < CHAIN.length - 1 ? (
                      <ArrowRight className="size-3 text-slate-400" />
                    ) : null}
                  </li>
                ))}
              </ol>

              <h2
                id="cta-title"
                className="mt-7 max-w-[15ch] text-[2.5rem] leading-[1.02] font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-[4.8rem] lg:leading-[0.98]"
              >
                Buat setiap layanan kesehatan{" "}
                <span className="text-sky-600">
                  dapat dilacak.
                </span>
              </h2>

              <p className="mt-6 max-w-[56ch] text-base leading-relaxed text-slate-600 sm:text-lg">
                Bukti dibentuk langsung di titik pelayanan, bukan direkayasa di akhir siklus klaim. Buka prototipe simulasi: 10 sesi fisioterapi, 8 didukung bukti, 2 menunggu tinjauan reviewer.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  className="h-12 rounded-full px-7 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03] border border-sky-600 bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20"
                >
                  <Link href="/app" className="flex items-center gap-2">
                    Buka Aplikasi
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  className="h-12 rounded-full px-7 text-sm font-semibold text-slate-700 transition-all duration-300 hover:scale-[1.03] border border-slate-300 bg-white hover:bg-slate-50 shadow-sm"
                >
                  <a href="#cara-kerja" className="flex items-center gap-2">
                    Lihat Cara Kerja
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </a>
                </Button>

                <Button
                  asChild
                  className="h-12 rounded-full px-7 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03] border border-slate-900 bg-slate-900 hover:bg-slate-800 shadow-md"
                >
                  <a href="#golden-case" className="flex items-center gap-2">
                    <ScanSearch aria-hidden="true" className="size-4" />
                    Buka Prototipe Golden Case
                  </a>
                </Button>
              </div>

              <p className="mt-8 flex items-center gap-2.5 font-mono text-[11px] tracking-wider text-slate-500 uppercase font-medium">
                <span
                  aria-hidden="true"
                  className="size-2 animate-pulse rounded-full bg-emerald-600"
                />
                Healthkathon BPJS Kesehatan 2026 · Prototipe Lapisan Integritas Pelayanan
              </p>
            </div>

            {/* Right: Frosted Integrity Showcase Card with SVG */}
            <div className="shrink-0 lg:w-[420px] xl:w-[480px]">
              <div className="relative rounded-3xl border border-sky-200/80 bg-white/90 p-7 sm:p-8 shadow-2xl shadow-sky-500/10 backdrop-blur-md overflow-hidden">
                {/* Ambient glow inside card */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-12 size-60 rounded-full bg-sky-400/20 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-emerald-400/15 blur-2xl"
                />

                {/* Status Bar */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-mono text-[10px] font-bold text-sky-800">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    PASSPORT DIGITAL PROTOTIPE
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    Desain siap JKN
                  </span>
                </div>

                {/* SVG Illustration */}
                <div className="relative z-10 my-6 flex items-center justify-center">
                  <div className="w-full max-w-[280px] sm:max-w-[320px] transition-transform duration-500 hover:scale-105">
                    <img
                      src="/illustrations/done-checking.svg"
                      alt="Ilustrasi digital passport layanan kesehatan terverifikasi dan siap audit"
                      className="w-full h-auto drop-shadow-sm"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Verification Card Footer */}
                <div className="relative z-10 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                    <span>Episode #EP-2026-0881</span>
                    <span className="font-mono text-emerald-600">✓ Tervalidasi</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>SHA-256 Merkle Root:</span>
                    <span className="text-slate-700 font-semibold">0x7d2f...c94a</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

    </section>
  );
}

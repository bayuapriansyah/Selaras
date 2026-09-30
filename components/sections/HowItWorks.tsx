import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

const STEPS = [
  {
    number: "01",
    title: "Capture",
    desc: "Bentuk bukti saat pelayanan terjadi.",
  },
  {
    number: "02",
    title: "Passport",
    desc: "Satukan seluruh evidence dalam satu episode.",
  },
  {
    number: "03",
    title: "Reconstruct",
    desc: "Bangun kembali cerita pelayanan.",
  },
  {
    number: "04",
    title: "Reconcile",
    desc: "Bandingkan pelayanan dengan billing dan claim.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="cara-kerja"
      aria-labelledby="how-title"
      className="border-t border-slate-200/80 bg-gradient-to-b from-white via-sky-50/20 to-slate-50/60 py-20 lg:py-28 text-slate-900 relative overflow-hidden"
    >
      {/* Ambient lighting — glowing mesh blooms without repeating patterns */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full z-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.14) 0%, rgba(14,165,233,0.04) 60%, transparent 80%)",
          filter: "blur(60px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 -right-20 w-[480px] h-[480px] rounded-full z-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, rgba(56,189,248,0.03) 60%, transparent 80%)",
          filter: "blur(70px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">02 / How it works</span>
            <div className="h-px w-12 bg-slate-200" />
          </div>
          <SectionHeading
            id="how-title"
            title="Empat tahap, satu jejak integritas."
            lead="SELARAS bekerja mengikuti alur pelayanan alami faskes, bukan menambah birokrasi berbelit di atasnya."
            size="md"
          />
        </div>

        {/* Bento Grid: Steps on Left, Visual Showcase on Right */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 items-stretch">
          {/* Left: 4 Chronological Step Cards (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} y={16} delay={index * 0.08}>
                <div className="group relative flex items-start gap-5 rounded-2xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-xs transition-all duration-300 hover:border-sky-300 hover:shadow-md hover:bg-white backdrop-blur-sm">
                  {/* Step Number Circle */}
                  <div className="shrink-0">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 font-mono text-sm font-bold text-sky-800 transition-all duration-300 group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500 shadow-xs">
                      {step.number}
                    </span>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-mono text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                        {step.title}
                      </h3>
                      <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase font-medium">
                        Phase 0{index + 1}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-slate-700">
                      {step.desc}
                    </p>
                    
                    {/* Progress Bar indicator */}
                    <div className="mt-3 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-700"
                        style={{ width: `${(index + 1) * 25}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Right: Glassmorphism Visual Showcase Card (5 cols) */}
          <div className="lg:col-span-5">
            <Reveal y={24} delay={0.2} className="h-full">
              <div className="relative h-full flex flex-col justify-between overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-b from-white via-sky-50/30 to-white p-7 sm:p-8 shadow-xl shadow-sky-500/5 backdrop-blur-md">
                {/* Glowing radial backlight behind illustration */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-12 size-64 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(14,165,233,0.06) 60%, transparent 80%)",
                    filter: "blur(36px)",
                  }}
                />

                {/* Top Badge Strip */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-2.5 py-1 font-mono text-[10px] font-semibold text-sky-700">
                    <span className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                    POINT-OF-CARE CAPTURE
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    Latency &lt; 120ms
                  </span>
                </div>

                {/* Vector SVG Illustration Display */}
                <div className="my-6 flex items-center justify-center p-2 relative">
                  <div className="w-full max-w-[280px] sm:max-w-[320px] transition-transform duration-500 hover:scale-[1.03]">
                    <img
                      src="/illustrations/medical-care.svg"
                      alt="Ilustrasi verifikasi pelayanan faskes langsung di titik asuhan"
                      className="w-full h-auto drop-shadow-xs"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Bottom Telemetry Floating Card */}
                <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Standar Interoperabilitas</span>
                    <span className="font-mono text-emerald-600 font-semibold">FHIR HL7 Ready</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Verifikasi Integritas</span>
                    <span className="font-mono text-sky-600 font-semibold">100% Deterministic</span>
                  </div>
                  <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="text-emerald-500">●</span>
                    Bukti digital dienkripsi & terikat ke episode pelayanan pasien.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

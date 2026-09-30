import { CircleHelp, GitCompareArrows, ShieldCheck } from "lucide-react";
import { ReasonerPanel } from "@/components/golden/ReasonerPanel";
import { Reveal } from "@/components/layout/Reveal";

const PRINCIPLES = [
  {
    icon: CircleHelp,
    title: "Missing evidence ≠ fraud",
    desc: "Celah bukti adalah sinyal untuk diperiksa, bukan kesalahan.",
  },
  {
    icon: GitCompareArrows,
    title: "Explain before escalate",
    desc: "Setiap penanda memiliki alasan yang bisa dibaca reviewer.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-loop",
    desc: "Keputusan akhir tetap berada pada manusia.",
  },
];

export function AiSection() {
  return (
    <section
      id="ai"
      aria-labelledby="ai-title"
      className="border-t border-slate-200/80 bg-white py-20 lg:py-28 text-slate-900 relative overflow-hidden"
    >
      {/* Ambient orbs — intelligence/data palette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 translate-x-1/4 w-[550px] h-[550px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(52,211,153,0.10) 0%, rgba(52,211,153,0.03) 50%, transparent 70%)",
          filter: "blur(55px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 -translate-x-1/3 w-[400px] h-[400px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.09) 0%, rgba(56,189,248,0.03) 55%, transparent 75%)",
          filter: "blur(48px)",
        }}
      />
      {/* Decorative node connection SVG — top right */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute top-12 right-12 w-[180px] h-[180px] opacity-[0.07] z-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="70" stroke="rgb(51,65,85)" strokeWidth="0.8" strokeDasharray="4 8" />
        <circle cx="100" cy="100" r="45" stroke="rgb(51,65,85)" strokeWidth="0.7" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r="20" stroke="rgb(51,65,85)" strokeWidth="1" />
        <circle cx="100" cy="100" r="5" fill="rgb(51,65,85)" />
        <line x1="100" y1="30" x2="100" y2="55" stroke="rgb(51,65,85)" strokeWidth="0.8" />
        <line x1="170" y1="100" x2="145" y2="100" stroke="rgb(51,65,85)" strokeWidth="0.8" />
        <line x1="100" y1="170" x2="100" y2="145" stroke="rgb(51,65,85)" strokeWidth="0.8" />
        <line x1="30" y1="100" x2="55" y2="100" stroke="rgb(51,65,85)" strokeWidth="0.8" />
      </svg>

      <div className="mx-auto grid max-w-[88rem] gap-10 px-5 lg:grid-cols-12 lg:gap-12 lg:px-8 relative z-10">
        <div className="lg:col-span-5">
          <Reveal amount={0.2}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">05 / AI Reasoning</span>
              <div className="h-px w-12 bg-slate-200" />
            </div>
            <h2
              id="ai-title"
              className="text-[2.2rem] leading-[1.05] font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.2rem] lg:leading-[1.03]"
            >
              AI that explains.
              <br />
              <span className="text-sky-600">
                Not AI that accuses.
              </span>
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-slate-600 sm:text-lg">
              AI Evidence Reasoner menyusun penjelasan dari bukti yang memang tercatat di titik pelayanan faskes. Ia tidak menghakimi fasilitas kesehatan, melainkan memverifikasi integritas klaim secara objektif.
            </p>

            <ul className="mt-9 flex flex-col gap-5 border-t border-slate-100 pt-7">
              {PRINCIPLES.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-4 items-start">
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sky-600 shadow-sm">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div>
                      <span className="block text-sm sm:text-base font-bold text-slate-900">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs sm:text-sm leading-relaxed text-slate-500">
                        {item.desc}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal delay={0.06} y={22}>
            <ReasonerPanel />
            <p className="mt-4 font-mono text-[10.5px] tracking-wider text-slate-500 uppercase font-medium">
              ✦ Synthetic Demonstration · Sesi 09
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

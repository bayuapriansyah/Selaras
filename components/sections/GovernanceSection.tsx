import {
  Fingerprint,
  Hand,
  History,
  Lock,
  UsersRound,
} from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

const PILLARS = [
  {
    icon: Lock,
    title: "Privasi",
    desc: "Identitas pasien disamarkan menjadi synthetic identifier. Tidak ada data peserta JKN riil yang digunakan tanpa izin resmi.",
  },
  {
    icon: UsersRound,
    title: "RBAC",
    desc: "Akses dibatasi per peran: provider menangkap bukti, reviewer memeriksa, admin mengelola template dan pengguna.",
  },
  {
    icon: Hand,
    title: "Human-in-the-loop",
    desc: "Setiap keputusan review memiliki aktor manusia. AI menjelaskan, manusia memutuskan.",
  },
  {
    icon: Fingerprint,
    title: "Provenance",
    desc: "Setiap bukti membawa asal-usulnya: sumber, waktu observasi, dan siapa yang mencatatkannya.",
  },
  {
    icon: History,
    title: "Audit",
    desc: "Perubahan status, keputusan, dan akses tercatat dalam audit log yang tidak boleh diubah sewaktu-waktu.",
  },
];

const GOVERNANCE_KPIS = [
  "Klaim dengan provenance lengkap",
  "Penjelasan AI tertaut ke bukti",
  "Keputusan review beraktor manusia",
  "Kelengkapan audit log",
];

export function GovernanceSection() {
  return (
    <section
      id="governance"
      aria-labelledby="governance-title"
      className="border-t border-slate-200/80 bg-[#f8fafc] py-20 lg:py-28 text-slate-900 relative overflow-hidden"
    >
      {/* Ambient emerald glow — governance/trust */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(52,211,153,0.09) 0%, rgba(52,211,153,0.03) 55%, transparent 75%)",
          filter: "blur(60px)",
        }}
      />
      {/* Decorative shield arc — bottom right */}
      <svg
        aria-hidden="true"
        viewBox="0 0 300 320"
        className="pointer-events-none absolute -bottom-12 -right-16 w-[300px] h-[320px] opacity-[0.065] z-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M150,10 L260,55 L260,150 C260,220 150,290 150,290 C150,290 40,220 40,150 L40,55 Z"
          stroke="rgb(51,65,85)"
          strokeWidth="1"
        />
        <path
          d="M150,35 L238,73 L238,150 C238,208 150,268 150,268 C150,268 62,208 62,150 L62,73 Z"
          stroke="rgb(51,65,85)"
          strokeWidth="0.8"
        />
        <path
          d="M150,60 L216,91 L216,148 C216,196 150,246 150,246 C150,246 84,196 84,148 L84,91 Z"
          stroke="rgb(51,65,85)"
          strokeWidth="0.6"
        />
      </svg>

      <div className="mx-auto max-w-[88rem] px-5 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">08 / Tata Kelola</span>
            <div className="h-px w-12 bg-slate-200" />
          </div>
          <SectionHeading
            id="governance-title"
            title={
              <>
                Tata kelola adalah{" "}
                <span className="text-sky-600">
                  bagian integral dari produk.
                </span>
              </>
            }
            lead="Lima kendali tata kelola yang menemani setiap bukti: otorisasi akses, keputusan beraktor manusia, keaslian sumber data (provenance), dan audit log yang tamper-evident."
            size="md"
          />
        </div>


        {/* Highlight Showcase: Trust Vault & KPI Summary */}
        <div className="mt-12 grid gap-6 lg:grid-cols-12 items-stretch">
          {/* Trust Vault Showcase Card (7 cols) */}
          <div className="lg:col-span-7">
            <Reveal y={20}>
              <div className="h-full rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-white p-7 sm:p-8 shadow-lg shadow-emerald-500/5 relative overflow-hidden flex flex-col sm:flex-row items-center gap-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -left-12 size-56 rounded-full bg-emerald-400/15 blur-3xl"
                />
                
                <div className="shrink-0 w-full max-w-[200px] sm:max-w-[220px]">
                  <img
                    src="/illustrations/private-data.svg"
                    alt="Ilustrasi perlindungan privasi data rekam medis pasien"
                    className="w-full h-auto drop-shadow-xs"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    KEAMANAN & KEPATUHAN
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">
                    Perlindungan Privasi Pasien Berstandar Enkripsi Faskes
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Identitas pasien disamarkan menjadi synthetic token sebelum analisis. Tidak ada data sensitif yang bocor ke log pihak ketiga.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-700 font-medium">
                      ✓ ID Sintetis Non-PII
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-700 font-medium">
                      ✓ Audit Anti-Manipulasi
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Governance KPI Card (5 cols) */}
          <div className="lg:col-span-5">
            <Reveal y={20} delay={0.1} className="h-full">
              <div className="h-full flex flex-col justify-between rounded-3xl border border-emerald-300/80 bg-gradient-to-b from-emerald-50/90 to-emerald-100/40 p-7 sm:p-8 text-slate-900 shadow-md">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-emerald-800 uppercase font-bold">
                    <span
                      aria-hidden="true"
                      className="size-2 animate-pulse rounded-full bg-emerald-600"
                    />
                    KPI Tata Kelola
                  </p>
                  <p className="mt-2 text-xl font-bold text-emerald-950">
                    Yang diukur, bukan yang diklaim.
                  </p>
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {GOVERNANCE_KPIS.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 border-t border-emerald-200/80 pt-2.5 text-xs sm:text-sm text-slate-800 font-medium"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-600"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 5 Pillars Cards */}
        <Reveal className="mt-8" y={24}>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <li
                  key={pillar.title}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-xs transition-all duration-300 hover:border-emerald-300 hover:shadow-md hover:bg-white group backdrop-blur-sm"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-emerald-700 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-2xs">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="text-base font-bold text-slate-950">
                    {pillar.title}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {pillar.desc}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

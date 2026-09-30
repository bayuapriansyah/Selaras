import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

const SESSIONS: (8 | 2)[] = [8, 8, 8, 8, 8, 8, 8, 8, 2, 2];

export function Problem() {
  return (
    <section
      id="masalah"
      aria-labelledby="problem-title"
      className="bg-white py-20 lg:py-28 border-b border-slate-200 text-slate-900 relative overflow-hidden"
    >
      {/* Ambient glows — tension/risk palette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 w-[520px] h-[400px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.03) 55%, transparent 75%)",
          filter: "blur(48px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[440px] h-[440px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.02) 55%, transparent 75%)",
          filter: "blur(44px)",
        }}
      />
      {/* Decorative concentric arcs — top right corner */}
      <svg
        aria-hidden="true"
        viewBox="0 0 260 260"
        className="pointer-events-none absolute -top-10 -right-10 w-[260px] h-[260px] opacity-[0.055] z-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="260" cy="0" r="80" stroke="rgb(51,65,85)" strokeWidth="1" />
        <circle cx="260" cy="0" r="120" stroke="rgb(51,65,85)" strokeWidth="0.8" />
        <circle cx="260" cy="0" r="160" stroke="rgb(51,65,85)" strokeWidth="0.6" />
        <circle cx="260" cy="0" r="200" stroke="rgb(51,65,85)" strokeWidth="0.5" />
        <circle cx="260" cy="0" r="240" stroke="rgb(51,65,85)" strokeWidth="0.4" />
      </svg>

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">01 / Problem</span>
            <div className="h-px w-12 bg-slate-200" />
          </div>
          <SectionHeading
            id="problem-title"
            title={
              <>
                A claim tells what was billed.
                <br />
                <span className="text-sky-600">
                  SELARAS reconstructs what happened.
                </span>
              </>
            }
            lead="Data pelayanan faskes tersebar di berbagai sistem silo. Ketika klaim diaudit, BPJS dan faskes harus menyusun ulang bukti dari awal. SELARAS memvalidasi bukti secara deterministik sebelum diajukan."
            size="md"
          />
        </div>

        <Reveal className="mt-12" y={26}>

          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:grid-cols-2">
            {/* Left: Billed Claim */}
            <div className="border-b border-slate-100 p-6 sm:p-8 lg:border-r lg:border-b-0 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs tracking-[0.2em] text-slate-500 uppercase font-medium">
                  Billed Claim
                </p>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-2xs">
                  Klaim Konvensional
                </span>
              </div>
              <p className="mt-5 text-6xl leading-none font-bold tracking-tight text-slate-950 sm:text-7xl">
                10
              </p>
              <p className="mt-3 text-base text-slate-600">
                Physiotherapy Sessions diajukan ke BPJS
              </p>

              <div
                className="mt-7 flex gap-1.5"
                role="img"
                aria-label="Sepuluh sesi klaim, seluruhnya diajukan"
              >
                {SESSIONS.map((_, index) => (
                  <span
                    key={index}
                    className="h-10 flex-1 rounded-md bg-slate-200 border border-slate-300/60"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-3 font-mono text-[11px] tracking-wider text-slate-400 uppercase">
                Semua sesi diklaim tanpa diferensiasi bukti
              </p>
            </div>

            {/* Right: Service Evidence Verified */}
            <div className="p-6 sm:p-8 bg-white">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs tracking-[0.2em] text-sky-700 uppercase font-semibold">
                  Service Evidence Verified
                </p>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-[10px] text-sky-800 font-medium">
                  SELARAS Engine
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-5xl sm:text-6xl leading-none font-bold tracking-tight text-emerald-600">
                    8
                  </p>
                  <p className="mt-2.5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-800">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-emerald-500"
                    />
                    Fully Supported
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-5xl sm:text-6xl leading-none font-bold tracking-tight text-amber-600">
                    2
                  </p>
                  <p className="mt-2.5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-800">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-amber-500"
                    />
                    Need Review
                  </p>
                </div>
              </div>

              <div
                className="mt-6 flex gap-1.5"
                role="img"
                aria-label="Sepuluh sesi: delapan didukung bukti, dua perlu ditinjau"
              >
                {SESSIONS.map((state, index) => (
                  <span
                    key={index}
                    className={
                      state === 8
                        ? "h-10 flex-1 rounded-md bg-emerald-500 border border-emerald-600/30"
                        : "h-10 flex-1 rounded-md bg-amber-400 border border-amber-500/30"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-3 font-mono text-[11px] tracking-wider text-slate-500 uppercase">
                Rekonstruksi deterministik bukti klinis per sesi
              </p>
            </div>
          </div>
        </Reveal>

        {/* 3-Column Bento Breakdown with Checklist Illustration */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Reveal y={20} delay={0.05}>
            <div className="h-full rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-xs backdrop-blur-sm flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  01 · Silo Fragmentasi
                </span>
                <h4 className="mt-2 text-base font-semibold text-slate-900">
                  Data Tersebar & Sulit Ditautkan
                </h4>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Data absensi mesin, catatan medis dokter, dan sistem billing RS tersimpan di server terpisah tanpa relasi kriptografis.
                </p>
              </div>
              <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-800">
                <span className="font-semibold">Akibat:</span> Rekayasa klaim (ghost billing & service bundling) lolos dari deteksi awal.
              </div>
            </div>
          </Reveal>

          <Reveal y={20} delay={0.1}>
            <div className="h-full rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/50 to-white p-6 shadow-md shadow-sky-500/5 backdrop-blur-sm flex flex-col items-center justify-between text-center relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 size-40 rounded-full bg-sky-400/15 blur-2xl"
              />
              <div className="relative z-10 w-full">
                <span className="font-mono text-xs font-semibold text-sky-700 uppercase tracking-wider">
                  02 · Verifikasi Deterministik
                </span>
                <h4 className="mt-1.5 text-base font-semibold text-slate-900">
                  Checklist Bukti Lapis Ganda
                </h4>
              </div>

              <div className="my-3 w-full max-w-[180px] transition-transform duration-300 hover:scale-105">
                <img
                  src="/illustrations/checklist.svg"
                  alt="Ilustrasi audit checklist verifikasi bukti pelayanan"
                  className="w-full h-auto drop-shadow-xs"
                  loading="lazy"
                />
              </div>

              <div className="w-full rounded-xl border border-sky-100 bg-white/90 p-3 text-left text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Biometrik Kehadiran</span>
                  <span className="font-mono text-emerald-600 font-semibold">✓ Cocok</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Audit Trail Timestamp</span>
                  <span className="font-mono text-emerald-600 font-semibold">✓ Sinkron</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal y={20} delay={0.15}>
            <div className="h-full rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-xs backdrop-blur-sm flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  03 · Rekonsiliasi Otomatis
                </span>
                <h4 className="mt-2 text-base font-semibold text-slate-900">
                  Audit Siap Uji Kapan Saja
                </h4>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Tidak ada lagi perdebatan manual antara verifikator BPJS dan manajemen faskes karena fakta pelayanan terbukti secara matematis.
                </p>
              </div>
              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-800">
                <span className="font-semibold">Hasil:</span> Klaim sah cair lebih cepat, potensi sengketa dan penolakan turun drastis.
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-8 flex flex-wrap items-center gap-3" y={14}>
          <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-100 px-3 font-mono text-[10px] tracking-wider text-slate-600 uppercase">
            ✦ Synthetic Demonstration
          </span>
          <p className="text-xs sm:text-sm text-slate-500">
            Angka pada visualisasi ini adalah ilustrasi Golden Case untuk evaluasi integritas pelayanan fisioterapi.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

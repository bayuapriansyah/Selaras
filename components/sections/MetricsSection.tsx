import { Info } from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

type Metric = {
  name: string;
  formula: string;
  desc: string;
};

const PRODUCT_KPIS: Metric[] = [
  {
    name: "Evidence Coverage",
    formula: "supported units / claimed units",
    desc: "Berapa bagian layanan yang memiliki bukti lengkap.",
  },
  {
    name: "Median Review Time",
    formula: "median(open → decision)",
    desc: "Waktu median dari kasus dibuka sampai keputusan review.",
  },
  {
    name: "Reconstruction Time",
    formula: "time to understand one episode",
    desc: "Waktu yang dibutuhkan reviewer memahami satu episode.",
  },
  {
    name: "Gap Detection Rate",
    formula: "correct gaps / injected gaps",
    desc: "Celah sintetis yang berhasil ditemukan terhadap total celah yang disuntikkan.",
  },
  {
    name: "False Positive Rate",
    formula: "wrong flags / normal cases",
    desc: "Kasus normal yang keliru ditandai perlu review.",
  },
];

const GOVERNANCE_KPIS: Metric[] = [
  {
    name: "Provenance coverage",
    formula: "claims with provenance / total claims",
    desc: "Klaim yang seluruh buktinya membawa asal-usul.",
  },
  {
    name: "Explanation grounding",
    formula: "AI explanations linked to evidence / total",
    desc: "Penjelasan AI yang tertaut ke bukti nyata.",
  },
  {
    name: "Human actor rate",
    formula: "decisions with human actor / total decisions",
    desc: "Keputusan review yang memiliki aktor manusia.",
  },
  {
    name: "Audit completeness",
    formula: "required events logged / required events",
    desc: "Peristiwa wajib yang tercatat pada audit log.",
  },
];

function MetricRow({ metric }: { metric: Metric }) {
  return (
    <li className="grid gap-1.5 border-t border-hairline py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
      <div>
        <p className="text-sm font-semibold text-ink">{metric.name}</p>
        <p className="mt-1 font-mono text-[11px] break-all text-forest-800">
          {metric.formula}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-ash">{metric.desc}</p>
    </li>
  );
}

export function MetricsSection() {
  return (
    <section
      id="measurement"
      aria-labelledby="metrics-title"
      className="border-t border-hairline bg-ivory-deep py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <SectionHeading
            id="metrics-title"
            title="How we measure."
            lead="Framework pengukuran disiapkan sejak awal, bukan menyusul setelah ada hasil. Prototype belum memiliki nilai pilot."
            size="md"
            className="max-w-2xl"
          />
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-hairline bg-card px-3 font-mono text-[10px] tracking-[0.14em] text-forest-800 uppercase">
            Measurement Framework
          </span>
        </div>

        <Reveal className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14" y={24}>
          <div>
            <h3 className="font-mono text-[11px] tracking-[0.2em] text-forest-800 uppercase">
              Product KPI
            </h3>
            <ul className="mt-4 border-b border-hairline">
              {PRODUCT_KPIS.map((metric) => (
                <MetricRow key={metric.name} metric={metric} />
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[11px] tracking-[0.2em] text-forest-800 uppercase">
              Governance KPI
            </h3>
            <ul className="mt-4 border-b border-hairline">
              {GOVERNANCE_KPIS.map((metric) => (
                <MetricRow key={metric.name} metric={metric} />
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-hairline bg-card px-5 py-4">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ash" />
          <p className="text-xs leading-relaxed text-ash">
            Seluruh angka yang muncul di halaman ini adalah Synthetic
            Demonstration untuk keperluan prototype. Belum ada hasil pilot,
            implementasi nyata, atau klaim dampak yang terverifikasi.
          </p>
        </div>
      </div>
    </section>
  );
}

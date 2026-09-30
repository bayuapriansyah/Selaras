import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

const STACK = [
  {
    label: "Frontend",
    items: ["Next.js 16", "TypeScript", "Tailwind CSS", "shadcn/ui", "Lucide", "Framer Motion"],
  },
  {
    label: "Backend",
    items: ["Python", "FastAPI", "Pydantic", "SQLAlchemy"],
  },
  {
    label: "Data",
    items: ["PostgreSQL", "Neo4j", "Redis", "S3-compatible storage"],
  },
  {
    label: "AI",
    items: ["LLM API", "Rule engine", "Deterministic analytics", "Optional embeddings"],
  },
  {
    label: "Deployment",
    items: ["Vercel", "Railway / Render", "Supabase", "Neo4j Aura"],
  },
];

function Box({
  title,
  caption,
  emphasis = false,
}: {
  title: string;
  caption?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-2xl border border-sky-600 bg-sky-600 px-5 py-3.5 text-center text-white shadow-md shadow-sky-600/20"
          : "rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-center shadow-xs transition-colors hover:border-sky-300"
      }
    >
      <p
        className={
          emphasis
            ? "text-sm font-semibold text-white"
            : "text-sm font-semibold text-slate-900"
        }
      >
        {title}
      </p>
      {caption ? (
        <p
          className={
            emphasis
              ? "mt-0.5 font-mono text-[10px] tracking-[0.12em] text-sky-100 uppercase"
              : "mt-0.5 font-mono text-[10px] tracking-[0.12em] text-slate-500 uppercase"
          }
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center" aria-hidden="true">
      <span className="h-4 w-px bg-slate-300" />
      {label ? (
        <span className="font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase py-0.5">
          {label}
        </span>
      ) : null}
      <span className="h-4 w-px bg-slate-300" />
      <span className="-mt-px size-1.5 rotate-45 border-r border-t border-slate-400" />
    </div>
  );
}

export function TechnologySection() {
  return (
    <section
      aria-labelledby="tech-title"
      className="border-t border-slate-200/80 bg-gradient-to-b from-white via-slate-50/50 to-white py-20 lg:py-28 text-slate-900 relative overflow-hidden"
    >
      {/* Ambient gradient bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full z-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.12) 0%, rgba(99,102,241,0.03) 60%, transparent 80%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">04 / Architecture</span>
            <div className="h-px w-12 bg-slate-200" />
          </div>
          <SectionHeading
            id="tech-title"
            title="From event capture to traceable claim."
            lead="Arsitektur memisahkan perekaman bukti, penyimpanan graf relasional, dan inferensi audit deterministik. Setiap lapisan dapat diuji mandiri."
            size="md"
          />
        </div>

        <Reveal className="mt-14" y={24}>
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Architecture Pipeline Flow (7 cols) */}
            <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 sm:p-8 lg:col-span-7 shadow-lg shadow-slate-200/50 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Engine Pipeline Flow
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] text-emerald-700 font-semibold">
                  Zero Trust Architecture
                </span>
              </div>

              <div className="mx-auto flex max-w-md flex-col items-stretch">
                <Box title="Web App Client" caption="Next.js 16 · Tailwind · Framer" />
                <Connector label="mTLS / HTTPS" />
                <Box title="API Gateway" caption="FastAPI · Pydantic · OpenAPI" />
                <Connector />
                <div className="grid grid-cols-3 gap-2.5">
                  <Box title="PostgreSQL" caption="Relational" />
                  <Box title="Neo4j" caption="Graph Store" />
                  <Box title="Redis" caption="Event Queue" />
                </div>
                <Connector />
                <Box
                  title="Evidence Engine & Service Passport"
                  caption="Merkle Tree · SHA-256 Provenance"
                  emphasis
                />
                <Connector />
                <div className="grid grid-cols-3 gap-2.5">
                  <Box title="Reconciliation" caption="Billing vs Facts" />
                  <Box title="Risk Engine" caption="Anomaly Scoring" />
                  <Box title="AI Reasoner" caption="Explainable Audit" />
                </div>
              </div>
            </div>

            {/* Right: Stack List + Vector Illustration (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Data Processing SVG Card */}
              <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/40 p-6 shadow-sm flex items-center gap-5">
                <div className="shrink-0 w-28 sm:w-32">
                  <img
                    src="/illustrations/data-processing.svg"
                    alt="Ilustrasi pemrosesan data bukti klinis terstruktur"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                    Pipeline Throughput
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Pemrosesan Realtime &lt; 500ms
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Merekonsiliasi jutaan node episode klaim per jam dengan performa native microservice.
                  </p>
                </div>
              </div>

              {/* Technology Stack Groups */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <dl className="flex flex-col">
                  {STACK.map((group) => (
                    <div
                      key={group.label}
                      className="border-t border-slate-100 py-3.5 first:border-t-0 first:pt-0"
                    >
                      <dt className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-slate-700 uppercase">
                        {group.label}
                      </dt>
                      <dd className="mt-2 flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <span
                            key={item}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 font-medium hover:border-sky-300 transition-colors"
                          >
                            {item}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

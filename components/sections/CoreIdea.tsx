import { ArrowDown, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";

const PIPELINE: { label: string; desc: string; emphasis?: boolean }[] = [
  {
    label: "Claim",
    desc: "Pernyataan atas layanan yang ditagih.",
  },
  {
    label: "Expected Service Footprint",
    desc: "Bukti yang seharusnya terbentuk dari layanan itu.",
  },
  {
    label: "Observed Evidence",
    desc: "Bukti yang benar-benar tercatat pada sistem.",
  },
  {
    label: "Proof Gap",
    desc: "Selisih antara yang diharapkan dan yang teramati.",
  },
  {
    label: "Review",
    desc: "Reviewer memutuskan, dengan bukti di depannya.",
    emphasis: true,
  },
];

export function CoreIdea() {
  return (
    <section
      aria-labelledby="core-title"
      className="border-b border-hairline bg-ivory py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <SectionHeading
          id="core-title"
          title={
            <>
              Claim <span className="text-leaf-600">≠</span> Proof.
            </>
          }
          lead="A claim describes what was billed. Evidence helps show what happened."
        />

        <Reveal className="mt-14" y={24} delay={0.05}>
          <ol
            className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-4"
            aria-label="Dari klaim menuju review"
          >
            {PIPELINE.map((item, index) => (
              <li
                key={item.label}
                className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4"
              >
                <div
                  className={
                    item.emphasis
                      ? "flex flex-1 flex-col gap-2 rounded-2xl bg-forest-900 p-5 text-ivory"
                      : "flex flex-1 flex-col gap-2 border-t-2 border-forest-900/80 pt-4"
                  }
                >
                  <span
                    className={
                      item.emphasis
                        ? "font-mono text-[10.5px] tracking-[0.16em] text-leaf-500 uppercase"
                        : "font-mono text-[10.5px] tracking-[0.16em] text-forest-800 uppercase"
                    }
                  >
                    {item.label}
                  </span>
                  <span
                    className={
                      item.emphasis
                        ? "text-sm leading-relaxed text-ivory/85"
                        : "text-sm leading-relaxed text-ash"
                    }
                  >
                    {item.desc}
                  </span>
                </div>

                {index < PIPELINE.length - 1 ? (
                  <>
                    <ArrowDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 self-center text-ash lg:hidden"
                    />
                    <ArrowRight
                      aria-hidden="true"
                      className="hidden h-4 w-4 shrink-0 self-center text-ash lg:block"
                    />
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="mt-10" y={14} delay={0.1}>
          <span className="inline-flex h-6 items-center rounded-full border border-hairline bg-ivory-deep px-2.5 font-mono text-[10px] tracking-[0.14em] text-ash uppercase">
            Synthetic Demonstration
          </span>
        </Reveal>
      </div>
    </section>
  );
}

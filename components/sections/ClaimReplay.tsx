"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pause, Play, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import { sessionNineReplay } from "@/data/golden-case";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ClaimReplay() {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [gapAlert, setGapAlert] = useState(false);

  const events = sessionNineReplay;
  const finished = !playing && activeIndex >= events.length - 1;

  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(
      () => {
        const next = activeIndex + 1;
        setActiveIndex(next);
        setGapAlert(events[next].state === "gap");
        if (next >= events.length - 1) {
          setPlaying(false);
        }
      },
      gapAlert ? 1500 : 750,
    );

    return () => window.clearTimeout(timer);
  }, [playing, activeIndex, gapAlert, events]);

  const handleToggle = () => {
    if (finished) {
      setActiveIndex(-1);
      setGapAlert(false);
      setPlaying(true);
      return;
    }
    setPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setPlaying(false);
    setGapAlert(false);
    setActiveIndex(-1);
  };

  const progress =
    activeIndex < 0 ? 0 : ((activeIndex + 1) / events.length) * 100;

  return (
    <section
      aria-labelledby="replay-title"
      className="border-y border-hairline bg-ivory py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="replay-title"
            title={
              <>
                Replay the episode.
                <br />
                Not just the claim.
              </>
            }
            lead="Putar ulang jalannya satu episode: dari kedatangan pasien sampai klaim dibuat, event per event."
            size="md"
            className="max-w-3xl"
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={handleToggle}
              className="h-10 rounded-full bg-forest-900 px-5 text-sm font-medium text-ivory hover:bg-forest-800"
            >
              {playing ? (
                <>
                  <Pause aria-hidden="true" />
                  Jeda
                </>
              ) : (
                <>
                  <Play aria-hidden="true" />
                  Replay
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="h-10 rounded-full border-hairline bg-card px-4 text-sm text-ink hover:bg-ivory-deep"
              aria-label="Ulang dari awal"
            >
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        <Reveal className="mt-10" y={24}>
          <div className="rounded-2xl border border-hairline bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
              <span className="font-mono text-[10.5px] tracking-[0.18em] text-forest-800 uppercase">
                Episode Replay · Sesi 09
              </span>
              <span className="font-mono text-[10.5px] tracking-[0.14em] text-ash uppercase">
                {activeIndex < 0
                  ? "Menunggu replay"
                  : finished
                    ? "Replay selesai"
                    : `Event ${activeIndex + 1} / ${events.length}`}
              </span>
            </div>

            <div className="mt-6 overflow-x-auto pb-2">
              <ol className="relative grid min-w-[46rem] grid-cols-7 gap-3">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-0 left-0 h-px bg-hairline"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 left-0 h-px bg-forest-900 transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />

                {events.map((event, index) => {
                  const visible = index <= activeIndex;
                  const current = index === activeIndex;
                  const gap = event.state === "gap";

                  return (
                    <li
                      key={`${event.time}-${event.label}`}
                      aria-hidden={!visible}
                      className={cn(
                        "relative flex flex-col items-center gap-2 text-center transition-all duration-500",
                        visible
                          ? "opacity-100 translate-y-0"
                          : "opacity-25 translate-y-1",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-3 rounded-[3px] transition-colors duration-300",
                          !visible
                            ? "bg-hairline"
                            : gap
                              ? "bg-review"
                              : "bg-forest-900",
                          current && "ring-4 ring-leaf-500/30",
                        )}
                      />
                      <span className="mt-2 font-mono text-xs text-ash">
                        {event.time}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          visible
                            ? gap
                              ? "text-review"
                              : "text-ink"
                            : "text-ash",
                        )}
                      >
                        {event.label}
                      </span>
                      <span className="text-xs leading-snug text-ash">
                        {visible ? event.detail : "\u00A0"}
                      </span>
                      {gap ? (
                        <span className="font-mono text-[10.5px] tracking-[0.12em] text-review uppercase">
                          Evidence gap
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-5 min-h-[3.25rem] border-t border-hairline pt-4">
              <AnimatePresence mode="wait" initial={false}>
                {gapAlert ? (
                  <motion.div
                    key="gap"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="flex items-start gap-3 rounded-2xl border border-review/30 bg-review-soft px-4 py-3"
                    role="status"
                  >
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-review"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-review">
                        Evidence Gap Detected
                      </span>
                      <span className="mt-0.5 block text-sm text-review/90">
                        Event treatment tidak ditemukan pada episode ini.
                        Replay berhenti sejenak agar reviewer melihatnya.
                      </span>
                    </span>
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={reduce ? undefined : { opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    className="text-sm text-ash"
                  >
                    {activeIndex < 0
                      ? "Tekan Replay untuk menjalankan urutan event pelayanan."
                      : finished
                        ? "Replay selesai. Seluruh event berhasil ditampilkan."
                        : "Menjalankan event berikutnya…"}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

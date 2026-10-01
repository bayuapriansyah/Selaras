"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { ReplayEvent } from "@/data/golden-case";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function EpisodeTimeline({
  events,
  className,
  delayStep = 0.12,
}: {
  events: ReplayEvent[];
  className?: string;
  delayStep?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <ol
      className={cn(
        "relative flex flex-col gap-0 border-l border-sky-600/30 pl-5 sm:pl-6",
        className,
      )}
      aria-label="Timeline episode pelayanan"
    >
      {events.map((event, index) => {
        const gap = event.state === "gap";

        return (
          <motion.li
            key={`${event.time}-${event.label}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: EASE,
              delay: reduce ? 0 : index * delayStep,
            }}
            className="relative flex items-start gap-3 py-3"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-5 -left-[calc(1.25rem+4px)] size-2 rounded-full sm:-left-[calc(1.5rem+4px)]",
                gap
                  ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
              )}
            />
            <span className="w-12 shrink-0 font-mono text-xs text-sky-700 font-medium pt-0.5">
              {event.time}
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-sm font-semibold",
                    gap ? "text-amber-800" : "text-slate-900",
                  )}
                >
                  {event.label}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {event.detail}
                </span>
              </span>
              {gap ? (
                <TriangleAlert
                  aria-label="Celah evidence"
                  className="size-4 shrink-0 text-amber-600"
                />
              ) : (
                <CheckCircle2
                  aria-label="Didukung bukti"
                  className="size-4 shrink-0 text-emerald-600"
                />
              )}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}

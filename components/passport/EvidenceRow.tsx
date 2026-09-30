"use client";

import { motion } from "motion/react";
import { CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { revealChild } from "@/lib/motion";
import type { EvidenceState } from "@/data/passport";

const STATE_STYLE: Record<
  EvidenceState,
  { label: string; Icon: typeof CheckCircle2; icon: string; text: string }
> = {
  supported: {
    label: "Supported",
    Icon: CheckCircle2,
    icon: "text-leaf-600",
    text: "text-forest-800",
  },
  gap: {
    label: "Evidence gap",
    Icon: TriangleAlert,
    icon: "text-review",
    text: "text-review",
  },
  pending: {
    label: "Pending",
    Icon: CircleDashed,
    icon: "text-ash",
    text: "text-ash",
  },
};

export function EvidenceRow({
  label,
  state,
  className,
  onDark = false,
}: {
  label: string;
  state: EvidenceState;
  className?: string;
  onDark?: boolean;
}) {
  const config = STATE_STYLE[state];
  const { Icon } = config;

  return (
    <motion.li
      variants={revealChild}
      className={cn("flex items-center justify-between gap-3 py-2.5", className)}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            onDark
              ? state === "supported"
                ? "text-emerald-400"
                : state === "gap"
                  ? "text-amber-400"
                  : "text-white/40"
              : config.icon,
          )}
        />
        <span
          className={cn(
            "truncate text-xs sm:text-sm font-medium",
            onDark
              ? state === "supported"
                ? "text-white/90"
                : state === "gap"
                  ? "text-amber-200"
                  : "text-white/50"
              : config.text,
          )}
        >
          {label}
        </span>
      </span>
      <span
        className={cn(
          "font-mono text-[10px] tracking-[0.12em] uppercase shrink-0",
          onDark ? "text-white/50" : "text-ash",
        )}
      >
        {config.label}
      </span>
    </motion.li>
  );
}

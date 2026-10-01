"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { staggerGroup } from "@/lib/motion";
import type { PassportData } from "@/data/passport";
import { PassportStatusBadge } from "@/components/passport/PassportStatusBadge";
import { EvidenceRow } from "@/components/passport/EvidenceRow";

type ServicePassportCardProps = {
  data: PassportData;
  className?: string;
  coverage?: number | MotionValue<number>;
  reveal?: boolean;
  footer?: ReactNode;
  theme?: "dark" | "light";
};

function CoverageTrack({
  value,
  tone = "brand",
}: {
  value: number | MotionValue<number>;
  tone?: "brand" | "onDark";
}) {
  const track =
    tone === "onDark" ? "bg-white/12" : "bg-slate-200/80";
  const fill = tone === "onDark" ? "bg-leaf-500" : "bg-sky-600";

  if (typeof value === "number") {
    return (
      <div
        className={cn("h-1.5 w-full overflow-hidden rounded-full", track)}
        role="presentation"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", fill)}
          style={{ width: `${value}%` }}
        />
      </div>
    );
  }

  return <MotionCoverageTrack value={value} track={track} fill={fill} />;
}

function MotionCoverageTrack({
  value,
  track,
  fill,
}: {
  value: MotionValue<number>;
  track: string;
  fill: string;
}) {
  const width = useTransform(value, (v) => `${Math.max(0, Math.min(100, v))}%`);

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", track)}>
      <motion.div className={cn("h-full rounded-full", fill)} style={{ width }} />
    </div>
  );
}

function CoverageValue({ value }: { value: number | MotionValue<number> }) {
  if (typeof value === "number") {
    return <>{Math.round(value)}%</>;
  }
  return <MotionCoverageValue value={value} />;
}

function MotionCoverageValue({ value }: { value: MotionValue<number> }) {
  const text = useTransform(value, (v) => `${Math.round(Math.max(0, Math.min(100, v)))}%`);
  return <motion.span>{text}</motion.span>;
}

export function ServicePassportCard({
  data,
  className,
  coverage,
  reveal = false,
  footer,
  theme = "dark",
}: ServicePassportCardProps) {
  const reduce = useReducedMotion();
  const coverValue = coverage ?? data.coverage;
  const shouldReveal = reveal && !reduce;
  const isDark = theme === "dark";

  return (
    <article
      className={cn(
        "relative w-full overflow-hidden rounded-2xl transition-all duration-300",
        isDark
          ? "border border-sky-400/20 bg-[#02152b] text-white shadow-[0_12px_40px_rgba(0,10,24,0.6)] backdrop-blur-xl"
          : "border border-slate-200/90 bg-white text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        className,
      )}
      aria-label={`Service Passport ${data.id}`}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 px-5 py-3.5 border-b",
          isDark
            ? "bg-[#02152b] border-white/10"
            : "bg-slate-50/90 border-slate-100",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 rounded-full animate-pulse",
              isDark ? "bg-sky-400/70" : "bg-sky-600",
            )}
          />
          <span
            className={cn(
              "font-mono text-[10.5px] font-semibold tracking-[0.2em] uppercase",
              isDark ? "text-sky-200" : "text-sky-700",
            )}
          >
            Service Passport
          </span>
        </div>
        <PassportStatusBadge status={data.status} onDark={isDark} />
      </header>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-base sm:text-lg font-bold tracking-tight",
                isDark ? "text-white" : "text-slate-950",
              )}
            >
              {data.service}
            </p>
            <p
              className={cn(
                "mt-0.5 font-mono text-xs",
                isDark ? "text-sky-300/70" : "text-slate-500",
              )}
            >
              {data.id}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium",
              isDark
                ? "border-sky-400/20 bg-sky-950/50 text-sky-200/80"
                : "border-slate-200 bg-slate-100 text-slate-600",
            )}
          >
            {data.window}
          </span>
        </div>

        <dl
          className={cn(
            "mt-4 grid grid-cols-2 gap-3 rounded-xl border p-3",
            isDark
              ? "border-white/10 bg-[#031830]/50"
              : "border-slate-100 bg-slate-50/80",
          )}
        >
          <div>
            <dt
              className={cn(
                "font-mono text-[10px] tracking-[0.14em] uppercase",
                isDark ? "text-white/50" : "text-slate-500",
              )}
            >
              Pasien
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-mono text-xs sm:text-sm font-medium truncate",
                isDark ? "text-white" : "text-slate-900",
              )}
            >
              {data.patient}
            </dd>
          </div>
          <div>
            <dt
              className={cn(
                "font-mono text-[10px] tracking-[0.14em] uppercase",
                isDark ? "text-white/50" : "text-slate-500",
              )}
            >
              Provider
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-mono text-xs sm:text-sm font-medium truncate",
                isDark ? "text-white" : "text-slate-900",
              )}
            >
              {data.provider}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between">
          <span
            className={cn(
              "font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase",
              isDark ? "text-white/70" : "text-slate-600",
            )}
          >
            Evidence Trail
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[10px]",
              isDark
                ? "bg-white/10 text-sky-200"
                : "bg-slate-200/70 text-slate-700",
            )}
          >
            {data.evidence.length} cek
          </span>
        </div>

        <motion.ul
          className={cn(
            "mt-2 divide-y rounded-xl border px-3 overflow-hidden",
            isDark
              ? "divide-white/10 border-white/10 bg-[#031830]/30"
              : "divide-slate-100 border-slate-100 bg-slate-50/40",
          )}
          initial={shouldReveal ? "hidden" : false}
          animate={shouldReveal ? "show" : undefined}
          variants={staggerGroup(0.08, 0.15)}
        >
          {data.evidence.map((item) => (
            <EvidenceRow key={item.id} label={item.label} state={item.state} onDark={isDark} />
          ))}
        </motion.ul>

        <div
          className={cn(
            "mt-4 border-t pt-4",
            isDark ? "border-white/10" : "border-slate-100",
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "font-mono text-[10.5px] tracking-[0.14em] uppercase",
                isDark ? "text-white/60" : "text-slate-500",
              )}
            >
              Coverage
            </span>
            <span
              className={cn(
                "font-mono text-sm font-bold",
                isDark ? "text-emerald-400" : "text-emerald-600",
              )}
            >
              <CoverageValue value={coverValue} />
            </span>
          </div>
          <div className="mt-2">
            <CoverageTrack value={coverValue} tone={isDark ? "onDark" : "brand"} />
          </div>
        </div>

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </article>
  );
}

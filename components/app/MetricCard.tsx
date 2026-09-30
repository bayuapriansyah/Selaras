import * as React from "react";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

const TONES = {
  default: "bg-white text-slate-900 border-slate-200",
  sky: "bg-sky-50/70 text-sky-900 border-sky-200/80",
  emerald: "bg-emerald-50/70 text-emerald-900 border-emerald-200/80",
  amber: "bg-amber-50/70 text-amber-900 border-amber-200/80",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
} as const;

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md",
        TONES[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
          {label}
        </p>
        <Icon aria-hidden="true" className="size-4 opacity-70" />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

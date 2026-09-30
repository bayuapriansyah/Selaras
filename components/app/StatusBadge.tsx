import * as React from "react";
import { cn } from "cn";
import type {
  ClaimStatus,
  PassportStatus,
  SessionStatus,
} from "@/data/app/types";

type AnyStatus = ClaimStatus | SessionStatus | PassportStatus;

const TONES: Record<AnyStatus, { label: string; cls: string }> = {
  SUPPORTED: {
    label: "SUPPORTED",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  "NEEDS REVIEW": {
    label: "NEEDS REVIEW",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  INCOMPLETE: {
    label: "INCOMPLETE",
    cls: "border-slate-200 bg-slate-100 text-slate-600",
  },
  CONTRADICTED: {
    label: "CONTRADICTED",
    cls: "border-red-200 bg-red-50 text-red-700",
  },
  "NEEDS CLARIFICATION": {
    label: "NEEDS CLARIFICATION",
    cls: "border-sky-200 bg-sky-50 text-sky-700",
  },
  DRAFT: {
    label: "DRAFT",
    cls: "border-slate-200 bg-slate-100 text-slate-500",
  },
  ACTIVE: {
    label: "ACTIVE",
    cls: "border-sky-200 bg-sky-50 text-sky-700",
  },
  COMPLETE: {
    label: "COMPLETE",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const DOT: Record<AnyStatus, string> = {
  SUPPORTED: "bg-emerald-500",
  "NEEDS REVIEW": "bg-amber-500",
  INCOMPLETE: "bg-slate-400",
  CONTRADICTED: "bg-red-500",
  "NEEDS CLARIFICATION": "bg-sky-500",
  DRAFT: "bg-slate-400",
  ACTIVE: "bg-sky-500",
  COMPLETE: "bg-emerald-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const tone = TONES[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11px] font-medium tracking-wider whitespace-nowrap",
        tone.cls,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", DOT[status])}
      />
      {tone.label}
    </span>
  );
}

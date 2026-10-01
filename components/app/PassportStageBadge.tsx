import { cn } from "cn";
import type { PassportNextAction, PassportStage } from "@/lib/app/rules";

const STAGE_TONE: Record<PassportStage, string> = {
  INCOMPLETE: "border-slate-300 bg-slate-50 text-slate-600",
  "PARTIALLY SUPPORTED": "border-amber-200 bg-amber-50 text-amber-700",
  SUPPORTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const STAGE_LABEL: Record<PassportStage, string> = {
  INCOMPLETE: "BELUM LENGKAP",
  "PARTIALLY SUPPORTED": "SEBAGIAN DIDUKUNG",
  SUPPORTED: "DIDUKUNG",
};

const ACTION_LABEL: Record<PassportNextAction, string> = {
  "CAPTURE TREATMENT": "CATAT TREATMENT",
  "CAPTURE COMPLETION": "CATAT COMPLETION",
  "LENGKAPI EVIDENCE": "LENGKAPI EVIDENCE",
};

export function PassportStageBadge({ stage }: { stage: PassportStage }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px] font-medium tracking-wider",
        STAGE_TONE[stage],
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function PassportNextActionChip({
  action,
}: {
  action: PassportNextAction;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 font-mono text-[11px] font-medium tracking-wider text-sky-700">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-sky-500" />
      {ACTION_LABEL[action]}
    </span>
  );
}

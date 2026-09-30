import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  PencilLine,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PassportStatus } from "@/data/passport";

type Config = {
  label: string;
  soft: string;
  onDark: string;
  Icon: LucideIcon;
};

const STATUS_CONFIG: Record<PassportStatus, Config> = {
  DRAFT: {
    label: "Draft",
    soft: "border-hairline bg-ivory-deep text-ash",
    onDark: "border-white/25 bg-white/10 text-ivory/85",
    Icon: PencilLine,
  },
  ACTIVE: {
    label: "Active",
    soft: "border-leaf-500/30 bg-leaf-100 text-forest-800",
    onDark:
      "border-leaf-500/40 bg-leaf-500/15 text-leaf-100 shadow-[0_0_10px_rgba(16,185,129,0.35)]",
    Icon: Activity,
  },
  COMPLETE: {
    label: "Complete",
    soft: "border-leaf-500/30 bg-leaf-100 text-forest-800",
    onDark:
      "border-leaf-500/40 bg-leaf-500/15 text-leaf-100 shadow-[0_0_10px_rgba(16,185,129,0.35)]",
    Icon: CheckCircle2,
  },
  SUPPORTED: {
    label: "Supported",
    soft: "border-forest-900 bg-forest-900 text-ivory",
    onDark: "border-ivory/25 bg-ivory text-forest-900",
    Icon: BadgeCheck,
  },
  INCOMPLETE: {
    label: "Incomplete",
    soft: "border-review/25 bg-review-soft text-review",
    onDark: "border-review/50 bg-review/20 text-[#fde6c4]",
    Icon: TriangleAlert,
  },
  REVIEW: {
    label: "Review",
    soft: "border-review/25 bg-review-soft text-review",
    onDark: "border-review/50 bg-review/20 text-[#fde6c4]",
    Icon: ScanSearch,
  },
  VERIFIED: {
    label: "Verified",
    soft: "border-forest-900 bg-forest-900 text-ivory",
    onDark: "border-ivory/25 bg-ivory text-forest-900",
    Icon: ShieldCheck,
  },
};

export function PassportStatusBadge({
  status,
  onDark = false,
  className,
}: {
  status: PassportStatus;
  onDark?: boolean;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] font-medium tracking-[0.14em] uppercase",
        onDark ? config.onDark : config.soft,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };

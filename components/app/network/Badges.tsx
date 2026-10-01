import * as React from "react";
import { cn } from "cn";
import {
  PROPOSAL_STATUS_LABEL,
  SEVERITY_LABEL,
  SIGNATURE_STATUS_LABEL,
  type ProposalStatus,
  type SignatureSeverity,
  type SignatureStatus,
} from "@/data/app/network";

const SIGNATURE_TONE: Record<SignatureStatus, string> = {
  VALIDATED: "border-sky-200 bg-sky-50 text-sky-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MONITORED: "border-amber-200 bg-amber-50 text-amber-700",
  UPDATED: "border-teal-200 bg-teal-50 text-teal-700",
  RETIRED: "border-slate-200 bg-slate-50 text-slate-500",
};

const PROPOSAL_TONE: Record<ProposalStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  REVISION_REQUESTED: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
};

const SEVERITY_TONE: Record<SignatureSeverity, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  HIGH: "border-red-200 bg-red-50 text-red-700",
};

function Chip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wider",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: SignatureStatus }) {
  return (
    <Chip label={SIGNATURE_STATUS_LABEL[status]} className={SIGNATURE_TONE[status]} />
  );
}

export function ProposalBadge({ status }: { status: ProposalStatus }) {
  return (
    <Chip label={PROPOSAL_STATUS_LABEL[status]} className={PROPOSAL_TONE[status]} />
  );
}

export function SeverityBadge({ severity }: { severity: SignatureSeverity }) {
  return (
    <Chip label={SEVERITY_LABEL[severity]} className={SEVERITY_TONE[severity]} />
  );
}

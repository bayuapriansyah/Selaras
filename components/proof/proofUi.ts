import type {
  ClaimTraceStatus,
  ConformanceStatus,
  ProofDimensionVerdict,
  ProofEventType,
  ProofState,
  TriangulationOutcome,
} from "@/data/app/proof";
import {
  PROOF_STATE_LABEL,
  PROOF_VERDICT_LABEL,
  TRIANGULATION_OUTCOME_LABEL,
} from "@/data/app/proof";
import type { Role } from "@/data/app/types";
import { ROLE_LABEL } from "@/lib/app/actions";

/** Verdict dimensi — token & glyph sesuai kontrak Proof View. */
export const VERDICT_UI: Record<
  ProofDimensionVerdict,
  { glyph: string; token: string; label: string; chip: string; dot: string }
> = {
  PASS: {
    glyph: "✓",
    token: "PASS",
    label: PROOF_VERDICT_LABEL.PASS,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  GAP: {
    glyph: "⚠",
    token: "GAP",
    label: PROOF_VERDICT_LABEL.GAP,
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  CONFLICT: {
    glyph: "✕",
    token: "CONFLICT",
    label: PROOF_VERDICT_LABEL.CONFLICT,
    chip: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  UNKNOWN: {
    glyph: "—",
    token: "UNKNOWN",
    label: PROOF_VERDICT_LABEL.UNKNOWN,
    chip: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
  },
};

export const STATE_UI: Record<
  ProofState,
  { chip: string; dot: string; note: string }
> = {
  REGISTERED: {
    chip: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
    note: "Klaim tercatat, belum terikat ke check-in.",
  },
  IDENTITY_BOUND: {
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    note: "Identitas pasien terikat pada sesi layanan.",
  },
  ATTESTED: {
    chip: "border-sky-300 bg-sky-100 text-sky-800",
    dot: "bg-sky-600",
    note: "Bukti ditandatangani — menunggu dukungan silang.",
  },
  CORROBORATED: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    note: "Seluruh dimensi terpenuhi — siap diseal.",
  },
  SEALED: {
    chip: "border-emerald-400 bg-emerald-600 text-white",
    dot: "bg-white",
    note: "Proof diseal — transisi selanjutnya terkunci.",
  },
  PROOF_GAP: {
    chip: "border-amber-300 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    note: "Ada bukti wajib yang belum lengkap — perlu tindak lanjut.",
  },
  INCONSISTENT: {
    chip: "border-red-300 bg-red-50 text-red-700",
    dot: "bg-red-500",
    note: "Terdapat ketidakcocokan antar bukti — perlu penjelasan.",
  },
};

export const CONFORMANCE_UI: Record<ConformanceStatus, string> = {
  CONFORMANT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DEVIATED: "border-amber-200 bg-amber-50 text-amber-700",
  MISSING_STAGE: "border-amber-200 bg-amber-50 text-amber-700",
  OUT_OF_ORDER: "border-red-200 bg-red-50 text-red-700",
};

export const TRACE_UI: Record<ClaimTraceStatus | "PENDING", string> = {
  TRACEABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LINKAGE_GAP: "border-amber-200 bg-amber-50 text-amber-700",
  PENDING: "border-slate-200 bg-slate-50 text-slate-500",
};

export const TRIANGULATION_UI: Record<TriangulationOutcome, string> = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-500",
  AGREE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  CONFLICT: "border-red-200 bg-red-50 text-red-700",
};

export const PROOF_EVENT_LABEL: Record<ProofEventType, string> = {
  IDENTITY_BOUND: "Identitas terikat",
  SERVICE_STARTED: "Layanan dimulai",
  SERVICE_ANCHORED: "Service anchor tercatat",
  EVIDENCE_RECORDED: "Evidence direkam",
  SERVICE_COMPLETED: "Layanan selesai",
  PROOF_ASSESSED: "Proof dinilai",
  PROOF_SEALED: "Proof diseal",
  EVIDENCE_UPDATED: "Evidence diperbarui",
  PROVENANCE_RECORDED: "Provenance direkam",
};

export function stateLabel(state: ProofState): string {
  return PROOF_STATE_LABEL[state] ?? state;
}

export function triangulationLabel(outcome: TriangulationOutcome | undefined) {
  return outcome ? TRIANGULATION_OUTCOME_LABEL[outcome] : "—";
}

export function roleLabel(role: Role | undefined): string {
  return role ? (ROLE_LABEL[role] ?? role) : "Sistem";
}

/** Referensi ditampilkan pendek; nilai penuh tetap tersimpan di data. */
export function shortRef(value: string | undefined): string {
  if (!value) return "—";
  if (value.length <= 18) return value;
  return `${value.slice(0, 12)}…${value.slice(-4)}`;
}

export const SECTIONS = {
  claim: "Ringkasan klaim",
  state: "Status proof",
  passport: "Attested service passport",
  dimensions: "Ringkasan 7 dimensi proof",
  stream: "Live proof stream",
  trace: "Jejak klaim",
  conformance: "Conformance",
  provenance: "Provenance trail",
  gaps: "Celah dan ketidaksesuaian",
  triangulation: "Triangulasi bukti",
} as const;

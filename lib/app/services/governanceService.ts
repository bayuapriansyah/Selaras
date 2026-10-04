import {
  signatureSeeds,
  type NetworkCondition,
  type RiskSignature,
  type SignatureHistoryRecord,
  type SignatureMatch,
  type SignatureStatus,
} from "@/data/app/network";
import { EVIDENCE_ORDER, type EvidenceKind, type SignalCode } from "@/data/app/types";
import {
  buildDataSource,
  nowStamp,
  pushAudit,
  uid,
  type PersistedState,
} from "@/lib/app/appState";
import { allMatches, conditionLabel, signatureBundle } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import { templates } from "@/data/app/seed";
import type { AuditActor } from "@/lib/app/services/provenanceService";

/**
 * Phase 9 — Signature Monitoring + Governance (reducers murni, tanpa backend).
 *
 * NETWORK MATCH → VERIFICATION → OUTCOME → FEEDBACK → SIGNATURE MONITORING
 * → GOVERNANCE ACTION → UPDATED / RETIRED.
 *
 * Aturan:
 * - Lifecycle enum SignatureStatus TIDAK berubah (§12); proposal lifecycle
 *   tetap terpisah; tidak ada transisi otomatis (semua aksi via manusia).
 * - MONITORED ≠ invalid: hanya menonaktifkan detector (bundle.active hanya
 *   ACTIVE) — matcher TIDAK diubah (§7).
 * - Update TIDAK meng-overwrite versi lama: versi sebelumnya, alasan, siapa,
 *   waktu, kondisi lama, dan snapshot match lama disimpan di signatureHistory
 *   (§8/§10). Retire = soft transition, tidak ada penghapusan (§9).
 * - RBAC reuse permission existing: monitor = reviewClaim (Reviewer/Admin);
 *   update/retire = publishSignature (Admin) (§11).
 * - Audit SIG_MONITORED/SIG_UPDATED/SIG_RETIRED hanya saat aksi governance —
 *   statistik dihitung saat render tanpa audit (§18).
 */

export type GovernanceBlocked =
  | "RBAC"
  | "SIGNATURE_NOT_FOUND"
  | "INVALID_STATUS"
  | "REASON_REQUIRED"
  | "BAD_INPUT"
  | "ALREADY_DONE";

export type GovernanceResult = {
  state: PersistedState;
  record: SignatureHistoryRecord | null;
  blocked?: GovernanceBlocked;
};

export type UpdateSignatureInput = {
  reason: string;
  pattern: string;
  signalNotes: string[];
  detectionConditions: NetworkCondition[];
};

/** Status yang boleh dipantau (§7: ACTIVE → MONITORED). */
export const MONITORABLE: SignatureStatus[] = ["ACTIVE"];
/** Status yang boleh di-update (§6/§13; VALIDATED/RETIRED ditolak). */
export const UPDATABLE: SignatureStatus[] = ["ACTIVE", "MONITORED", "UPDATED"];
/** Status yang boleh dipensiunkan (§9: ACTIVE / MONITORED → RETIRED). */
export const RETIRABLE: SignatureStatus[] = ["ACTIVE", "MONITORED", "UPDATED"];

export function currentSignature(
  state: PersistedState,
  signatureId: string,
): RiskSignature | undefined {
  return signatureBundle(
    signatureSeeds,
    state.proposals,
    state.signatureStatus,
    state.signatureDefinitions,
  ).all.find((s) => s.id === signatureId);
}

/** Evaluasi kondisi signature terhadap src — dipakai sebagai snapshot historis. */
export function snapshotMatches(
  sig: RiskSignature,
  state: PersistedState,
): SignatureMatch[] {
  return allMatches([sig], buildDataSource(state));
}

export function historyOf(
  state: PersistedState,
  signatureId: string,
): SignatureHistoryRecord[] {
  return state.signatureHistory.filter((h) => h.signatureId === signatureId);
}

/**
 * ACTIVE → MONITORED (Reviewer/Admin, reviewClaim). Detector dinonaktifkan
 * (bundle.active hanya ACTIVE), match dibekukan sebagai historis, audit sekali.
 */
export function monitorSignature(
  state: PersistedState,
  signatureId: string,
  actor: AuditActor,
): GovernanceResult {
  if (!can(actor.role, "reviewClaim")) {
    return { state, record: null, blocked: "RBAC" };
  }
  const sig = currentSignature(state, signatureId);
  if (!sig) return { state, record: null, blocked: "SIGNATURE_NOT_FOUND" };
  if (sig.status === "MONITORED" || sig.status === "RETIRED") {
    return { state, record: null, blocked: "ALREADY_DONE" };
  }
  if (!MONITORABLE.includes(sig.status)) {
    return { state, record: null, blocked: "INVALID_STATUS" };
  }
  const record: SignatureHistoryRecord = {
    id: uid("SGH"),
    signatureId,
    kind: "MONITORED",
    version: sig.version,
    previousVersion: sig.version,
    previousStatus: sig.status,
    newStatus: "MONITORED",
    changeReason:
      "Monitoring period — signature dievaluasi (false positive meningkat, pattern berubah, atau perlu recalibration).",
    updatedBy: actor.name,
    updatedAt: nowStamp(),
    previousConditions: sig.detectionConditions,
    previousPattern: sig.pattern,
    snapshotMatches: snapshotMatches(sig, state),
  };
  return {
    state: {
      ...state,
      signatureStatus: { ...state.signatureStatus, [signatureId]: "MONITORED" },
      signatureHistory: [...state.signatureHistory, record],
      audit: pushAudit(
        state.audit,
        {
          action: "SIG_MONITORED",
          entity: "Network",
          entityId: signatureId,
          description: `${sig.id} v${sig.version} dipindahkan ke status DIPANTAU — detector dinonaktifkan selama monitoring; ${record.snapshotMatches.length} match dibekukan sebagai historis.`,
        },
        actor.name,
        actor.role,
      ),
    },
    record,
  };
}

/**
 * Update versi signature (Admin, publishSignature): RS-017 v1 → v2.
 * Versi lama TIDAK ditimpa — tersimpan di signatureHistory (kondisi lama,
 * pola lama, alasan, updatedBy, timestamp) + snapshot match versi lama.
 * Status berubah ke UPDATED (publish ulang via publishSignature = ACTIVE).
 */
export function updateSignature(
  state: PersistedState,
  signatureId: string,
  input: UpdateSignatureInput,
  actor: AuditActor,
): GovernanceResult {
  if (!can(actor.role, "publishSignature")) {
    return { state, record: null, blocked: "RBAC" };
  }
  const sig = currentSignature(state, signatureId);
  if (!sig) return { state, record: null, blocked: "SIGNATURE_NOT_FOUND" };
  const reason = input.reason.trim();
  if (!reason) return { state, record: null, blocked: "REASON_REQUIRED" };
  if (!input.pattern.trim()) {
    return { state, record: null, blocked: "BAD_INPUT" };
  }
  if (!UPDATABLE.includes(sig.status)) {
    return { state, record: null, blocked: "INVALID_STATUS" };
  }
  const nextVersion = sig.version + 1;
  const def: RiskSignature = {
    ...sig,
    pattern: input.pattern.trim(),
    signalNotes: input.signalNotes,
    detectionConditions: input.detectionConditions,
    version: nextVersion,
    status: "UPDATED",
    updatedAt: nowStamp(),
  };
  const record: SignatureHistoryRecord = {
    id: uid("SGH"),
    signatureId,
    kind: "UPDATE",
    version: nextVersion,
    previousVersion: sig.version,
    previousStatus: sig.status,
    newStatus: "UPDATED",
    changeReason: reason,
    updatedBy: actor.name,
    updatedAt: nowStamp(),
    previousConditions: sig.detectionConditions,
    previousPattern: sig.pattern,
    snapshotMatches: snapshotMatches(sig, state),
  };
  return {
    state: {
      ...state,
      signatureDefinitions: {
        ...state.signatureDefinitions,
        [signatureId]: def,
      },
      signatureStatus: { ...state.signatureStatus, [signatureId]: "UPDATED" },
      signatureHistory: [...state.signatureHistory, record],
      audit: pushAudit(
        state.audit,
        {
          action: "SIG_UPDATED",
          entity: "Network",
          entityId: signatureId,
          description: `${sig.id} v${nextVersion} diperbarui (dari v${sig.version}): ${reason}`,
        },
        actor.name,
        actor.role,
      ),
    },
    record,
  };
}

/**
 * ACTIVE / MONITORED / UPDATED → RETIRED (Admin, publishSignature).
 * Soft transition: tidak menghapus signature; match historis, feedback, dan
 * riwayat lifecycle tetap ada; tidak menghasilkan match baru setelahnya.
 */
export function retireSignature(
  state: PersistedState,
  signatureId: string,
  reason: string,
  actor: AuditActor,
): GovernanceResult {
  if (!can(actor.role, "publishSignature")) {
    return { state, record: null, blocked: "RBAC" };
  }
  const sig = currentSignature(state, signatureId);
  if (!sig) return { state, record: null, blocked: "SIGNATURE_NOT_FOUND" };
  const trimmed = reason.trim();
  if (!trimmed) return { state, record: null, blocked: "REASON_REQUIRED" };
  if (sig.status === "RETIRED") {
    return { state, record: null, blocked: "ALREADY_DONE" };
  }
  if (!RETIRABLE.includes(sig.status)) {
    return { state, record: null, blocked: "INVALID_STATUS" };
  }
  const record: SignatureHistoryRecord = {
    id: uid("SGH"),
    signatureId,
    kind: "RETIRED",
    version: sig.version,
    previousVersion: sig.version,
    previousStatus: sig.status,
    newStatus: "RETIRED",
    changeReason: trimmed,
    updatedBy: actor.name,
    updatedAt: nowStamp(),
    previousConditions: sig.detectionConditions,
    previousPattern: sig.pattern,
    snapshotMatches: snapshotMatches(sig, state),
  };
  return {
    state: {
      ...state,
      signatureStatus: { ...state.signatureStatus, [signatureId]: "RETIRED" },
      signatureHistory: [...state.signatureHistory, record],
      audit: pushAudit(
        state.audit,
        {
          action: "SIG_RETIRED",
          entity: "Network",
          entityId: signatureId,
          description: `${sig.id} v${sig.version} dipensiunkan (soft lifecycle): ${trimmed}`,
        },
        actor.name,
        actor.role,
      ),
    },
    record,
  };
}

/* -------------------------------------------------------------------------- */
/* Condition editor — parsing input form update signature (strict validation). */
/* -------------------------------------------------------------------------- */

const SIGNAL_CODE_SET: SignalCode[] = [
  "EVIDENCE_GAP",
  "MISSING_COMPLETION",
  "TIMESTAMP_CONFLICT",
  "DUPLICATE_SESSION",
  "REPEAT_BILLING",
  "BILLING_BEFORE_PASSPORT",
  "PEER_OUTLIER",
];

const TEMPLATE_ID_SET = templates.map((t) => t.id);

/** Nilai teks untuk input form per kondisi (tampilan existing conditionLabel). */
export function conditionInputValue(c: NetworkCondition): string {
  switch (c.kind) {
    case "template":
      return c.templateId;
    case "facility":
      return c.facilityIds.join(", ");
    case "minItems":
      return String(c.n);
    case "sameProviderWindow":
      return String(c.days);
    case "missingEvidence":
      return c.kinds.join(", ");
    case "localSignal":
      return c.code;
    case "sameProviderOverlap":
      return String(c.days ?? 0);
    case "sessionsComplete":
      return "";
  }
}

/**
 * Parse satu baris input → NetworkCondition; null bila tidak valid
 * (template id tidak dikenal, angka di luar rentang, kind tidak dikenal, dst).
 * sessionsComplete read-only (tanpa nilai).
 */
export function parseConditionInput(
  c: NetworkCondition,
  raw: string,
): NetworkCondition | null {
  const v = raw.trim();
  switch (c.kind) {
    case "template":
      return TEMPLATE_ID_SET.includes(v) ? { ...c, templateId: v } : null;
    case "facility": {
      const ids = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0 || ids.some((id) => !/^FAC-\d{2}$/.test(id))) {
        return null;
      }
      return { ...c, facilityIds: ids };
    }
    case "minItems": {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 50) return null;
      return { ...c, n };
    }
    case "sameProviderWindow":
    case "sameProviderOverlap": {
      const days = Number(v);
      if (!Number.isInteger(days) || days < 0 || days > 365) return null;
      return { kind: c.kind, days } as NetworkCondition;
    }
    case "missingEvidence": {
      const kinds = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        kinds.length === 0 ||
        kinds.some((k) => !EVIDENCE_ORDER.includes(k as EvidenceKind))
      ) {
        return null;
      }
      return { ...c, kinds: kinds as EvidenceKind[] };
    }
    case "localSignal":
      return SIGNAL_CODE_SET.includes(v as SignalCode)
        ? { ...c, code: v as SignalCode }
        : null;
    case "sessionsComplete":
      return c;
  }
}

/** Human-readable value untuk riwayat/diff kondisi lama. */
export function conditionDisplay(c: NetworkCondition): string {
  return `${conditionLabel(c)} · ${conditionInputValue(c) || "tanpa nilai"}`;
}

"use client";

import * as React from "react";
import type {
  NetworkCondition,
  RiskSignature,
  SignatureHistoryRecord,
} from "@/data/app/network";
import { SIGNATURE_STATUS_LABEL } from "@/data/app/network";
import { formatDateTime } from "@/lib/app/format";
import { can } from "@/lib/app/permissions";
import { useApp } from "@/components/app/store";
import {
  conditionDisplay,
  conditionInputValue,
  parseConditionInput,
  RETIRABLE,
  UPDATABLE,
  type GovernanceBlocked,
  type UpdateSignatureInput,
} from "@/lib/app/services/governanceService";

/**
 * Phase 9 — GOVERNANCE SIGNATURE section (signature detail).
 *
 * Aksi manusia saja: Reviewer/Admin menandai MONITORED (deteksi nonaktif),
 * Admin meng-update versi (v1 → v2 tanpa overwrite versi lama) atau
 * memensiunkan signature (soft lifecycle, tanpa penghapusan). RBAC reuse
 * permission existing tanpa permission baru (§11).
 */

const BLOCKED_TEXT: Record<GovernanceBlocked, string> = {
  RBAC: "Peran ini tidak berwenang melakukan aksi governance signature.",
  SIGNATURE_NOT_FOUND: "Signature tidak ditemukan.",
  INVALID_STATUS: "Status signature tidak mengizinkan transisi ini.",
  REASON_REQUIRED: "Alasan wajib diisi.",
  BAD_INPUT: "Input tidak valid — periksa kembali isian.",
  ALREADY_DONE: "Transisi ini sudah pernah dilakukan (idempoten).",
};

const HISTORY_KIND_LABEL: Record<
  SignatureHistoryRecord["kind"],
  { label: string; tone: string }
> = {
  MONITORED: {
    label: "DIPANTAU",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  UPDATE: {
    label: "DIPERBARUI",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  RETIRED: {
    label: "DIPENSIUNKAN",
    tone: "border-slate-300 bg-slate-100 text-slate-600",
  },
};

function BlockedNotice({ blocked }: { blocked: GovernanceBlocked }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
    >
      {BLOCKED_TEXT[blocked]}
    </p>
  );
}

export function SignatureGovernancePanel({
  sig,
  history,
}: {
  sig: RiskSignature;
  history: SignatureHistoryRecord[];
}) {
  const { role, monitorSignature, updateSignature, retireSignature } = useApp();
  const canReview = can(role, "reviewClaim");
  const canPublish = can(role, "publishSignature");

  const [mode, setMode] = React.useState<null | "update" | "retire">(null);
  const [blocked, setBlocked] = React.useState<GovernanceBlocked | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [reason, setReason] = React.useState("");
  const [pattern, setPattern] = React.useState("");
  const [signalNotes, setSignalNotes] = React.useState("");
  const [condInputs, setCondInputs] = React.useState<string[]>([]);

  const openUpdate = () => {
    setBlocked(null);
    setFormError(null);
    setReason("");
    setPattern(sig.pattern);
    setSignalNotes(sig.signalNotes.join("\n"));
    setCondInputs(sig.detectionConditions.map(conditionInputValue));
    setMode("update");
  };

  const openRetire = () => {
    setBlocked(null);
    setFormError(null);
    setReason("");
    setMode("retire");
  };

  const submitUpdate = () => {
    const detectionConditions: NetworkCondition[] = [];
    for (let i = 0; i < sig.detectionConditions.length; i++) {
      const parsed = parseConditionInput(
        sig.detectionConditions[i],
        condInputs[i] ?? "",
      );
      if (!parsed) {
        setFormError(
          `Kondisi ${i + 1} tidak valid — periksa kembali isian (${conditionDisplay(sig.detectionConditions[i])}).`,
        );
        return;
      }
      detectionConditions.push(parsed);
    }
    const input: UpdateSignatureInput = {
      reason,
      pattern,
      signalNotes: signalNotes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      detectionConditions,
    };
    const b = updateSignature(sig.id, input);
    if (b) {
      setBlocked(b);
      return;
    }
    setMode(null);
    setBlocked(null);
    setFormError(null);
  };

  const submitRetire = () => {
    const b = retireSignature(sig.id, reason);
    if (b) {
      setBlocked(b);
      return;
    }
    setMode(null);
    setBlocked(null);
    setFormError(null);
  };

  const showMonitor = canReview && sig.status === "ACTIVE";
  const showUpdate =
    canPublish && UPDATABLE.includes(sig.status) && sig.status !== "VALIDATED";
  const showRetire =
    canPublish && RETIRABLE.includes(sig.status) && sig.status !== "RETIRED";
  const showRbacNote = !canReview && !canPublish;

  const retiredReason = React.useMemo(() => {
    const rec = [...history].reverse().find((h) => h.kind === "RETIRED");
    return rec?.changeReason ?? null;
  }, [history]);

  return (
    <section
      aria-label="GOVERNANCE SIGNATURE"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Governance Signature
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Monitoring, pembaruan versi, dan pensiun — aksi manusia dengan jejak
          audit; tidak ada perubahan state otomatis dari statistik.
        </p>
      </div>

      {blocked ? <BlockedNotice blocked={blocked} /> : null}
      {formError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {formError}
        </p>
      ) : null}

      {showRbacNote ? (
        <p
          data-testid="rbac-note"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
        >
          Peran {role === "provider" ? "Provider" : "Operator"} hanya dapat
          membaca konteks jaringan — aksi governance (pantau, perbarui, pensiun)
          tersedia untuk Reviewer dan Admin.
        </p>
      ) : null}

      {/* Lifecycle transitions yang tersedia untuk status saat ini */}
      <div className="flex flex-wrap gap-2">
        {showMonitor ? (
          <button
            type="button"
            aria-label={`Pantau ${sig.id}`}
            onClick={() => {
              const b = monitorSignature(sig.id);
              if (b) setBlocked(b);
              else setBlocked(null);
            }}
            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            TANDAI MONITORED
          </button>
        ) : null}
        {showUpdate ? (
          <button
            type="button"
            aria-label={`Perbarui ${sig.id}`}
            onClick={mode === "update" ? () => setMode(null) : openUpdate}
            className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            {mode === "update" ? "TUTUP FORMULIR" : "PERBARUI VERSI"}
          </button>
        ) : null}
        {showRetire ? (
          <button
            type="button"
            aria-label={`Pensiunkan ${sig.id}`}
            onClick={mode === "retire" ? () => setMode(null) : openRetire}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {mode === "retire" ? "TUTUP FORMULIR" : "PENSIUNKAN"}
          </button>
        ) : null}
      </div>

      {sig.status === "RETIRED" && retiredReason ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Alasan pensiun:</span>{" "}
          {retiredReason}
        </p>
      ) : null}

      {/* Form update — v1 → v2, alasan wajib, tanpa overwrite versi lama. */}
      {mode === "update" ? (
        <form
          aria-label="FORM PEMBARUAN SIGNATURE"
          className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitUpdate();
          }}
        >
          <p className="text-xs text-slate-600">
            Versi berikutnya:{" "}
            <span className="font-mono font-semibold text-slate-900">
              v{sig.version} → v{sig.version + 1}
            </span>{" "}
            — versi lama beserta match historisnya tetap tersimpan di riwayat.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Alasan Pembaruan
            </span>
            <textarea
              aria-label="Alasan pembaruan"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
              placeholder="Mis. false positive meningkat pada pola lama"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Pola Pembaruan
            </span>
            <textarea
              aria-label="Pola pembaruan"
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              rows={2}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Catatan Sinyal (satu per baris)
            </span>
            <textarea
              aria-label="Catatan sinyal (satu per baris)"
              value={signalNotes}
              onChange={(e) => setSignalNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Kondisi Deteksi
            </legend>
            {sig.detectionConditions.map((c, i) => (
              <label key={i} className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-wider text-slate-500">
                  {conditionDisplay(c)}
                </span>
                <input
                  aria-label={`Kondisi ${i + 1}`}
                  value={condInputs[i] ?? ""}
                  disabled={c.kind === "sessionsComplete"}
                  onChange={(e) => {
                    const next = [...condInputs];
                    next[i] = e.target.value;
                    setCondInputs(next);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>
            ))}
          </fieldset>
          <button
            type="submit"
            aria-label={`Simpan versi baru ${sig.id}`}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
          >
            SIMPAN VERSI BARU — v{sig.version + 1}
          </button>
        </form>
      ) : null}

      {/* Form retire — soft lifecycle, alasan wajib. */}
      {mode === "retire" ? (
        <form
          aria-label="FORM PENSIUN SIGNATURE"
          className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitRetire();
          }}
        >
          <p className="text-xs text-slate-600">
            Pensiun = transisi lunak: signature tidak menghasilkan match baru,
            tetapi match historis, feedback, dan riwayat tetap tersimpan.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Alasan Pensiun
            </span>
            <textarea
              aria-label="Alasan pensiun"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            aria-label={`Pensiunkan ${sig.id}`}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
          >
            PENSIUNKAN SIGNATURE
          </button>
        </form>
      ) : null}

      {/* Riwayat versi §8 — setiap transisi + alasan + snapshot kondisi lama. */}
      <div aria-label="RIWAYAT VERSI">
        <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
          Riwayat Versi
        </p>
        {history.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500">
            Belum ada transisi governance untuk signature ini.
          </p>
        ) : (
          <ol className="mt-1.5 flex flex-col gap-2">
            {[...history].reverse().map((h) => (
              <li
                key={h.id}
                data-history-kind={h.kind}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${HISTORY_KIND_LABEL[h.kind].tone}`}
                  >
                    {HISTORY_KIND_LABEL[h.kind].label}
                  </span>
                  <span className="font-mono text-[11px] tracking-wider text-slate-700">
                    v{h.previousVersion} → v{h.version}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {SIGNATURE_STATUS_LABEL[h.previousStatus]} →{" "}
                    {SIGNATURE_STATUS_LABEL[h.newStatus]}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-700">{h.changeReason}</p>
                <p className="mt-1 font-mono text-[10px] tracking-wider text-slate-400">
                  {h.updatedBy} · {formatDateTime(h.updatedAt)}
                </p>
                {h.kind === "UPDATE" ? (
                  <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
                    <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                      Pola Sebelumnya
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      {h.previousPattern}
                    </p>
                    <p className="mt-1 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                      Kondisi Sebelumnya
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {h.previousConditions.map((c, i) => (
                        <li
                          key={i}
                          className="font-mono text-[10px] text-slate-600"
                        >
                          {conditionDisplay(c)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="mt-1.5 font-mono text-[10px] tracking-wider text-slate-400">
                  SNAPSHOT MATCH: {h.snapshotMatches.length}
                  {h.snapshotMatches.length > 0
                    ? ` (${h.snapshotMatches.map((m) => m.claimId).join(", ")})`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { Button } from "@/components/ui/button";
import {
  ADAPTIVE_ACTION,
  ADAPTIVE_LEVEL_LABEL,
  NETWORK_SIMULATION_LABEL,
  type VerificationResult,
} from "@/data/app/network";
import { EVIDENCE_LABEL } from "@/data/app/types";
import { view as claimView } from "@/lib/app/services/claimService";
import * as networkSvc from "@/lib/app/services/networkService";
import { allMatches, conditionLabel, facilityNodeLabel } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import { formatDateTime } from "@/lib/app/format";

const RESULT_OPTIONS: {
  value: VerificationResult;
  label: string;
  tone: string;
}[] = [
  {
    value: "PASS",
    label: "LOLOS · episode unik & lengkap",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  {
    value: "NEEDS_CLARIFICATION",
    label: "PERLU KLARIFIKASI · minta bukti",
    tone: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
  {
    value: "HUMAN_REVIEW",
    label: "TINJAUAN MANUSIA · eskalasi reviewer",
    tone: "border-red-300 bg-red-50 text-red-800 hover:bg-red-100",
  },
];

const RESULT_TEXT: Record<string, string> = {
  PASS: "lolos",
  NEEDS_CLARIFICATION: "perlu klarifikasi",
  HUMAN_REVIEW: "tinjauan manusia",
};

const OUTCOME_TEXT: Record<string, string> = {
  CONFIRMED: "pola dikonfirmasi",
  CLEARED: "klaim bersih",
  FALSE_POSITIVE: "false positive",
  NEEDS_MORE_DATA: "perlu data lebih",
};

export function ClaimNetworkPanel({ claimId }: { claimId: string }) {
  const {
    src,
    role,
    statusOf,
    networkRuntime,
    startVerification,
    completeVerification,
    proposeSignature,
  } = useApp();

  const [startedKey, setStartedKey] = React.useState<string | null>(null);
  const [resultNote, setResultNote] = React.useState("");
  const [showPropose, setShowPropose] = React.useState(false);
  const [proposeDone, setProposeDone] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    pattern: "",
    severity: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    control: "",
  });

  const claim = React.useMemo(() => claimView(claimId, src), [claimId, src]);
  const net = React.useMemo(
    () =>
      claim
        ? networkSvc.claimNetwork(claim, networkRuntime, src)
        : {
            matches: [],
            level: "LEVEL1" as const,
            action: ADAPTIVE_ACTION.LEVEL1,
          },
    [claim, networkRuntime, src],
  );
  const feedbacks = React.useMemo(
    () =>
      networkRuntime.feedbacks.filter((f) => f.claimId === claimId),
    [networkRuntime.feedbacks, claimId],
  );
  const pendingHits = React.useMemo(() => {
    if (net.matches.length > 0) return [];
    const queue = networkSvc.publishQueue(networkRuntime, src);
    return queue.filter((sig) =>
      allMatches([sig], src).some((m) => m.claimId === claimId),
    );
  }, [net.matches.length, claimId, networkRuntime, src]);

  if (!claim) return null;

  if (net.level === "LEVEL1" && net.matches.length === 0 && pendingHits.length === 0) {
    return null;
  }

  const localStatus = statusOf(claimId, claim.baseStatus);
  const activeMatch = net.matches[0];
  const latest = feedbacks[0];
  const showVerify = activeMatch != null;
  const gap = claim.baseStatus !== "SUPPORTED";
  const actionReason =
    pendingHits.length > 0
      ? "Match menunggu publikasi — signature jaringan belum aktif"
      : net.matches.length > 0 && gap
        ? "Match jaringan aktif dan status lokal belum lengkap"
        : net.matches.length > 0
          ? "Match jaringan aktif — status lokal lengkap"
          : gap
            ? "Status lokal belum lengkap — tanpa match jaringan"
            : "Status lokal lengkap — tanpa match jaringan";

  return (
    <section
      aria-label="Ringkasan jaringan"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Network aria-hidden="true" className="size-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            Status jaringan — verifikasi adaptif
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-600">
          {NETWORK_SIMULATION_LABEL}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
            Status lokal
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {localStatus}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Dihitung mesin klaim — tidak berubah
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-3",
            net.matches.length > 0
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white",
          )}
        >
          <p className="text-[11px] font-medium tracking-[0.12em] text-amber-700 uppercase">
            Status jaringan
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {ADAPTIVE_LEVEL_LABEL[net.level]}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            {net.matches.length > 0
              ? `${net.matches.length} match: ${net.matches
                  .map((m) => m.signatureId)
                  .join(", ")}`
              : pendingHits.length > 0
                ? `${pendingHits.length} match menunggu publikasi`
                : "Tidak ada match aktif"}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-[11px] font-medium tracking-[0.12em] text-sky-700 uppercase">
            Rekomendasi aksi
          </p>
          <p className="mt-1 text-sm font-semibold text-sky-900">
            {ADAPTIVE_ACTION[net.level]}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">{actionReason}</p>
        </div>
      </div>

      {net.matches.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-[11px] font-semibold tracking-wider text-amber-800 uppercase">
            Rincian match
          </p>
          {net.matches.map((m) => {
            const sig = networkSvc.signatureById(
              m.signatureId,
              networkRuntime,
              src,
            );
            return (
              <div key={m.key} className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-slate-900">
                  <Link
                    href={`/app/network/signatures/${m.signatureId}`}
                    className="font-mono text-sky-700 underline-offset-2 hover:underline"
                  >
                    {m.signatureId}
                  </Link>{" "}
                  — {sig?.name ?? "Risk Signature"} ·{" "}
                  {facilityNodeLabel(m.facilityId)}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {m.matchedConditions.map((c, i) => (
                    <li
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] text-amber-900"
                    >
                      <Check aria-hidden="true" className="size-3" />
                      {conditionLabel(c)}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-600">
                  Rekomendasi: {sig?.recommendedControl ?? net.action}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {showVerify && !latest ? (
        startedKey === activeMatch.key ? (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
              Hasil verifikasi step-up
            </p>
            <input
              type="text"
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              placeholder="Catatan verifikasi (opsional)"
              aria-label="Catatan verifikasi"
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-sky-400"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-label={`Hasil ${opt.value}`}
                  onClick={() => {
                    completeVerification(
                      activeMatch.key,
                      claimId,
                      activeMatch.signatureId,
                      opt.value,
                      resultNote.trim() || undefined,
                    );
                    setStartedKey(null);
                    setResultNote("");
                  }}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                    opt.tone,
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Button
            type="button"
            aria-label="Mulai verifikasi jaringan"
            onClick={() => {
              startVerification(
                activeMatch.key,
                claimId,
                activeMatch.signatureId,
              );
              setStartedKey(activeMatch.key);
            }}
            className="w-full rounded-full border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 sm:w-auto"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            MULAI VERIFIKASI — {activeMatch.signatureId}
          </Button>
        )
      ) : null}

      {latest ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div>
            <p className="text-xs font-semibold text-emerald-900">
              Verifikasi {RESULT_TEXT[latest.result] ?? latest.result} —{" "}
              {OUTCOME_TEXT[latest.outcome] ?? latest.outcome}
            </p>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-emerald-700">
              {latest.signatureId} · {latest.by} · {formatDateTime(latest.at)}
              {latest.note ? ` · ${latest.note}` : ""}
            </p>
          </div>
          <Link
            href="/app/network/matches"
            className="text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
          >
            Lihat semua match →
          </Link>
        </div>
      ) : null}

      {pendingHits.length > 0 && net.matches.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-xs text-sky-900">
            {pendingHits
              .map((s) => s.id)
              .join(", ")}{" "}
            cocok dengan klaim ini tetapi belum aktif — menunggu publikasi.
          </p>
          <Link
            href="/app/network/publish"
            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            Ke antrean publikasi →
          </Link>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-3">
        {proposeDone ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs text-emerald-900">
              Proposal <span className="font-mono">{proposeDone}</span> tercatat
              sebagai USULAN.
            </p>
            <Link
              href="/app/network/publish"
              className="text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
            >
              Buka kotak masuk tata kelola →
            </Link>
          </div>
        ) : null}

        {can(role, "proposeSignature") ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-expanded={showPropose}
              aria-label="Usulkan Risk Signature"
              onClick={() => setShowPropose((v) => !v)}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <Sparkles aria-hidden="true" className="size-3.5" />
              Usulkan Risk Signature dari klaim ini
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-3.5 transition-transform",
                  showPropose && "rotate-180",
                )}
              />
            </button>

            {showPropose ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name.trim() || !form.pattern.trim()) return;
                  const id = proposeSignature({
                    name: form.name.trim(),
                    pattern: form.pattern.trim(),
                    detectionConditions: [
                      { kind: "template", templateId: claim.template.id },
                      {
                        kind: "facility",
                        facilityIds: [claim.claim.facilityId],
                      },
                    ],
                    signalNotes: ["diusulkan dari tinjauan klaim manual"],
                    requiredEvidence: claim.template.required.map(
                      (k) => EVIDENCE_LABEL[k],
                    ),
                    recommendedControl:
                      form.control.trim() ||
                      "Verifikasi step-up manual oleh reviewer",
                    severity: form.severity,
                    serviceScope: `${claim.template.name} · ${
                      facilityNodeLabel(claim.claim.facilityId)
                    }`,
                    originClaimId: claimId,
                    originFacilityId: claim.claim.facilityId,
                  });
                  setProposeDone(id);
                  setShowPropose(false);
                  setForm({ name: "", pattern: "", severity: "MEDIUM", control: "" });
                }}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
                  Nama pola
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Contoh: Repeated Episode Window"
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-400"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
                  Pola (apa yang dicurigai)
                  <textarea
                    required
                    rows={2}
                    value={form.pattern}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pattern: e.target.value }))
                    }
                    placeholder="Jelaskan pola risiko yang terlihat dari klaim ini…"
                    className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-400"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
                    Tingkat risiko
                    <select
                      value={form.severity}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          severity: e.target.value as typeof form.severity,
                        }))
                      }
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                      <option value="LOW">Rendah</option>
                      <option value="MEDIUM">Sedang</option>
                      <option value="HIGH">Tinggi</option>
                    </select>
                  </label>
                  <label className="min-w-0 flex-1 flex-col gap-1 text-[11px] font-medium text-slate-600">
                    Rekomendasi kontrol
                    <input
                      type="text"
                      value={form.control}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, control: e.target.value }))
                      }
                      placeholder="Opsional — verifikasi step-up bawaan"
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-400"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    Kondisi otomatis: template {claim.template.name} + faskes{" "}
                    {facilityNodeLabel(claim.claim.facilityId)}
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-full"
                    aria-label="Kirim proposal Risk Signature"
                  >
                    <Send aria-hidden="true" className="size-3.5" />
                    Usulkan
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}

        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Lapisan jaringan hanya menambah rekomendasi. Skor, status klaim, dan
          antrean prioritas reviewer tetap sama seperti sebelumnya.
        </p>
      </div>
    </section>
  );
}

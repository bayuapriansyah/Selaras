"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge, SeverityBadge } from "@/components/app/network/Badges";
import { PrivacyBoundary } from "@/components/app/network/PrivacyBoundary";
import { entries as auditEntries } from "@/lib/app/services/auditService";
import { conditionLabel, facilityNodeLabel } from "@/lib/app/network";
import { can } from "@/lib/app/permissions";
import { formatDateTime } from "@/lib/app/format";
import * as networkSvc from "@/lib/app/services/networkService";

export default function SignatureDetailPage() {
  const params = useParams<{ id: string }>();
  const signatureId = params.id;
  const { src, role, networkRuntime, publishSignature } = useApp();
  const [published, setPublished] = React.useState(false);

  const sig = React.useMemo(
    () => networkSvc.signatureById(signatureId, networkRuntime, src),
    [signatureId, networkRuntime, src],
  );
  const matches = React.useMemo(() => {
    if (!sig || sig.status !== "ACTIVE") return [];
    return networkSvc
      .activeMatches(networkRuntime, src)
      .filter((m) => m.signatureId === sig.id);
  }, [sig, networkRuntime, src]);

  const audit = React.useMemo(() => {
    return auditEntries(src).filter(
      (e) => e.entity === "Network" && e.entityId === signatureId,
    );
  }, [src, signatureId]);

  if (!sig) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Risk Signature ${signatureId}`}
          description="Signature tidak ditemukan di registry."
        />
        <Link
          href="/app/network/signatures"
          className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
        >
          ← Kembali ke registry
        </Link>
      </div>
    );
  }

  const canPublish =
    can(role, "publishSignature") &&
    (sig.status === "VALIDATED" || sig.status === "MONITORED") &&
    !published;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/app/network/signatures"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Risk Signature Registry
      </Link>

      <PageHeader
        title={`${sig.id} — ${sig.name}`}
        description={sig.whyItMatters}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={sig.severity} />
            <StatusBadge status={sig.status} />
            <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
              v{sig.version}
            </span>
            {canPublish ? (
              <button
                type="button"
                aria-label={`Publish ${sig.id} ke jaringan`}
                onClick={() => {
                  publishSignature(sig.id);
                  setPublished(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <Send aria-hidden="true" className="size-3.5" />
                Publish ke jaringan
              </button>
            ) : null}
            {published || sig.status === "ACTIVE" ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 text-xs font-medium text-emerald-800">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {published ? "Terpublikasi — status ACTIVE" : "Sudah aktif"}
              </span>
            ) : null}
          </div>
        }
      />

      <section
        aria-label="Definisi pola"
        className="grid gap-4 lg:grid-cols-2"
      >
        <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
              Pattern
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">
              {sig.pattern}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
              Detection conditions
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {sig.detectionConditions.map((c, i) => (
                <li
                  key={i}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700"
                >
                  {conditionLabel(c)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
              Recommended control
            </p>
            <p className="mt-1 text-sm text-slate-800">{sig.recommendedControl}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                Required evidence
              </p>
              <ul className="mt-1 flex flex-col gap-1 text-xs text-slate-700">
                {sig.requiredEvidence.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                Signal notes
              </p>
              <ul className="mt-1 flex flex-col gap-1 text-xs text-slate-700">
                {sig.signalNotes.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
              Governance
            </p>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Dibuat oleh</dt>
                <dd className="font-medium text-slate-900">{sig.createdBy}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Divalidasi</dt>
                <dd className="font-medium text-slate-900">
                  {sig.validatedBy ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">
                  {formatDateTime(sig.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last update</dt>
                <dd className="font-medium text-slate-900">
                  {formatDateTime(sig.updatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Service scope</dt>
                <dd className="font-medium text-slate-900">{sig.serviceScope}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Origin faskes</dt>
                <dd className="font-medium text-slate-900">
                  {sig.originFacilityId
                    ? facilityNodeLabel(sig.originFacilityId)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">False positive rate</dt>
                <dd className="font-medium text-slate-900">
                  {sig.falsePositiveRate !== undefined
                    ? `${sig.falsePositiveRate}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Retired reason</dt>
                <dd className="font-medium text-slate-900">
                  {sig.retiredReason ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
              Riwayat audit signature
            </p>
            {audit.length === 0 ? (
              <p className="mt-1.5 text-xs text-slate-500">
                Belum ada entri audit untuk signature ini.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {audit.slice(0, 8).map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-xs text-slate-800">{e.description}</p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-wider text-slate-400">
                      {e.action} · {e.role} · {formatDateTime(e.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>

      <section aria-label="Aktivitas jaringan" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Aktivitas jaringan
        </h2>
        {sig.status !== "ACTIVE" ? (
          <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
            Signature belum ACTIVE — match akan muncul setelah publikasi.
            {sig.status === "VALIDATED"
              ? " Seorang Admin dapat mempublikasikannya dari tombol di atas."
              : ""}
          </p>
        ) : matches.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Signature aktif tetapi belum ada match di 4 faskes simulasi.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((m) => (
              <article
                key={m.key}
                aria-label={`Match ${m.claimId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-wider text-slate-500">
                    {m.claimId} · {facilityNodeLabel(m.facilityId)}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {m.matchedConditions.length} kondisi terpenuhi
                  </p>
                </div>
                <Link
                  href={`/app/claims/${m.claimId}`}
                  className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  Buka klaim + adaptive verification →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <PrivacyBoundary />
    </div>
  );
}

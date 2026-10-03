"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  Play,
  Share2,
  Stamp,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { ClaimTraceChain } from "@/components/proof/ClaimTraceChain";
import { ConformancePanel } from "@/components/proof/ConformancePanel";
import { ProofDimensions } from "@/components/proof/ProofDimensions";
import { ProofGapList } from "@/components/proof/ProofGapList";
import {
  ProofPassportCard,
  type PassportEntry,
} from "@/components/proof/ProofPassportCard";
import { ProofStateRail } from "@/components/proof/ProofStateRail";
import { ProofStream } from "@/components/proof/ProofStream";
import { ProvenancePanel } from "@/components/proof/ProvenancePanel";
import { TriangulationPanel } from "@/components/proof/TriangulationPanel";
import { SECTIONS } from "@/components/proof/proofUi";
import { GOLDEN_CLAIM_ID } from "@/data/app/seed";
import { getFacility, getProvider } from "@/lib/app/selectors";
import { formatDateTime, periodLabel } from "@/lib/app/format";
import { view as claimView } from "@/lib/app/services/claimService";
import {
  previewProof,
  proofEventsOf,
} from "@/lib/app/services/proofService";

export default function ProofOverviewPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  const { src, state, statusOf, assessProof, sealProof } = useApp();

  const view = React.useMemo(() => claimView(claimId, src), [claimId, src]);
  const proof = React.useMemo(() => previewProof(state, claimId), [
    state,
    claimId,
  ]);
  const events = React.useMemo(
    () => proofEventsOf(state, claimId, src),
    [state, claimId, src],
  );
  const serviceIds = React.useMemo(
    () =>
      new Set(
        src.services.filter((s) => s.claimId === claimId).map((s) => s.id),
      ),
    [src, claimId],
  );
  const provenance = React.useMemo(
    () =>
      state.provenance
        .filter(
          (r) => r.resourceId === claimId || serviceIds.has(r.resourceId),
        )
        .sort((a, b) => b.version - a.version),
    [state.provenance, serviceIds, claimId],
  );
  const anchors = React.useMemo(
    () => state.anchors.filter((a) => serviceIds.has(a.serviceId)),
    [state.anchors, serviceIds],
  );
  const recordedState = state.proofStates[claimId];
  const record = state.proofAssessments[claimId];

  const [notice, setNotice] = React.useState<string | null>(null);

  if (!view) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Klaim tidak ditemukan
        </h1>
        <p className="text-sm text-slate-500">
          ID <span className="font-mono">{claimId}</span> tidak ada di data.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/app/claims">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Antrean tinjauan
          </Link>
        </Button>
      </div>
    );
  }

  const { claim, template, patient, sessions, baseStatus } = view;
  const facility = getFacility(claim.facilityId);
  const status = statusOf(claimId, baseStatus);
  const assessment = proof?.assessment;
  const liveState = assessment?.state ?? recordedState;
  const sealedRecord = provenance.find((r) => r.action === "SEAL");

  const entries: PassportEntry[] = sessions.map((s) => ({
    serviceId: s.service.id,
    patient: patient?.display ?? claim.patientId,
    service: template.name,
    provider:
      getProvider(s.service.providerId)?.name ?? s.service.providerId ?? "—",
    facility: facility?.name ?? claim.facilityId,
    href: `/app/passport/${s.service.id}`,
  }));

  function runAssess() {
    assessProof(claimId);
    setNotice(
      "Penilaian proof tersimpan — proof stream dan audit trail diperbarui.",
    );
  }

  function runSeal() {
    const ok = sealProof(claimId);
    setNotice(
      ok
        ? "Proof diseal — provenance dan integrity reference tercatat."
        : "Evaluator belum mengizinkan transisi ke SEALED — proof harus berada di CORROBORATED.",
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/app/claims/${claimId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Klaim {claimId}
        </Link>
      </div>

      <PageHeader
        title={`Proof ${claim.id}`}
        description={`Proof overview · ${template.name} · ${
          patient?.display ?? claim.patientId
        } · ${facility?.name ?? claim.facilityId} · ${periodLabel(
          claim.periodFrom,
          claim.periodTo,
        )} · ${sessions.length} sesi${
          claimId === GOLDEN_CLAIM_ID ? " · kasus emas" : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/claims/${claimId}/replay`}>
                <Play aria-hidden="true" className="size-3.5" />
                Replay
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/claims/${claimId}/graph`}>
                <Share2 aria-hidden="true" className="size-3.5" />
                Graf
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/app/passport/${sessions[0]?.service.id ?? ""}`}>
                <FileCheck2 aria-hidden="true" className="size-3.5" />
                Passport sesi 1
              </Link>
            </Button>
          </div>
        }
      />

      <section
        aria-label={SECTIONS.claim}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Klaim", claim.id],
            ["Pasien", patient?.display ?? claim.patientId],
            ["Layanan", template.name],
            ["Faskes", facility?.name ?? claim.facilityId],
            ["Periode", periodLabel(claim.periodFrom, claim.periodTo)],
            ["Sesi", `${sessions.length} episode`],
            ["Status klaim", status],
            ["Diperbarui", formatDateTime(claim.lastUpdated)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                {k}
              </p>
              <p className="mt-1 text-sm font-semibold break-words text-slate-800">
                {v}
              </p>
            </div>
          ))}
        </div>
      </section>

      {liveState ? (
        <ProofStateRail
          state={liveState}
          recorded={recordedState}
          sealedIndicators={
            liveState === "SEALED" && assessment
              ? {
                  evidence: assessment.dimensions.every(
                    (d) => d.verdict === "PASS",
                  ),
                  provenance: sealedRecord?.action === "SEAL",
                  integrity: !!sealedRecord?.integrityRef,
                }
              : undefined
          }
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 p-5">
          <p className="text-sm font-medium text-slate-600">
            Evaluasi proof belum tersedia untuk klaim ini.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pastikan sesi layanan tertaut, lalu tekan Nilai proof.
          </p>
        </section>
      )}

      <section
        aria-label="Kontrol proof"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Kontrol proof
            </h2>
            <p className="text-xs text-slate-500">
              Aksi eksplisit — menulis penilaian/segel beserta jejak auditnya.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="rounded-full"
              disabled={!assessment}
              onClick={runAssess}
            >
              <ClipboardCheck aria-hidden="true" className="size-3.5" />
              Nilai proof
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              disabled={liveState !== "CORROBORATED"}
              onClick={runSeal}
            >
              <Stamp aria-hidden="true" className="size-3.5" />
              Segel proof
            </Button>
          </div>
        </div>
        {notice ? (
          <p
            role="status"
            className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900"
          >
            {notice}
          </p>
        ) : null}
      </section>

      <section
        aria-label="Penilaian proof"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Penilaian proof
            </h2>
            <p className="text-xs text-slate-500">
              Hasil tersimpan dari evaluator — bukan skor baru.
            </p>
          </div>
          {record ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-700">
              TERSEMAP {record.assessedAt}
            </span>
          ) : (
            <span
              data-testid="assessment-record"
              className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-600"
            >
              NOT YET ASSESSED
            </span>
          )}
        </div>

        {record ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              ["ASSESSED AT", record.assessedAt],
              ["MODEL", `v${record.modelVersion}`],
              ["STATE", record.state],
              ["GAPS", String(record.gaps.length)],
              ["KONFLIK", String(record.conflicts.length)],
              ["TRIANGULASI", record.triangulation ?? "—"],
              ["TRACE", record.traceStatus ?? "—"],
              ["CONFORMANCE", record.conformance?.status ?? "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
              >
                <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                  {k}
                </dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold break-words text-slate-700">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500">
            Belum ada penilaian tersimpan untuk klaim ini. Tekan{" "}
            <span className="font-semibold text-slate-700">Nilai proof</span>{" "}
            untuk menyimpan evaluasi terkini beserta jejak auditnya.
          </p>
        )}

        {record?.stale ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            Evidence berubah setelah penilaian terakhir — tekan Nilai proof untuk
            memperbarui.
          </p>
        ) : null}
      </section>

      <ProofPassportCard entries={entries} state={liveState ?? "REGISTERED"} />

      {assessment ? (
        <ProofDimensions dimensions={assessment.dimensions} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <TriangulationPanel
          outcome={assessment?.triangulation}
          witnesses={proof?.witnesses ?? []}
        />
        <ConformancePanel
          conformance={assessment?.conformance}
          workflows={proof?.workflows ?? []}
        />
      </div>

      <ClaimTraceChain
        trace={proof?.trace}
        status={assessment?.traceStatus ?? "PENDING"}
        graphHref={`/app/claims/${claimId}/graph`}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ProofGapList
          gaps={assessment?.gaps ?? []}
          conflicts={assessment?.conflicts ?? []}
        />
        <ProvenancePanel records={provenance} anchors={anchors} />
      </div>

      <ProofStream events={events} provenance={provenance} />

      <nav
        aria-label="Tautan terkait"
        className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"
      >
        <Link
          href={`/app/claims/${claimId}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Detail klaim
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
        <Link
          href={`/app/claims/${claimId}/replay`}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Episode replay
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
        <Link
          href={`/app/claims/${claimId}/graph`}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Graf bukti
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
        <Link
          href={`/app/audit-log`}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Audit log
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </nav>
    </div>
  );
}

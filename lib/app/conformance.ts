import type {
  ConformanceResult,
  ConformanceStage,
  ConformanceWorkflow,
  WorkflowStage,
} from "@/data/app/proof";
import {
  CONFORMANCE_STAGE_LABEL,
  CONFORMANCE_STAGE_ORDER,
} from "@/data/app/proof";
import type { EvidenceKind, Service } from "@/data/app/types";

/**
 * Temporal conformance — DOMAIN EVALUATION ONLY (Phase 3).
 * Membandingkan EXPECTED (CONFORMANCE_STAGE_ORDER) vs ACTUAL events per sesi.
 * Hasil conformance TIDAK masuk ke score.ts / signals.ts / claimView (off hot path).
 */

const STAGE_FOR_EVIDENCE: Record<EvidenceKind, ConformanceStage | null> = {
  arrival: "CHECK_IN",
  provider: null,
  treatment: "TREATMENT",
  note: "DOCUMENTATION",
  completion: "COMPLETION",
  billing: "BILLING",
  claim: "CLAIM",
};

function stageTime(service: Service, stage: ConformanceStage): string | undefined {
  if (stage === "SERVICE_START") {
    return service.events.find((e) => e.kind === "start")?.at;
  }
  const kind = (Object.keys(STAGE_FOR_EVIDENCE) as EvidenceKind[]).find(
    (k) => STAGE_FOR_EVIDENCE[k] === stage,
  );
  if (!kind) return undefined;
  const item = service.evidence.find((e) => e.kind === kind);
  return item?.state === "present" ? item.at : undefined;
}

export function buildConformanceWorkflow(
  claimId: string,
  service: Service,
  createdAt: string,
): ConformanceWorkflow {
  const stages: WorkflowStage[] = CONFORMANCE_STAGE_ORDER.map((stage) => {
    const at = stageTime(service, stage);
    return at
      ? { stage, status: "DONE" as const, at }
      : { stage, status: "PENDING" as const };
  });
  return {
    id: `CFM-${service.id}`,
    claimId,
    serviceId: service.id,
    stages,
    windowStart: service.startTime,
    windowEnd: service.endTime,
    createdAt,
  };
}

const label = (stage: ConformanceStage) =>
  CONFORMANCE_STAGE_LABEL[stage] ?? stage;

const sessionOf = (workflow: ConformanceWorkflow) =>
  workflow.serviceId.slice(-2);

/**
 * Urutan tahapan dicek ketat terhadap timestamp "HH:MM" (zero-padded,
 * perbandingan leksikokal = perbandingan kronologis).
 * Prioritas: MISSING_STAGE > OUT_OF_ORDER > DEVIATED > CONFORMANT.
 */
export function evaluateConformance(
  workflows: ConformanceWorkflow[],
): ConformanceResult {
  const missing: ConformanceStage[] = [];
  const outOfOrder: ConformanceStage[] = [];
  const orderReasons: string[] = [];
  const deviateReasons: string[] = [];

  for (const wf of workflows) {
    const ses = sessionOf(wf);
    for (const st of wf.stages) {
      if (st.status !== "DONE") {
        if (!missing.includes(st.stage)) missing.push(st.stage);
        orderReasons.push(
          `Sesi ${ses}: tahapan ${label(st.stage)} belum tercatat`,
        );
      }
    }
  }

  if (missing.length > 0) {
    return {
      status: "MISSING_STAGE",
      missing,
      outOfOrder: [],
      reasons: orderReasons,
    };
  }

  for (const wf of workflows) {
    const ses = sessionOf(wf);
    for (let i = 0; i < CONFORMANCE_STAGE_ORDER.length - 1; i++) {
      const a = wf.stages[i];
      const b = wf.stages[i + 1];
      if (!a?.at || !b?.at) continue;
      if (a.at > b.at) {
        if (!outOfOrder.includes(b.stage)) outOfOrder.push(b.stage);
        orderReasons.push(
          `Sesi ${ses}: ${label(b.stage)} (${b.at}) tercatat sebelum ${label(a.stage)} (${a.at})`,
        );
      }
    }
  }

  if (outOfOrder.length > 0) {
    return { status: "OUT_OF_ORDER", missing, outOfOrder, reasons: orderReasons };
  }

  for (const wf of workflows) {
    const ses = sessionOf(wf);
    for (const st of wf.stages) {
      if (st.status !== "DONE" || !st.at) continue;
      if (wf.windowStart && st.at < wf.windowStart) {
        deviateReasons.push(
          `Sesi ${ses}: ${label(st.stage)} (${st.at}) tercatat sebelum jendela layanan (${wf.windowStart})`,
        );
      }
      if (wf.windowEnd && st.at > wf.windowEnd) {
        deviateReasons.push(
          `Sesi ${ses}: ${label(st.stage)} (${st.at}) tercatat setelah jendela layanan (${wf.windowEnd})`,
        );
      }
    }
  }

  if (deviateReasons.length > 0) {
    return {
      status: "DEVIATED",
      missing,
      outOfOrder,
      reasons: deviateReasons,
    };
  }

  return { status: "CONFORMANT", missing: [], outOfOrder: [], reasons: [] };
}

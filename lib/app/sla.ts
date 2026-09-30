import { APP_TODAY } from "@/data/app/seed";
import type { EvidenceKind, Service } from "@/data/app/types";
import { EVIDENCE_LABEL } from "@/data/app/types";
import type { DataSource } from "@/lib/app/selectors";
import { getPatient, getProvider, getTemplate } from "@/lib/app/selectors";

export const SLA_LEAD_DAYS = 1;

export type SlaStage = "H-1" | "H-0" | "LATE";

export const SLA_STAGE_LABEL: Record<SlaStage, string> = {
  "H-1": "H-1 · jatuh tempo besok",
  "H-0": "H-0 · jatuh tempo hari ini",
  LATE: "LATE · terlambat",
};

export type SlaTask = {
  serviceId: string;
  date: string;
  due: string;
  stage: SlaStage;
  escalated: boolean;
  missing: EvidenceKind[];
  missingLabels: string[];
  patient: string;
  provider: string;
  template: string;
  servicePoint: string;
  claimId?: string;
};

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function missingKinds(service: Service): EvidenceKind[] {
  const template = getTemplate(service.templateId);
  return template.required.filter(
    (k) => !service.evidence.find((e) => e.kind === k && e.state === "present"),
  );
}

const STAGE_RANK: Record<SlaStage, number> = { LATE: 0, "H-0": 1, "H-1": 2 };

export function slaTasks(src: DataSource): SlaTask[] {
  return src.services
    .map((service): SlaTask | null => {
      const missing = missingKinds(service);
      if (missing.length === 0) return null;
      const due = addDays(service.date, SLA_LEAD_DAYS);
      const stage: SlaStage =
        due < APP_TODAY ? "LATE" : due === APP_TODAY ? "H-0" : "H-1";
      const template = getTemplate(service.templateId);
      return {
        serviceId: service.id,
        date: service.date,
        due,
        stage,
        escalated: stage === "LATE",
        missing,
        missingLabels: missing.map((k) => EVIDENCE_LABEL[k]),
        patient: getPatient(service.patientId)?.display ?? service.patientId,
        provider: getProvider(service.providerId)?.name ?? service.providerId,
        template: template.name,
        servicePoint: service.servicePoint,
        claimId: service.claimId,
      };
    })
    .filter((t): t is SlaTask => t !== null)
    .sort(
      (a, b) =>
        STAGE_RANK[a.stage] - STAGE_RANK[b.stage] ||
        b.date.localeCompare(a.date) ||
        b.serviceId.localeCompare(a.serviceId),
    );
}

export function slaCounts(tasks: SlaTask[]): Record<SlaStage, number> {
  return {
    "H-1": tasks.filter((t) => t.stage === "H-1").length,
    "H-0": tasks.filter((t) => t.stage === "H-0").length,
    LATE: tasks.filter((t) => t.stage === "LATE").length,
  };
}

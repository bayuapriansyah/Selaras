import {
  allServices,
  claims,
  currentUser,
  facilities,
  notifications as seedNotifications,
  patients,
  providers,
  reviewHistory as seedReviews,
  riskSignals,
  templates,
} from "@/data/app/seed";
import { auditLog as seedAudit } from "@/data/app/seed";
import type {
  AuditEntry,
  Claim,
  ClaimStatus,
  Notification,
  Patient,
  Provider,
  RiskSignal,
  ReviewAction,
  Service,
  ServiceTemplate,
} from "@/data/app/types";
import { evaluateClaim, evaluateSession, passportStatusOf } from "./rules";
import { computeClaimSignals, unionSignals } from "./signals";
import type { SignalContext, SignalSession } from "./signals";
import { riskScoreOf } from "./score";
import type { RiskScore } from "./score";

export type DataSource = {
  services: Service[];
  reviews: ReviewAction[];
  audit: AuditEntry[];
  notifications: Notification[];
};

export const seedSource: DataSource = {
  services: allServices,
  reviews: seedReviews,
  audit: seedAudit,
  notifications: seedNotifications,
};

export function getTemplate(id: string): ServiceTemplate {
  const t = templates.find((x) => x.id === id);
  if (!t) throw new Error(`Template tidak ditemukan: ${id}`);
  return t;
}

export function getService(
  id: string,
  src: DataSource = seedSource,
): Service | undefined {
  return src.services.find((s) => s.id === id);
}

export function getClaim(id: string): Claim | undefined {
  return claims.find((c) => c.id === id);
}

export function getPatient(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}

export function getProvider(id: string): Provider | undefined {
  return providers.find((p) => p.id === id);
}

export function getFacility(id: string) {
  return facilities.find((f) => f.id === id);
}

export type SessionView = {
  sessionId: number;
  service: Service;
  evaluation: ReturnType<typeof evaluateSession>;
  template: ServiceTemplate;
};

export type ClaimView = {
  claim: Claim;
  template: ServiceTemplate;
  patient: Patient | undefined;
  evaluation: ReturnType<typeof evaluateClaim>;
  sessions: SessionView[];
  signals: RiskSignal[];
  score: RiskScore;
  reviews: ReviewAction[];
  baseStatus: ClaimStatus;
};

function signalContext(src: DataSource): SignalContext {
  const sessionsByClaim: Record<string, SignalSession[]> = {};
  for (const service of src.services) {
    if (!service.claimId) continue;
    const list = (sessionsByClaim[service.claimId] ??= []);
    list.push({ sessionId: service.sessionId ?? 0, service });
  }
  for (const list of Object.values(sessionsByClaim)) {
    list.sort((a, b) => a.sessionId - b.sessionId);
  }
  return {
    claims,
    sessionsByClaim,
    facilityNames: Object.fromEntries(facilities.map((f) => [f.id, f.name])),
  };
}

export function claimView(
  claimId: string,
  src: DataSource = seedSource,
): ClaimView | undefined {
  const claim = getClaim(claimId);
  if (!claim) return undefined;
  const template = getTemplate(claim.templateId);

  const sessions: SessionView[] = claim.items
    .slice()
    .sort((a, b) => a.sessionId - b.sessionId)
    .map((item) => {
      const service = getService(item.serviceId, src) ?? {
        id: item.serviceId,
        evidence: [],
      };
      const evaluation = evaluateSession(
        service.evidence ?? [],
        template.required,
      );
      return {
        sessionId: item.sessionId,
        service: service as Service,
        evaluation: { ...evaluation, sessionId: item.sessionId },
        template,
      };
    });

  const evaluation = evaluateClaim(
    sessions.map((s) => ({ sessionId: s.sessionId, evaluation: s.evaluation })),
  );

  const computed = computeClaimSignals(
    claim,
    template,
    sessions.map((s) => ({ sessionId: s.sessionId, service: s.service })),
    signalContext(src),
  );
  const signals = unionSignals(
    riskSignals.filter((s) => s.claimId === claimId),
    computed,
  );

  return {
    claim,
    template,
    patient: getPatient(claim.patientId),
    evaluation,
    sessions,
    signals,
    score: riskScoreOf(evaluation, signals),
    reviews: src.reviews
      .filter((r) => r.claimId === claimId)
      .sort((a, b) => b.at.localeCompare(a.at)),
    baseStatus: evaluation.status,
  };
}

export type QueueRow = {
  claim: Claim;
  patient: Patient | undefined;
  template: ServiceTemplate;
  evaluation: ReturnType<typeof evaluateClaim>;
  status: ClaimStatus;
  score: RiskScore;
};

export function queueRows(
  statusOverride?: Record<string, ClaimStatus>,
  src: DataSource = seedSource,
): QueueRow[] {
  return claims
    .map((claim) => {
      const view = claimView(claim.id, src);
      return {
        claim,
        patient: getPatient(claim.patientId),
        template: getTemplate(claim.templateId),
        evaluation: view?.evaluation ?? {
          claimed: 0,
          supported: 0,
          needsReview: 0,
          incomplete: 0,
          contradicted: 0,
          status: claim.status,
        },
        status: statusOverride?.[claim.id] ?? view?.baseStatus ?? claim.status,
        score: view?.score ?? riskScoreOf({ claimed: 0, supported: 0 }, []),
      };
    })
    .sort(
      (a, b) =>
        b.score.score - a.score.score ||
        b.claim.lastUpdated.localeCompare(a.claim.lastUpdated),
    );
}

export type PassportRow = {
  service: Service;
  patient: Patient | undefined;
  provider: Provider | undefined;
  template: ServiceTemplate;
  passport: ReturnType<typeof passportStatusOf>;
  sessionStatus: ReturnType<typeof evaluateSession>["status"];
};

export function passportRows(src: DataSource = seedSource): PassportRow[] {
  return src.services
    .filter((s) => s.evidence.length > 0)
    .map((service) => {
      const template = getTemplate(service.templateId);
      return {
        service,
        patient: getPatient(service.patientId),
        provider: getProvider(service.providerId),
        template,
        passport: passportStatusOf(service.evidence, template.required),
        sessionStatus: evaluateSession(service.evidence, template.required)
          .status,
      };
    })
    .sort(
      (a, b) =>
        b.service.date.localeCompare(a.service.date) ||
        b.service.startTime.localeCompare(a.service.startTime),
    );
}

export function passportRow(
  serviceId: string,
  src: DataSource = seedSource,
): PassportRow | undefined {
  return passportRows(src).find((r) => r.service.id === serviceId);
}

export function servicesToday(src: DataSource = seedSource): Service[] {
  return src.services
    .filter((s) => s.date === "2026-09-30")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function dashboardMetrics(
  statusOverride?: Record<string, ClaimStatus>,
  src: DataSource = seedSource,
) {
  const rows = queueRows(statusOverride, src);
  const today = servicesToday(src);
  const clarificationPending = Object.values(statusOverride ?? {}).filter(
    (s) => s === "NEEDS CLARIFICATION",
  ).length;

  return {
    todayCount: today.length,
    supportedClaims: rows.filter((r) => r.status === "SUPPORTED").length,
    needsReviewClaims: rows.filter(
      (r) => r.status === "NEEDS REVIEW" || r.status === "NEEDS CLARIFICATION",
    ).length,
    clarificationPending,
    rows,
  };
}

export function auditEntries(src: DataSource = seedSource): AuditEntry[] {
  return [...src.audit].sort((a, b) => b.at.localeCompare(a.at));
}

export function notificationsList(
  src: DataSource = seedSource,
): Notification[] {
  return [...src.notifications].sort((a, b) => b.at.localeCompare(a.at));
}

export { currentUser };

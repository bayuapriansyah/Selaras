import type {
  AuditEntry,
  Billing,
  Claim,
  ClaimItem,
  EvidenceItem,
  EvidenceKind,
  Facility,
  Notification,
  Patient,
  Provider,
  RiskSignal,
  ReviewAction,
  Service,
  ServiceEvent,
  ServiceTemplate,
  User,
} from "./types";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "./types";

export const APP_TODAY = "2026-09-30";

export const GOLDEN_CLAIM_ID = "CLM-08421";
export const GOLDEN_PATIENT_ID = "P-1025";
export const GOLDEN_SESSIONS = 10;

export const DEFAULT_REVIEWER_NOTE =
  "Mohon verifikasi evidence treatment dan completion untuk session 09.";

function shift(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

const OFFSETS: Record<EvidenceKind, number> = {
  arrival: 0,
  provider: 8,
  treatment: 21,
  note: 54,
  completion: 55,
  billing: 58,
  claim: 62,
};

const SESSION_STARTS = [
  "08:30",
  "09:15",
  "10:00",
  "13:15",
  "14:00",
  "08:45",
  "10:30",
  "13:30",
  "08:54",
  "09:10",
];

function dateFor(index: number): string {
  return `2026-09-${String(index + 1).padStart(2, "0")}`;
}

function citation(sessionKey: string, kind: EvidenceKind): string {
  const n = EVIDENCE_ORDER.indexOf(kind) + 1;
  return `E-${sessionKey}-${String(n).padStart(2, "0")}`;
}

function presentEvidence(
  sessionKey: string,
  start: string,
  kind: EvidenceKind,
  source: "Operator" | "Provider" | "Sistem",
): EvidenceItem {
  return {
    kind,
    state: "present",
    at: shift(start, OFFSETS[kind]),
    citation: citation(sessionKey, kind),
    source,
  };
}

function missingEvidence(
  sessionKey: string,
  kind: EvidenceKind,
  reason: string,
): EvidenceItem {
  return {
    kind,
    state: "missing",
    citation: citation(sessionKey, kind),
    note: reason,
  };
}

const SOURCE_FOR: Record<EvidenceKind, "Operator" | "Provider" | "Sistem"> = {
  arrival: "Operator",
  provider: "Sistem",
  treatment: "Provider",
  note: "Provider",
  completion: "Provider",
  billing: "Sistem",
  claim: "Sistem",
};

function buildEvidence(
  sessionKey: string,
  start: string,
  missing: Partial<Record<EvidenceKind, string>> = {},
): EvidenceItem[] {
  return EVIDENCE_ORDER.map((kind) =>
    kind in missing
      ? missingEvidence(sessionKey, kind, missing[kind] as string)
      : presentEvidence(sessionKey, start, kind, SOURCE_FOR[kind]),
  );
}

function buildEvents(
  serviceId: string,
  start: string,
  evidence: EvidenceItem[],
): ServiceEvent[] {
  const events: ServiceEvent[] = [
    {
      id: `EV-${serviceId}-START`,
      serviceId,
      kind: "start",
      at: start,
      source: "Operator",
      description: "Pelayanan dimulai",
    },
  ];
  for (const item of evidence) {
    if (item.state !== "present") continue;
    events.push({
      id: `EV-${serviceId}-${item.kind.toUpperCase()}`,
      serviceId,
      kind: item.kind,
      at: item.at as string,
      source: item.source ?? "Sistem",
      description: `${EVIDENCE_LABEL[item.kind]} tercatat`,
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export const facilities: Facility[] = [
  {
    id: "FAC-01",
    name: "Klinik Pratama Nusantara",
    kind: "Klinik",
    city: "Jakarta Selatan",
  },
  {
    id: "FAC-02",
    name: "Laboratorium Medika Sehat",
    kind: "Laboratorium",
    city: "Jakarta Pusat",
  },
];

export const providers: Provider[] = [
  {
    id: "T-031",
    name: "Arif Nugroho",
    profession: "Fisioterapis",
    facilityId: "FAC-01",
  },
  {
    id: "T-014",
    name: "Maya Kusuma",
    profession: "Dokter Gigi",
    facilityId: "FAC-01",
  },
  {
    id: "T-052",
    name: "Rangga Wibowo",
    profession: "Analis Laboratorium",
    facilityId: "FAC-02",
  },
  {
    id: "T-067",
    name: "Sinta Rahma",
    profession: "Radiografer",
    facilityId: "FAC-01",
  },
];

export const patients: Patient[] = [
  { id: "P-1025", display: "Pasien P-1025", gender: "L", birthYear: 1987 },
  { id: "P-1019", display: "Pasien P-1019", gender: "P", birthYear: 1994 },
  { id: "P-1044", display: "Pasien P-1044", gender: "L", birthYear: 1976 },
  { id: "P-1031", display: "Pasien P-1031", gender: "P", birthYear: 2001 },
  { id: "P-1077", display: "Pasien P-1077", gender: "L", birthYear: 1968 },
  { id: "P-1002", display: "Pasien P-1002", gender: "P", birthYear: 1992 },
  { id: "P-1008", display: "Pasien P-1008", gender: "L", birthYear: 1981 },
  { id: "P-1055", display: "Pasien P-1055", gender: "P", birthYear: 1999 },
];

export const templates: ServiceTemplate[] = [
  {
    id: "TPL-PHYSIO",
    name: "Fisioterapi",
    nameEn: "Physiotherapy",
    required: [...EVIDENCE_ORDER],
    rate: 350000,
    description:
      "Sesi fisioterapi rawat jalan: kedatangan, tindakan, catatan klinis, dan penyelesaian wajib tercatat.",
  },
  {
    id: "TPL-DENTAL",
    name: "Poli Gigi",
    nameEn: "Dental",
    required: ["arrival", "provider", "treatment", "note", "completion", "billing", "claim"],
    rate: 450000,
    description:
      "Tindakan gigi rawat jalan dengan catatan klinis dan billing per kunjungan.",
  },
  {
    id: "TPL-LAB",
    name: "Laboratorium",
    nameEn: "Laboratory",
    required: ["arrival", "provider", "treatment", "note", "billing", "claim"],
    rate: 275000,
    description:
      "Pemeriksaan laboratorium: spesimen, analisis, dan hasil dilaporkan sebagai tindakan.",
  },
  {
    id: "TPL-RADIOLOGY",
    name: "Radiologi",
    nameEn: "Radiology",
    required: ["arrival", "provider", "treatment", "note", "completion", "billing", "claim"],
    rate: 625000,
    description:
      "Akuisisi citra dan pembacaan radiologi dengan verifikasi radiografer.",
  },
  {
    id: "TPL-OUTPATIENT",
    name: "Rawat Jalan",
    nameEn: "Outpatient",
    required: ["arrival", "provider", "note", "completion", "billing", "claim"],
    rate: 180000,
    description:
      "Konsultasi rawat jalan umum tanpa tindakan khusus.",
  },
];

export const users: User[] = [
  {
    id: "U-OP-01",
    name: "Sari Wijaya",
    initials: "SW",
    role: "operator",
    title: "Operator Pendaftaran",
    email: "sari@klinik-nusantara.id",
  },
  {
    id: "U-PR-01",
    name: "Arif Nugroho",
    initials: "AN",
    role: "provider",
    title: "Fisioterapis · T-031",
    email: "arif@klinik-nusantara.id",
  },
  {
    id: "U-RV-01",
    name: "Dewi Ananda",
    initials: "DA",
    role: "reviewer",
    title: "Reviewer Integritas Bukti",
    email: "dewi@selaras.id",
  },
  {
    id: "U-AD-01",
    name: "Bima Santoso",
    initials: "BS",
    role: "admin",
    title: "Administrator Sistem",
    email: "bima@selaras.id",
  },
];

export const currentUser: User = users[2];

function makeService(params: {
  id: string;
  patientId: string;
  providerId: string;
  templateId: string;
  date: string;
  start: string;
  servicePoint: string;
  claimId?: string;
  sessionId?: number;
  missing?: Partial<Record<EvidenceKind, string>>;
  active?: boolean;
}): Service {
  const sessionKey = String(
    params.sessionId ?? params.id.slice(-2),
  ).padStart(2, "0");
  const evidence = params.active
    ? EVIDENCE_ORDER.map((kind) =>
        kind === "arrival"
          ? presentEvidence(sessionKey, params.start, kind, "Operator")
          : missingEvidence(sessionKey, kind, "Belum tercatat"),
      )
    : buildEvidence(sessionKey, params.start, params.missing ?? {});
  return {
    id: params.id,
    patientId: params.patientId,
    providerId: params.providerId,
    facilityId: params.templateId === "TPL-LAB" ? "FAC-02" : "FAC-01",
    templateId: params.templateId,
    servicePoint: params.servicePoint,
    date: params.date,
    startTime: params.start,
    endTime: params.active ? undefined : shift(params.start, 70),
    status: params.active ? "AKTIF" : "SELESAI",
    claimId: params.claimId,
    sessionId: params.sessionId,
    evidence,
    events: buildEvents(params.id, params.start, evidence),
  };
}

function goldenServices(): Service[] {
  return Array.from({ length: GOLDEN_SESSIONS }, (_, i) => {
    const sessionId = i + 1;
    const key = String(sessionId).padStart(2, "0");
    const start = SESSION_STARTS[i];
    const missing: Partial<Record<EvidenceKind, string>> = {};
    if (sessionId === 9) {
      missing.treatment = "Tidak ditemukan pada log pelayanan";
      missing.completion = "Tidak ditemukan pada log pelayanan";
    }
    if (sessionId === 10) {
      missing.completion = "Tidak ditemukan pada log pelayanan";
    }
    return makeService({
      id: `SVC-08421-${key}`,
      patientId: GOLDEN_PATIENT_ID,
      providerId: "T-031",
      templateId: "TPL-PHYSIO",
      date: dateFor(i),
      start,
      servicePoint: "Ruang Fisioterapi 2",
      claimId: GOLDEN_CLAIM_ID,
      sessionId,
      missing,
    });
  });
}

type ClaimSpec = {
  id: string;
  patientId: string;
  templateId: string;
  providerId: string;
  servicePoint: string;
  starts: string[];
  startDate: number;
  missing?: Partial<Record<EvidenceKind, string>>[];
  conflictSession?: number;
};

function makeClaimServices(spec: ClaimSpec): Service[] {
  return spec.starts.map((start, i) => {
    const key = String(i + 1).padStart(2, "0");
    const missing = spec.missing?.[i] ?? {};
    const service = makeService({
      id: `SVC-${spec.id.slice(4)}-${key}`,
      patientId: spec.patientId,
      providerId: spec.providerId,
      templateId: spec.templateId,
      date: `2026-09-${String(spec.startDate + i).padStart(2, "0")}`,
      start,
      servicePoint: spec.servicePoint,
      claimId: spec.id,
      sessionId: i + 1,
      missing,
    });
    if (spec.conflictSession === i + 1) {
      const treatment = service.evidence.find((e) => e.kind === "treatment");
      const billing = service.evidence.find((e) => e.kind === "billing");
      if (treatment?.at && billing?.at) {
        billing.at = shift(treatment.at, -40);
        billing.note = "Billing tercatat sebelum tindakan selesai";
      }
    }
    return service;
  });
}

const claimSpecs: ClaimSpec[] = [
  {
    id: "CLM-08418",
    patientId: "P-1019",
    templateId: "TPL-LAB",
    providerId: "T-052",
    servicePoint: "Laboratorium Lantai 1",
    starts: ["07:45", "08:20", "09:05", "10:10", "11:00", "13:20"],
    startDate: 2,
  },
  {
    id: "CLM-08430",
    patientId: "P-1044",
    templateId: "TPL-DENTAL",
    providerId: "T-014",
    servicePoint: "Poli Gigi 1",
    starts: ["09:00", "09:45", "10:30", "13:00", "14:15"],
    startDate: 4,
    missing: [
      {},
      { note: "Catatan klinis belum diinput", completion: "Belum dikonfirmasi" },
      {},
      {
        note: "Catatan klinis belum diinput",
        completion: "Belum dikonfirmasi",
        billing: "Billing belum dibuat",
      },
      { completion: "Belum dikonfirmasi" },
    ],
  },
  {
    id: "CLM-08433",
    patientId: "P-1077",
    templateId: "TPL-RADIOLOGY",
    providerId: "T-067",
    servicePoint: "Rontgen 1",
    starts: ["08:15", "09:30", "11:15", "14:45"],
    startDate: 6,
    missing: [{}, { treatment: "Hasil akuisisi belum terhubung" }, {}, {}],
  },
  {
    id: "CLM-08416",
    patientId: "P-1008",
    templateId: "TPL-LAB",
    providerId: "T-052",
    servicePoint: "Laboratorium Lantai 1",
    starts: ["07:50", "08:40", "09:35"],
    startDate: 8,
    conflictSession: 2,
  },
  {
    id: "CLM-08409",
    patientId: "P-1002",
    templateId: "TPL-PHYSIO",
    providerId: "T-031",
    servicePoint: "Ruang Fisioterapi 1",
    starts: ["10:00", "11:00", "13:45"],
    startDate: 3,
  },
];

function buildClaim(
  spec: ClaimSpec,
  services: Service[],
  lastUpdated: string,
  status: Claim["status"],
): Claim {
  const template = templates.find((t) => t.id === spec.templateId);
  const items: ClaimItem[] = services.map((s) => ({
    id: `CI-${s.id}`,
    claimId: spec.id,
    serviceId: s.id,
    sessionId: s.sessionId as number,
    amount: template?.rate ?? 0,
  }));
  return {
    id: spec.id,
    patientId: spec.patientId,
    templateId: spec.templateId,
    facilityId: spec.templateId === "TPL-LAB" ? "FAC-02" : "FAC-01",
    periodFrom: `2026-09-${String(spec.startDate).padStart(2, "0")}`,
    periodTo: `2026-09-${String(spec.startDate + spec.starts.length - 1).padStart(2, "0")}`,
    status,
    items,
    lastUpdated,
  };
}

const goldenServicesList = goldenServices();

const otherServices: Service[] = claimSpecs.flatMap((spec) =>
  makeClaimServices(spec),
);

export const services: Service[] = [...goldenServicesList, ...otherServices];

const todayServices: Service[] = [
  makeService({
    id: "SVC-08441-01",
    patientId: "P-1031",
    providerId: "T-031",
    templateId: "TPL-PHYSIO",
    date: APP_TODAY,
    start: "08:30",
    servicePoint: "Ruang Fisioterapi 2",
  }),
  makeService({
    id: "SVC-08441-02",
    patientId: "P-1055",
    providerId: "T-014",
    templateId: "TPL-DENTAL",
    date: APP_TODAY,
    start: "09:15",
    servicePoint: "Poli Gigi 1",
  }),
  makeService({
    id: "SVC-08441-03",
    patientId: "P-1019",
    providerId: "T-052",
    templateId: "TPL-LAB",
    date: APP_TODAY,
    start: "10:00",
    servicePoint: "Laboratorium Lantai 1",
    missing: { note: "Catatan klinis belum diinput" },
  }),
  makeService({
    id: "SVC-08441-04",
    patientId: "P-1077",
    providerId: "T-067",
    templateId: "TPL-RADIOLOGY",
    date: APP_TODAY,
    start: "10:45",
    servicePoint: "Rontgen 1",
    active: true,
  }),
];

export const allServices: Service[] = [...services, ...todayServices];

export const billings: Billing[] = services
  .filter((s) => s.status === "SELESAI")
  .map((s) => {
    const template = templates.find((t) => t.id === s.templateId);
    const billingEvidence = s.evidence.find((e) => e.kind === "billing");
    return {
      id: `BLG-${s.id}`,
      serviceId: s.id,
      amount: template?.rate ?? 0,
      createdAt: billingEvidence?.at
        ? `${s.date} ${billingEvidence.at}`
        : `${s.date} ${s.startTime}`,
    };
  });

export const claims: Claim[] = [
  buildClaim(
    { id: GOLDEN_CLAIM_ID, patientId: GOLDEN_PATIENT_ID, templateId: "TPL-PHYSIO", providerId: "T-031", servicePoint: "Ruang Fisioterapi 2", starts: SESSION_STARTS, startDate: 1 },
    goldenServicesList,
    `${APP_TODAY} 07:12`,
    "NEEDS REVIEW",
  ),
  buildClaim(claimSpecs[0], otherServices.filter((s) => s.claimId === "CLM-08418"), `${APP_TODAY} 06:58`, "SUPPORTED"),
  buildClaim(claimSpecs[1], otherServices.filter((s) => s.claimId === "CLM-08430"), `${APP_TODAY} 07:04`, "INCOMPLETE"),
  buildClaim(claimSpecs[2], otherServices.filter((s) => s.claimId === "CLM-08433"), `${APP_TODAY} 07:09`, "NEEDS REVIEW"),
  buildClaim(claimSpecs[3], otherServices.filter((s) => s.claimId === "CLM-08416"), `${APP_TODAY} 07:15`, "CONTRADICTED"),
  buildClaim(claimSpecs[4], otherServices.filter((s) => s.claimId === "CLM-08409"), `2026-09-28 16:40`, "SUPPORTED"),
];

export const riskSignals: RiskSignal[] = [
  {
    id: "SIG-0001",
    claimId: GOLDEN_CLAIM_ID,
    sessionId: 9,
    code: "EVIDENCE_GAP",
    severity: "warning",
    message:
      "Session 09 tidak memiliki bukti tindakan dan penyelesaian.",
    at: `${APP_TODAY} 07:12`,
  },
  {
    id: "SIG-0002",
    claimId: GOLDEN_CLAIM_ID,
    sessionId: 10,
    code: "MISSING_COMPLETION",
    severity: "info",
    message: "Session 10 belum memiliki bukti penyelesaian.",
    at: `${APP_TODAY} 07:12`,
  },
  {
    id: "SIG-0003",
    claimId: "CLM-08433",
    sessionId: 2,
    code: "EVIDENCE_GAP",
    severity: "warning",
    message: "Session 02 radiologi belum terhubung ke hasil akuisisi.",
    at: `${APP_TODAY} 07:09`,
  },
  {
    id: "SIG-0004",
    claimId: "CLM-08416",
    sessionId: 2,
    code: "TIMESTAMP_CONFLICT",
    severity: "critical",
    message:
      "Billing tercatat 40 menit sebelum tindakan selesai pada session 02.",
    at: `${APP_TODAY} 07:15`,
  },
];

export const reviewHistory: ReviewAction[] = [
  {
    id: "RA-0001",
    claimId: "CLM-08409",
    action: "MARK_SUPPORTED",
    note: "Seluruh evidence session terverifikasi lengkap.",
    by: "Dewi Ananda",
    at: "2026-09-28 16:40",
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: "AUD-0012",
    at: `${APP_TODAY} 07:16`,
    user: "Sistem",
    action: "SIGNAL_GENERATED",
    entity: "Signal",
    entityId: "SIG-0004",
    description: "Sinyal konflik timestamp dihasilkan untuk CLM-08416.",
  },
  {
    id: "AUD-0011",
    at: `${APP_TODAY} 07:15`,
    user: "Sistem",
    action: "CLAIM_LINKED",
    entity: "Claim",
    entityId: "CLM-08416",
    description: "Klaim CLM-08416 tertaut dari 3 episode laboratorium.",
  },
  {
    id: "AUD-0010",
    at: `${APP_TODAY} 07:12`,
    user: "Sistem",
    action: "SIGNAL_GENERATED",
    entity: "Signal",
    entityId: "SIG-0001",
    description:
      "Evidence gap treatment & completion dihasilkan untuk session 09.",
  },
  {
    id: "AUD-0009",
    at: `${APP_TODAY} 07:12`,
    user: "Sistem",
    action: "CLAIM_LINKED",
    entity: "Claim",
    entityId: GOLDEN_CLAIM_ID,
    description: "Klaim CLM-08421 tertaut dari 10 episode fisioterapi.",
  },
  {
    id: "AUD-0008",
    at: `${APP_TODAY} 07:04`,
    user: "Sari Wijaya",
    action: "BILLING_CREATED",
    entity: "Billing",
    entityId: "BLG-SVC-08430-05",
    description: "Billing dibuat untuk episode Poli Gigi session 05.",
  },
  {
    id: "AUD-0007",
    at: `${APP_TODAY} 06:58`,
    user: "Dewi Ananda",
    action: "CLAIM_REVIEWED",
    entity: "Claim",
    entityId: "CLM-08418",
    description: "CLM-08418 ditandai didukung seluruh evidence.",
  },
  {
    id: "AUD-0006",
    at: `2026-09-10 09:56`,
    user: "Sistem",
    action: "CLAIM_LINKED",
    entity: "Claim",
    entityId: GOLDEN_CLAIM_ID,
    description: "Session 09 tertaut ke klaim CLM-08421.",
  },
  {
    id: "AUD-0005",
    at: `2026-09-10 09:52`,
    user: "Sistem",
    action: "BILLING_CREATED",
    entity: "Billing",
    entityId: "BLG-SVC-08421-09",
    description: "Billing dibuat untuk session 09.",
  },
  {
    id: "AUD-0004",
    at: `2026-09-10 09:48`,
    user: "Arif Nugroho",
    action: "EVIDENCE_ADDED",
    entity: "Evidence",
    entityId: "E-09-04",
    description: "Catatan klinis session 09 ditambahkan.",
  },
  {
    id: "AUD-0003",
    at: `2026-09-10 09:02`,
    user: "Sari Wijaya",
    action: "EVIDENCE_ADDED",
    entity: "Evidence",
    entityId: "E-09-02",
    description: "Verifikasi provider session 09 tercatat.",
  },
  {
    id: "AUD-0002",
    at: `2026-09-10 08:54`,
    user: "Sari Wijaya",
    action: "SERVICE_STARTED",
    entity: "Service",
    entityId: "SVC-08421-09",
    description: "Pelayanan fisioterapi session 09 dimulai.",
  },
  {
    id: "AUD-0001",
    at: `2026-09-28 16:40`,
    user: "Dewi Ananda",
    action: "REVIEW_ACTION",
    entity: "Review",
    entityId: "CLM-08409",
    description: "Aksi tinjauan: Tandai Didukung untuk CLM-08409.",
  },
];

export const notifications: Notification[] = [
  {
    id: "NTF-0001",
    title: "CLM-08421 menunggu tinjauan",
    body: "2 dari 10 session memiliki evidence gap.",
    at: `${APP_TODAY} 07:12`,
    read: false,
  },
  {
    id: "NTF-0002",
    title: "Sinyal konflik timestamp",
    body: "CLM-08416: billing tercatat sebelum tindakan.",
    at: `${APP_TODAY} 07:16`,
    read: false,
  },
  {
    id: "NTF-0003",
    title: "CLM-08418 didukung penuh",
    body: "Seluruh evidence laboratorium lengkap.",
    at: `${APP_TODAY} 06:58`,
    read: true,
  },
];

export function servicesOfClaim(claimId: string): Service[] {
  return services.filter((s) => s.claimId === claimId);
}

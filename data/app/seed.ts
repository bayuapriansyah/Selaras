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
import { evaluateClaim, evaluateSession } from "@/lib/app/rules";

export const APP_TODAY = "2026-09-30";

export const GOLDEN_CLAIM_ID = "CLM-08421";
export const GOLDEN_PATIENT_ID = "P-1025";
export const GOLDEN_SESSIONS = 10;

export const DEFAULT_REVIEWER_NOTE =
  "Mohon verifikasi evidence treatment dan completion untuk sesi 09.";

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
  {
    id: "FAC-03",
    name: "RS Mitra Medika",
    kind: "Rumah Sakit",
    city: "Bandung",
  },
  {
    id: "FAC-04",
    name: "Klinik Sehat Bersama",
    kind: "Klinik",
    city: "Depok",
  },
  {
    id: "FAC-05",
    name: "Klinik Pratama Cendana",
    kind: "Klinik",
    city: "Bekasi",
  },
  {
    id: "FAC-06",
    name: "RSIA Puspa Sehat",
    kind: "Rumah Sakit",
    city: "Tangerang",
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
  {
    id: "T-101",
    name: "Nia Puspita",
    profession: "Fisioterapis",
    facilityId: "FAC-03",
  },
  {
    id: "T-102",
    name: "Yoga Prasetya",
    profession: "Fisioterapis",
    facilityId: "FAC-03",
  },
  {
    id: "T-111",
    name: "Rina Marlina",
    profession: "Fisioterapis",
    facilityId: "FAC-04",
  },
  {
    id: "T-112",
    name: "Hendra Wijaya",
    profession: "Dokter Umum",
    facilityId: "FAC-04",
  },
  {
    id: "T-113",
    name: "Lina Kartika",
    profession: "Dokter Gigi",
    facilityId: "FAC-04",
  },
  {
    id: "T-121",
    name: "Fajar Setiawan",
    profession: "Fisioterapis",
    facilityId: "FAC-05",
  },
  {
    id: "T-122",
    name: "Andini Pertiwi",
    profession: "Dokter Gigi",
    facilityId: "FAC-05",
  },
  {
    id: "T-123",
    name: "Bayu Saputra",
    profession: "Dokter Umum",
    facilityId: "FAC-05",
  },
  {
    id: "T-131",
    name: "Citra Dewi",
    profession: "Analis Laboratorium",
    facilityId: "FAC-06",
  },
  {
    id: "T-132",
    name: "Reza Fahlevi",
    profession: "Radiografer",
    facilityId: "FAC-06",
  },
  {
    id: "T-133",
    name: "Maya Anggraini",
    profession: "Dokter Umum",
    facilityId: "FAC-06",
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
  { id: "P-2001", display: "Pasien P-2001", gender: "L", birthYear: 1990 },
  { id: "P-2002", display: "Pasien P-2002", gender: "P", birthYear: 1985 },
  { id: "P-2003", display: "Pasien P-2003", gender: "L", birthYear: 1978 },
  { id: "P-2004", display: "Pasien P-2004", gender: "P", birthYear: 1996 },
  { id: "P-2005", display: "Pasien P-2005", gender: "L", birthYear: 1972 },
  { id: "P-2006", display: "Pasien P-2006", gender: "P", birthYear: 1988 },
  { id: "P-2007", display: "Pasien P-2007", gender: "L", birthYear: 1993 },
  { id: "P-2008", display: "Pasien P-2008", gender: "P", birthYear: 1981 },
  { id: "P-2009", display: "Pasien P-2009", gender: "L", birthYear: 1999 },
  { id: "P-2010", display: "Pasien P-2010", gender: "P", birthYear: 1976 },
  { id: "P-2011", display: "Pasien P-2011", gender: "L", birthYear: 1984 },
  { id: "P-2012", display: "Pasien P-2012", gender: "P", birthYear: 2001 },
  { id: "P-2013", display: "Pasien P-2013", gender: "L", birthYear: 1995 },
  { id: "P-2014", display: "Pasien P-2014", gender: "P", birthYear: 1987 },
  { id: "P-2015", display: "Pasien P-2015", gender: "L", birthYear: 1968 },
  { id: "P-2016", display: "Pasien P-2016", gender: "P", birthYear: 1992 },
  { id: "P-2017", display: "Pasien P-2017", gender: "L", birthYear: 2003 },
  { id: "P-2018", display: "Pasien P-2018", gender: "P", birthYear: 1980 },
  { id: "P-2019", display: "Pasien P-2019", gender: "L", birthYear: 1989 },
  { id: "P-2020", display: "Pasien P-2020", gender: "P", birthYear: 1997 },
  { id: "P-2021", display: "Pasien P-2021", gender: "L", birthYear: 1974 },
  { id: "P-2022", display: "Pasien P-2022", gender: "P", birthYear: 2005 },
  { id: "P-2023", display: "Pasien P-2023", gender: "L", birthYear: 1991 },
  { id: "P-2024", display: "Pasien P-2024", gender: "P", birthYear: 1983 },
  { id: "P-2025", display: "Pasien P-2025", gender: "L", birthYear: 1970 },
  { id: "P-2026", display: "Pasien P-2026", gender: "P", birthYear: 1998 },
];

export const templates: ServiceTemplate[] = [
  {
    id: "TPL-PHYSIO",
    name: "Fisioterapi",
    nameEn: "Fisioterapi",
    required: [...EVIDENCE_ORDER],
    rate: 350000,
    description:
      "Sesi fisioterapi rawat jalan: kedatangan, tindakan, catatan klinis, dan penyelesaian wajib tercatat.",
  },
  {
    id: "TPL-DENTAL",
    name: "Poli Gigi",
    nameEn: "Kedokteran Gigi",
    required: ["arrival", "provider", "treatment", "note", "completion", "billing", "claim"],
    rate: 450000,
    description:
      "Tindakan gigi rawat jalan dengan catatan klinis dan billing per kunjungan.",
  },
  {
    id: "TPL-LAB",
    name: "Laboratorium",
    nameEn: "Laboratorium",
    required: ["arrival", "provider", "treatment", "note", "billing", "claim"],
    rate: 275000,
    description:
      "Pemeriksaan laboratorium: spesimen, analisis, dan hasil dilaporkan sebagai tindakan.",
  },
  {
    id: "TPL-RADIOLOGY",
    name: "Radiologi",
    nameEn: "Radiologi",
    required: ["arrival", "provider", "treatment", "note", "completion", "billing", "claim"],
    rate: 625000,
    description:
      "Akuisisi citra dan pembacaan radiologi dengan verifikasi radiografer.",
  },
  {
    id: "TPL-OUTPATIENT",
    name: "Rawat Jalan",
    nameEn: "Rawat Jalan",
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
  facilityId?: string;
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
    facilityId:
      params.facilityId ??
      (params.templateId === "TPL-LAB" ? "FAC-02" : "FAC-01"),
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
  facilityId?: string;
  servicePoint: string;
  starts: string[];
  startDate: number;
  missing?: Partial<Record<EvidenceKind, string>>[];
  conflictSession?: number;
  updated?: string;
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
      facilityId: spec.facilityId,
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

const CLONE_MISSING = { completion: "Belum dikonfirmasi provider" };
const PHANTOM_MISSING: Partial<Record<EvidenceKind, string>> = {
  treatment: "Tidak ada jejak tindakan pada sesi ini",
  note: "Catatan klinis tidak ditemukan",
  completion: "Penyelesaian tidak tercatat",
};

const cohortSpecs: ClaimSpec[] = [
  {
    id: "CLM-08601",
    patientId: "P-2001",
    templateId: "TPL-PHYSIO",
    providerId: "T-121",
    facilityId: "FAC-05",
    servicePoint: "Fisioterapi Cendana",
    starts: ["09:00", "10:00", "11:00"],
    startDate: 10,
    missing: [{}, CLONE_MISSING, {}],
    updated: "2026-09-29 15:20",
  },
  {
    id: "CLM-08602",
    patientId: "P-2001",
    templateId: "TPL-PHYSIO",
    providerId: "T-121",
    facilityId: "FAC-05",
    servicePoint: "Fisioterapi Cendana",
    starts: ["10:00", "13:00"],
    startDate: 11,
    updated: "2026-09-29 15:25",
  },
  {
    id: "CLM-08603",
    patientId: "P-2002",
    templateId: "TPL-DENTAL",
    providerId: "T-122",
    facilityId: "FAC-05",
    servicePoint: "Poli Gigi Cendana",
    starts: ["09:30", "10:30", "11:30"],
    startDate: 13,
    missing: [{}, {}, { note: "Catatan klinis belum diinput" }],
    updated: "2026-09-29 15:30",
  },
  {
    id: "CLM-08604",
    patientId: "P-2002",
    templateId: "TPL-DENTAL",
    providerId: "T-122",
    facilityId: "FAC-05",
    servicePoint: "Poli Gigi Cendana",
    starts: ["11:30", "14:00"],
    startDate: 15,
    updated: "2026-09-29 15:35",
  },
  {
    id: "CLM-08605",
    patientId: "P-2003",
    templateId: "TPL-LAB",
    providerId: "T-131",
    facilityId: "FAC-06",
    servicePoint: "Laboratorium Puspa",
    starts: ["08:00", "08:40", "09:20", "10:00"],
    startDate: 12,
    updated: "2026-09-29 15:40",
  },
  {
    id: "CLM-08606",
    patientId: "P-2003",
    templateId: "TPL-LAB",
    providerId: "T-131",
    facilityId: "FAC-06",
    servicePoint: "Laboratorium Puspa",
    starts: ["10:40", "11:20", "12:00"],
    startDate: 14,
    updated: "2026-09-29 15:45",
  },
  {
    id: "CLM-08607",
    patientId: "P-2004",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-133",
    facilityId: "FAC-06",
    servicePoint: "Poli Umum Puspa",
    starts: ["13:00", "13:45", "14:30", "15:15"],
    startDate: 16,
    missing: [{}, { note: "Catatan klinis belum diinput" }, {}, {}],
    updated: "2026-09-29 15:50",
  },
  {
    id: "CLM-08608",
    patientId: "P-2004",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-133",
    facilityId: "FAC-06",
    servicePoint: "Poli Umum Puspa",
    starts: ["16:00", "16:45"],
    startDate: 19,
    updated: "2026-09-29 15:55",
  },
  {
    id: "CLM-08609",
    patientId: "P-2005",
    templateId: "TPL-PHYSIO",
    providerId: "T-111",
    facilityId: "FAC-04",
    servicePoint: "Fisioterapi Bersama",
    starts: ["09:00", "10:00", "11:00"],
    startDate: 20,
    missing: [PHANTOM_MISSING, PHANTOM_MISSING, PHANTOM_MISSING],
    updated: `${APP_TODAY} 07:20`,
  },
  {
    id: "CLM-08610",
    patientId: "P-2006",
    templateId: "TPL-PHYSIO",
    providerId: "T-101",
    facilityId: "FAC-03",
    servicePoint: "Fisioterapi Ruang Melati",
    starts: ["09:00", "10:00", "11:00", "13:00"],
    startDate: 5,
    missing: [
      {},
      { note: "Catatan klinis belum diinput", completion: "Belum dikonfirmasi" },
      { note: "Catatan klinis belum diinput", completion: "Belum dikonfirmasi" },
      { completion: "Belum dikonfirmasi" },
    ],
    updated: `${APP_TODAY} 07:22`,
  },
  {
    id: "CLM-08611",
    patientId: "P-2007",
    templateId: "TPL-PHYSIO",
    providerId: "T-101",
    facilityId: "FAC-03",
    servicePoint: "Fisioterapi Ruang Melati",
    starts: ["08:30", "09:30"],
    startDate: 5,
    updated: "2026-09-29 14:10",
  },
  {
    id: "CLM-08612",
    patientId: "P-2008",
    templateId: "TPL-PHYSIO",
    providerId: "T-102",
    facilityId: "FAC-03",
    servicePoint: "Fisioterapi Ruang Anggrek",
    starts: ["08:30", "09:30"],
    startDate: 7,
    updated: "2026-09-29 14:15",
  },
  {
    id: "CLM-08613",
    patientId: "P-2009",
    templateId: "TPL-PHYSIO",
    providerId: "T-101",
    facilityId: "FAC-03",
    servicePoint: "Fisioterapi Ruang Melati",
    starts: ["10:00", "11:00"],
    startDate: 9,
    updated: "2026-09-29 14:20",
  },
  {
    id: "CLM-08614",
    patientId: "P-2010",
    templateId: "TPL-PHYSIO",
    providerId: "T-102",
    facilityId: "FAC-03",
    servicePoint: "Fisioterapi Ruang Anggrek",
    starts: ["13:30", "14:30"],
    startDate: 11,
    updated: "2026-09-29 14:25",
  },
  {
    id: "CLM-08615",
    patientId: "P-2011",
    templateId: "TPL-RADIOLOGY",
    providerId: "T-132",
    facilityId: "FAC-06",
    servicePoint: "Radiologi Puspa",
    starts: ["08:15", "09:30", "11:00"],
    startDate: 22,
    conflictSession: 2,
    updated: `${APP_TODAY} 07:24`,
  },
  {
    id: "CLM-08616",
    patientId: "P-2012",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-112",
    facilityId: "FAC-04",
    servicePoint: "Poli Umum Bersama",
    starts: ["08:00", "08:45", "09:30", "10:15"],
    startDate: 2,
    updated: "2026-09-29 12:16",
  },
  {
    id: "CLM-08617",
    patientId: "P-2013",
    templateId: "TPL-DENTAL",
    providerId: "T-113",
    facilityId: "FAC-04",
    servicePoint: "Poli Gigi Bersama",
    starts: ["10:00", "10:45", "11:30"],
    startDate: 2,
    missing: [{}, CLONE_MISSING, {}],
    updated: "2026-09-29 12:17",
  },
  {
    id: "CLM-08618",
    patientId: "P-2014",
    templateId: "TPL-PHYSIO",
    providerId: "T-111",
    facilityId: "FAC-04",
    servicePoint: "Fisioterapi Bersama",
    starts: ["13:00", "14:00"],
    startDate: 4,
    updated: "2026-09-29 12:18",
  },
  {
    id: "CLM-08619",
    patientId: "P-2015",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-112",
    facilityId: "FAC-04",
    servicePoint: "Poli Umum Bersama",
    starts: ["08:00", "08:45"],
    startDate: 6,
    missing: [{ provider: "Verifikasi provider belum masuk" }, {}],
    updated: "2026-09-29 12:19",
  },
  {
    id: "CLM-08620",
    patientId: "P-2016",
    templateId: "TPL-DENTAL",
    providerId: "T-122",
    facilityId: "FAC-05",
    servicePoint: "Poli Gigi Cendana",
    starts: ["09:00", "09:45", "10:30", "11:15"],
    startDate: 18,
    updated: "2026-09-29 12:20",
  },
  {
    id: "CLM-08621",
    patientId: "P-2017",
    templateId: "TPL-PHYSIO",
    providerId: "T-121",
    facilityId: "FAC-05",
    servicePoint: "Fisioterapi Cendana",
    starts: ["13:00", "14:00", "15:00"],
    startDate: 18,
    missing: [{}, {}, CLONE_MISSING],
    updated: "2026-09-29 12:21",
  },
  {
    id: "CLM-08622",
    patientId: "P-2018",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-123",
    facilityId: "FAC-05",
    servicePoint: "Poli Umum Cendana",
    starts: ["08:15", "09:00"],
    startDate: 20,
    updated: "2026-09-29 12:22",
  },
  {
    id: "CLM-08623",
    patientId: "P-2019",
    templateId: "TPL-RADIOLOGY",
    providerId: "T-132",
    facilityId: "FAC-06",
    servicePoint: "Radiologi Puspa",
    starts: ["13:00", "14:15", "15:30"],
    startDate: 8,
    updated: "2026-09-29 12:23",
  },
  {
    id: "CLM-08624",
    patientId: "P-2020",
    templateId: "TPL-LAB",
    providerId: "T-131",
    facilityId: "FAC-06",
    servicePoint: "Laboratorium Puspa",
    starts: ["07:45", "08:30", "09:15"],
    startDate: 22,
    missing: [{}, { note: "Catatan klinis belum diinput" }, {}],
    updated: "2026-09-29 12:24",
  },
  {
    id: "CLM-08625",
    patientId: "P-2021",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-133",
    facilityId: "FAC-06",
    servicePoint: "Poli Umum Puspa",
    starts: ["16:00", "16:45"],
    startDate: 24,
    updated: "2026-09-29 12:25",
  },
  {
    id: "CLM-08626",
    patientId: "P-2022",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-112",
    facilityId: "FAC-04",
    servicePoint: "Poli Umum Bersama",
    starts: ["10:00", "10:45", "11:30"],
    startDate: 8,
    updated: "2026-09-29 12:26",
  },
  {
    id: "CLM-08627",
    patientId: "P-2023",
    templateId: "TPL-DENTAL",
    providerId: "T-113",
    facilityId: "FAC-04",
    servicePoint: "Poli Gigi Bersama",
    starts: ["13:30", "14:15"],
    startDate: 10,
    updated: "2026-09-29 12:27",
  },
  {
    id: "CLM-08628",
    patientId: "P-2024",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-123",
    facilityId: "FAC-05",
    servicePoint: "Poli Umum Cendana",
    starts: ["08:00", "09:00", "10:00"],
    startDate: 24,
    updated: "2026-09-29 12:28",
  },
  {
    id: "CLM-08629",
    patientId: "P-2025",
    templateId: "TPL-RADIOLOGY",
    providerId: "T-132",
    facilityId: "FAC-06",
    servicePoint: "Radiologi Puspa",
    starts: ["13:00", "14:15"],
    startDate: 26,
    updated: "2026-09-29 12:29",
  },
  {
    id: "CLM-08630",
    patientId: "P-2026",
    templateId: "TPL-OUTPATIENT",
    providerId: "T-123",
    facilityId: "FAC-05",
    servicePoint: "Poli Umum Cendana",
    starts: ["11:00", "11:45"],
    startDate: 26,
    updated: "2026-09-29 12:30",
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
    facilityId:
      spec.facilityId ??
      (spec.templateId === "TPL-LAB" ? "FAC-02" : "FAC-01"),
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

const cohortServices: Service[] = cohortSpecs.flatMap((spec) =>
  makeClaimServices(spec),
);

export const services: Service[] = [
  ...goldenServicesList,
  ...otherServices,
  ...cohortServices,
];

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

const slaDemoServices: Service[] = [
  makeService({
    id: "SVC-08442-01",
    patientId: "P-1002",
    providerId: "T-031",
    templateId: "TPL-PHYSIO",
    date: "2026-09-29",
    start: "09:00",
    servicePoint: "Ruang Fisioterapi 2",
    missing: {
      completion: "Catatan selesai pelayanan belum diinput",
      note: "Catatan klinis belum diinput",
    },
  }),
  makeService({
    id: "SVC-08442-02",
    patientId: "P-1008",
    providerId: "T-014",
    templateId: "TPL-DENTAL",
    date: "2026-09-29",
    start: "10:30",
    servicePoint: "Poli Gigi 1",
    missing: { billing: "Billing belum diterbitkan" },
  }),
];

export const allServices: Service[] = [
  ...services,
  ...todayServices,
  ...slaDemoServices,
];

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

function deriveClaimStatus(spec: ClaimSpec, list: Service[]): Claim["status"] {
  const template = templates.find((t) => t.id === spec.templateId);
  return evaluateClaim(
    list.map((s) => ({
      sessionId: s.sessionId as number,
      evaluation: evaluateSession(s.evidence, template?.required ?? []),
    })),
  ).status;
}

const cohortClaims: Claim[] = cohortSpecs.map((spec, i) => {
  const list = cohortServices.filter((s) => s.claimId === spec.id);
  return buildClaim(
    spec,
    list,
    spec.updated ?? `2026-09-29 12:${String(i).padStart(2, "0")}`,
    deriveClaimStatus(spec, list),
  );
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
  ...cohortClaims,
];

export const riskSignals: RiskSignal[] = [
  {
    id: "SIG-0001",
    claimId: GOLDEN_CLAIM_ID,
    sessionId: 9,
    code: "EVIDENCE_GAP",
    severity: "warning",
    message:
      "Sesi 09 tidak memiliki bukti tindakan dan penyelesaian.",
    at: `${APP_TODAY} 07:12`,
  },
  {
    id: "SIG-0002",
    claimId: GOLDEN_CLAIM_ID,
    sessionId: 10,
    code: "MISSING_COMPLETION",
    severity: "info",
    message: "Sesi 10 belum memiliki bukti penyelesaian.",
    at: `${APP_TODAY} 07:12`,
  },
  {
    id: "SIG-0003",
    claimId: "CLM-08433",
    sessionId: 2,
    code: "EVIDENCE_GAP",
    severity: "warning",
    message: "Sesi 02 radiologi belum terhubung ke hasil akuisisi.",
    at: `${APP_TODAY} 07:09`,
  },
  {
    id: "SIG-0004",
    claimId: "CLM-08416",
    sessionId: 2,
    code: "TIMESTAMP_CONFLICT",
    severity: "critical",
    message:
      "Billing tercatat 40 menit sebelum tindakan selesai pada sesi 02.",
    at: `${APP_TODAY} 07:15`,
  },
];

export const reviewHistory: ReviewAction[] = [
  {
    id: "RA-0001",
    claimId: "CLM-08409",
    action: "MARK_SUPPORTED",
    note: "Seluruh evidence sesi terverifikasi lengkap.",
    by: "Dewi Ananda",
    at: "2026-09-28 16:40",
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: "AUD-0017",
    at: `${APP_TODAY} 07:35`,
    user: "Sistem",
    action: "SLA_ESCALATED",
    entity: "Service",
    entityId: "SVC-08442-01",
    description:
      "Bukti pelayanan lewat tenggat diekskalasi ke Admin (kanal SYSTEM).",
  },
  {
    id: "AUD-0016",
    at: `${APP_TODAY} 07:30`,
    user: "Sistem",
    action: "SLA_REMINDER",
    entity: "Service",
    entityId: "SVC-08442-01",
    description:
      "Pengingat H-0 dikirim otomatis untuk bukti pelayanan 29 Sep (kanal SYSTEM).",
  },
  {
    id: "AUD-0015",
    at: `${APP_TODAY} 07:24`,
    user: "Sistem",
    action: "SIGNAL_GENERATED",
    entity: "Signal",
    entityId: "SIGC-08615-TIMESTAMP_CONFLICT-02",
    description: "Sinyal konflik timestamp dihasilkan untuk CLM-08615.",
  },
  {
    id: "AUD-0014",
    at: `${APP_TODAY} 07:22`,
    user: "Sistem",
    action: "SIGNAL_GENERATED",
    entity: "Signal",
    entityId: "SIGC-08610-PEER_OUTLIER-C",
    description: "Sinyal outlier peer dihasilkan untuk CLM-08610.",
  },
  {
    id: "AUD-0013",
    at: `${APP_TODAY} 07:20`,
    user: "Sistem",
    action: "SIGNAL_GENERATED",
    entity: "Signal",
    entityId: "SIGC-08609-BILLING_BEFORE_PASSPORT-01",
    description:
      "Sinyal billing tanpa jejak klinis dihasilkan untuk CLM-08609.",
  },
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
      "Evidence gap treatment & completion dihasilkan untuk sesi 09.",
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
    role: "operator",
    action: "BILLING_CREATED",
    entity: "Billing",
    entityId: "BLG-SVC-08430-05",
    description: "Billing dibuat untuk episode Poli Gigi sesi 05.",
  },
  {
    id: "AUD-0007",
    at: `${APP_TODAY} 06:58`,
    user: "Dewi Ananda",
    role: "reviewer",
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
    description: "Sesi 09 tertaut ke klaim CLM-08421.",
  },
  {
    id: "AUD-0005",
    at: `2026-09-10 09:52`,
    user: "Sistem",
    action: "BILLING_CREATED",
    entity: "Billing",
    entityId: "BLG-SVC-08421-09",
    description: "Billing dibuat untuk sesi 09.",
  },
  {
    id: "AUD-0004",
    at: `2026-09-10 09:48`,
    user: "Arif Nugroho",
    role: "provider",
    action: "EVIDENCE_ADDED",
    entity: "Evidence",
    entityId: "E-09-04",
    description: "Catatan klinis sesi 09 ditambahkan.",
  },
  {
    id: "AUD-0003",
    at: `2026-09-10 09:02`,
    user: "Sari Wijaya",
    role: "operator",
    action: "EVIDENCE_ADDED",
    entity: "Evidence",
    entityId: "E-09-02",
    description: "Verifikasi provider sesi 09 tercatat.",
  },
  {
    id: "AUD-0002",
    at: `2026-09-10 08:54`,
    user: "Sari Wijaya",
    role: "operator",
    action: "SERVICE_STARTED",
    entity: "Service",
    entityId: "SVC-08421-09",
    description: "Pelayanan fisioterapi sesi 09 dimulai.",
  },
  {
    id: "AUD-0001",
    at: `2026-09-28 16:40`,
    user: "Dewi Ananda",
    role: "reviewer",
    action: "REVIEW_ACTION",
    entity: "Review",
    entityId: "CLM-08409",
    description: "Aksi tinjauan: Tandai Didukung untuk CLM-08409.",
  },
];

export const notifications: Notification[] = [
  {
    id: "NTF-0005",
    title: "Eskalasi admin — bukti lewat SLA",
    body: "Bukti pelayanan melewati tenggat; ditandai LATE dan diteruskan ke Admin.",
    at: `${APP_TODAY} 07:35`,
    read: false,
  },
  {
    id: "NTF-0004",
    title: "Pengingat H-0 bukti pelayanan",
    body: "Bukti pelayanan 29 Sep jatuh tempo hari ini — lengkapi sebelum 17:00.",
    at: `${APP_TODAY} 07:30`,
    read: false,
  },
  {
    id: "NTF-0001",
    title: "CLM-08421 menunggu tinjauan",
    body: "2 dari 10 sesi memiliki evidence gap.",
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

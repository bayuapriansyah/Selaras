import type { EvidenceKind, SignalCode } from "@/data/app/types";
import { APP_TODAY } from "@/data/app/seed";

/**
 * SELARAS Integrity Mesh — synthetic network simulation.
 * Semua data di file ini sintetis (bukan faskes/klaim JKN riil).
 * Tidak ada PHI: signature hanya berisi pola, kondisi, dan kontrol.
 */

export type ProposalStatus =
  | "DRAFT"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type SignatureStatus =
  | "VALIDATED"
  | "ACTIVE"
  | "MONITORED"
  | "UPDATED"
  | "RETIRED";

export type SignatureSeverity = "LOW" | "MEDIUM" | "HIGH";

export type AdaptiveLevel =
  | "LEVEL1"
  | "LEVEL2"
  | "LEVEL3"
  | "LEVEL4";

export type VerificationResult =
  | "PASS"
  | "NEEDS_CLARIFICATION"
  | "HUMAN_REVIEW";

export type FeedbackOutcome =
  | "CONFIRMED"
  | "CLEARED"
  | "FALSE_POSITIVE"
  | "NEEDS_MORE_DATA";

export type NetworkCondition =
  | { kind: "template"; templateId: string }
  | { kind: "facility"; facilityIds: string[] }
  | { kind: "minItems"; n: number }
  | { kind: "sameProviderWindow"; days: number }
  | { kind: "missingEvidence"; kinds: EvidenceKind[] }
  | { kind: "localSignal"; code: SignalCode };

export type RiskSignature = {
  id: string;
  name: string;
  pattern: string;
  whyItMatters: string;
  serviceScope: string;
  detectionConditions: NetworkCondition[];
  signalNotes: string[];
  requiredEvidence: string[];
  recommendedControl: string;
  severity: SignatureSeverity;
  version: number;
  status: SignatureStatus;
  createdBy: string;
  validatedBy?: string;
  createdAt: string;
  updatedAt: string;
  originFacilityId?: string;
  originClaimId?: string;
  falsePositiveRate?: number;
  retiredReason?: string;
};

export type NetworkProposal = {
  id: string;
  proposedSignatureId: string;
  status: ProposalStatus;
  name: string;
  pattern: string;
  detectionConditions: NetworkCondition[];
  signalNotes: string[];
  requiredEvidence: string[];
  recommendedControl: string;
  severity: SignatureSeverity;
  serviceScope: string;
  originClaimId?: string;
  originFacilityId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  revisionNote?: string;
  decidedBy?: string;
  decidedAt?: string;
};

export type SignatureMatch = {
  key: string;
  signatureId: string;
  claimId: string;
  facilityId: string;
  matchedConditions: NetworkCondition[];
};

export type SignatureFeedback = {
  id: string;
  matchKey: string;
  signatureId: string;
  claimId: string;
  result: VerificationResult;
  outcome: FeedbackOutcome;
  note?: string;
  by: string;
  at: string;
};

export type NetworkFacility = {
  id: string;
  node: "A" | "B" | "C" | "D";
  role: string;
};

export const MESH_FACILITIES: NetworkFacility[] = [
  { id: "FAC-01", node: "A", role: "Faskes asal pola (origin)" },
  { id: "FAC-03", node: "B", role: "Faskes peer jaringan" },
  { id: "FAC-04", node: "C", role: "Faskes peer jaringan" },
  { id: "FAC-05", node: "D", role: "Faskes peer jaringan" },
];

export const MESH_FACILITY_IDS = MESH_FACILITIES.map((f) => f.id);

export const NETWORK_SIMULATION_LABEL = "Simulasi Jaringan Prototipe";

export const ADAPTIVE_ACTION: Record<AdaptiveLevel, string> = {
  LEVEL1: "LOLOS",
  LEVEL2: "MINTA BUKTI TAMBAHAN",
  LEVEL3: "VERIFIKASI LANJUTAN",
  LEVEL4: "TINJAUAN MANUSIA",
};

export const ADAPTIVE_LEVEL_LABEL: Record<AdaptiveLevel, string> = {
  LEVEL1: "Level 1 — Normal",
  LEVEL2: "Level 2 — Kekurangan Bukti",
  LEVEL3: "Level 3 — Match Jaringan",
  LEVEL4: "Level 4 — Multi Sinyal",
};

export const VERIFICATION_RESULT_OUTCOME: Record<
  VerificationResult,
  FeedbackOutcome
> = {
  PASS: "CLEARED",
  NEEDS_CLARIFICATION: "NEEDS_MORE_DATA",
  HUMAN_REVIEW: "CONFIRMED",
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: "USULAN",
  REVISION_REQUESTED: "REVISI DIMINTA",
  APPROVED: "DISETUJUI",
  REJECTED: "DITOLAK",
};

export const SIGNATURE_STATUS_LABEL: Record<SignatureStatus, string> = {
  VALIDATED: "DIVALIDASI",
  ACTIVE: "AKTIF",
  MONITORED: "DIPANTAU",
  UPDATED: "DIPERBARUI",
  RETIRED: "TIDAK BERLAKU",
};

export const SEVERITY_LABEL: Record<SignatureSeverity, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
};

export const signatureSeeds: RiskSignature[] = [
  {
    id: "RS-017",
    name: "Repeated Service Representation",
    pattern:
      "Satu episode layanan fisioterapi direpresentasikan pada lebih dari satu klaim dalam jendela waktu pendek pada provider/faskes yang sama.",
    whyItMatters:
      "Pola ini ditemukan dari tinjauan klaim fisioterapi lokal, lalu divalidasi Reviewer. Tanpa kontrol, episode ganda lolos ke tahap pembayaran karena tiap klaim terlihat lengkap secara terpisah.",
    serviceScope: "Fisioterapi · seluruh faskes jaringan",
    detectionConditions: [
      { kind: "template", templateId: "TPL-PHYSIO" },
      { kind: "sameProviderWindow", days: 14 },
    ],
    signalNotes: [
      "same service family",
      "overlapping claim period",
      "same provider within 14 days",
      "reused evidence reference pattern",
    ],
    requiredEvidence: [
      "Bukti penyelesaian tiap episode",
      "Tautan episode unik ke klaim",
      "Dokumen pendukung pelayanan",
    ],
    recommendedControl: "Verifikasi keunikan episode layanan (step-up)",
    severity: "MEDIUM",
    version: 1,
    status: "VALIDATED",
    createdBy: "Dewi Ananda",
    validatedBy: "Dewi Ananda",
    createdAt: `${APP_TODAY} 07:40`,
    updatedAt: `${APP_TODAY} 07:40`,
    originFacilityId: "FAC-01",
    originClaimId: "CLM-08421",
  },
  {
    id: "RS-018",
    name: "Missing Completion Evidence",
    pattern:
      "Klaim fisioterapi memiliki sesi tanpa bukti penyelesaian (completion) namun tetap dibillingkan.",
    whyItMatters:
      "Sesi tanpa penyelesaian berarti pelayanan tidak dapat dibuktikan tuntas; klaim semacam ini dominan pada tinjauan awal faskes asal.",
    serviceScope: "Fisioterapi · faskes asal (FAC-01)",
    detectionConditions: [
      { kind: "template", templateId: "TPL-PHYSIO" },
      { kind: "facility", facilityIds: ["FAC-01"] },
      { kind: "missingEvidence", kinds: ["completion"] },
    ],
    signalNotes: [
      "completion evidence missing",
      "billing present without completion",
      "service status not SELESAI",
    ],
    requiredEvidence: [
      "Bukti penyelesaian sesi",
      "Catatan klinis terhubung",
    ],
    recommendedControl: "Minta bukti penyelesaian sebelum proses lanjut",
    severity: "MEDIUM",
    version: 1,
    status: "ACTIVE",
    createdBy: "Dewi Ananda",
    validatedBy: "Rina Kusuma",
    createdAt: `${APP_TODAY} 06:30`,
    updatedAt: `${APP_TODAY} 06:45`,
    originFacilityId: "FAC-01",
    originClaimId: "CLM-08421",
  },
  {
    id: "RS-019",
    name: "Claim-Service Linkage Gap",
    pattern:
      "Billing tercatat sebelum pelayanan memiliki jejak kelengkapan (passport) — tautan klaim–layanan lemah.",
    whyItMatters:
      "Klaim yang menagih lebih dulu daripada bukti layanan menandakan alur pelayanan → billing tidak tertaut dengan benar.",
    serviceScope: "Semua jenis layanan · faskes jaringan",
    detectionConditions: [
      { kind: "localSignal", code: "BILLING_BEFORE_PASSPORT" },
    ],
    signalNotes: [
      "billing exists before completion evidence",
      "service passport incomplete at billing time",
    ],
    requiredEvidence: [
      "Urutan bukti layanan yang benar",
      "Tautan billing ke episode layanan",
    ],
    recommendedControl: "Verifikasi tautan klaim–layanan sebelum proses lanjut",
    severity: "HIGH",
    version: 1,
    status: "ACTIVE",
    createdBy: "Rina Kusuma",
    validatedBy: "Dewi Ananda",
    createdAt: `2026-09-27 10:15`,
    updatedAt: `2026-09-27 10:30`,
    originFacilityId: "FAC-04",
    originClaimId: "CLM-08609",
  },
  {
    id: "RS-016",
    name: "Duplicate Encounter Window",
    pattern:
      "Encounter dengan jendela waktu identik muncul pada dua klaim berbeda.",
    whyItMatters:
      "Signature ini ditarik setelah tingkat false positive tinggi pada monitoring — dipakai untuk menunjukkan siklus hidup governance.",
    serviceScope: "Rawat jalan · faskes jaringan",
    detectionConditions: [
      { kind: "localSignal", code: "DUPLICATE_SESSION" },
    ],
    signalNotes: ["duplicate encounter window", "identical timestamp range"],
    requiredEvidence: ["Konfirmasi jendela encounter"],
    recommendedControl: "Review manual — jangan otomatis blokir",
    severity: "LOW",
    version: 2,
    status: "RETIRED",
    createdBy: "Rina Kusuma",
    validatedBy: "Dewi Ananda",
    createdAt: "2026-09-18 09:00",
    updatedAt: "2026-09-26 15:20",
    originFacilityId: "FAC-04",
    falsePositiveRate: 0.31,
    retiredReason:
      "False positive 31% pada monitoring — diturunkan menjadi RETIRED dan digantikan kontrol berbasis bukti penyelesaian.",
  },
];

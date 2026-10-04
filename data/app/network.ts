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
  | { kind: "localSignal"; code: SignalCode }
  /** Phase 7 (A2 structural): klaim lain pada faskes & template sama, provider
   * berbagi, dan jendela layanan tumpang tindih. `days` (default 0) adalah
   * toleransi jarak antar jendela dalam hari — 0 berarti overlap ketat. */
  | { kind: "sameProviderOverlap"; days?: number }
  /** Phase 7: seluruh sesi klaim lengkap (semua bukti wajib terpenuh). */
  | { kind: "sessionsComplete" };

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
  /** Phase 8 — kontrol verifikasi khusus risiko (field additive, opsional;
   * jika tidak ada, controlsOf() menurunkannya dari detectionConditions). */
  recommendedControls?: RecommendedControl[];
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

/** Phase 8 — tautan bukti untuk kontrol verifikasi (route yang sudah ada). */
export type ControlEvidenceLink =
  | "passport"
  | "attestation"
  | "session"
  | "claimTrace";

/**
 * Phase 8 — RecommendedControl: representasi domain kontrol yang direkomendasikan
 * sebuah Risk Signature (bukan array UI hardcode). Dideklarasikan pada signature
 * (`recommendedControls`) atau diturunkan dari detectionConditions oleh
 * controlsOf() di lib/app/network.ts.
 */
export type RecommendedControl = {
  code: string;
  label: string;
  reason: string;
  required: boolean;
  evidence: ControlEvidenceLink;
};

export type VerificationStepStatus = "PENDING" | "VERIFIED";

/** Phase 8 — langkah verifikasi tersimpan per sesi (state checklist). */
export type VerificationStep = {
  id: string;
  signatureId: string;
  code: string;
  label: string;
  reason: string;
  status: VerificationStepStatus;
  required: boolean;
  evidence: ControlEvidenceLink;
  checkedBy?: string;
  checkedAt?: string;
};

export type VerificationSessionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

/**
 * Phase 8 — verification session (persist via PersistedState, tanpa backend).
 * Status sesi terpisah dari outcome hasil (§18).
 */
export type VerificationSession = {
  id: string;
  matchKey: string;
  claimId: string;
  signatureId: string;
  level: AdaptiveLevel;
  status: VerificationSessionStatus;
  steps: VerificationStep[];
  startedBy: string;
  startedAt: string;
  completedBy?: string;
  completedAt?: string;
  result?: FeedbackOutcome;
  note?: string;
};

export type NetworkFacility = {
  id: string;
  node: "A" | "B" | "C" | "D";
  role: string;
};

/**
 * Phase 9 — jenis transisi governance yang tercatat pada riwayat signature.
 * Bukan status signature: lifecycle enum SignatureStatus tidak berubah (§12).
 */
export type SignatureHistoryKind = "MONITORED" | "UPDATE" | "RETIRED";

/**
 * Phase 9 — riwayat versi & lifecycle per signature (persist via PersistedState).
 *
 * - kind UPDATE menyimpan versi sebelumnya + alasan + siapa + waktu + kondisi
 *   deteksi lama (§8/§10); version = versi BARU setelah update.
 * - snapshotMatches dibekukan pada momen transisi sehingga match historis tetap
 *   terlihat setelah signature dipantau/diperbarui/dipensiunkan, DAN match lama
 *   tidak dipindahkan ke versi baru secara otomatis (label `version` = versi
 *   yang menghasilkan match tersebut).
 */
export type SignatureHistoryRecord = {
  id: string;
  signatureId: string;
  kind: SignatureHistoryKind;
  /** Versi signature pada saat transisi; untuk UPDATE = versi baru. */
  version: number;
  previousVersion: number;
  previousStatus: SignatureStatus;
  newStatus: SignatureStatus;
  changeReason: string;
  updatedBy: string;
  updatedAt: string;
  /** Kondisi deteksi sebelum transisi — dipertahankan untuk audit/riwayat. */
  previousConditions: NetworkCondition[];
  previousPattern: string;
  /** Snapshot match (evaluasi kondisi saat itu) — historical matches. */
  snapshotMatches: SignatureMatch[];
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
  LEVEL3: "VERIFIKASI STEP-UP",
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

/** Phase 8 — outcome yang boleh disubmit reviewer (§6; FALSE_POSITIVE tetap
 * didukung model feedback tetapi bukan tombol submit — governance = Phase 9). */
export const SUBMITTABLE_OUTCOMES = [
  "CLEARED",
  "NEEDS_MORE_DATA",
  "CONFIRMED",
] as const;

export type SubmittableOutcome = (typeof SUBMITTABLE_OUTCOMES)[number];

/** Pemetaan balik outcome submit → VerificationResult field SignatureFeedback. */
export const OUTCOME_RESULT: Record<SubmittableOutcome, VerificationResult> = {
  CLEARED: "PASS",
  NEEDS_MORE_DATA: "NEEDS_CLARIFICATION",
  CONFIRMED: "HUMAN_REVIEW",
};

export const OUTCOME_LABEL: Record<FeedbackOutcome, string> = {
  CLEARED: "CLEARED",
  NEEDS_MORE_DATA: "NEEDS MORE DATA",
  CONFIRMED: "CONFIRMED",
  FALSE_POSITIVE: "FALSE POSITIVE",
};

export const OUTCOME_MEANING: Record<SubmittableOutcome, string> = {
  CLEARED: "Sinyal tidak lagi membutuhkan eskalasi berdasarkan verifikasi ini.",
  NEEDS_MORE_DATA:
    "Bukti belum cukup — reviewer/provider dapat diminta melengkapi evidence.",
  CONFIRMED:
    "Pola tetap didukung hasil verifikasi — tetap menjadi finding untuk keputusan manusia.",
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
      "Satu episode layanan fisioterapi direpresentasikan pada lebih dari satu klaim dengan jendela layanan yang tumpang tindih pada provider dan faskes yang sama.",
    whyItMatters:
      "Pola ini ditemukan dari tinjauan klaim fisioterapi lokal, lalu divalidasi Reviewer. Tanpa kontrol, episode ganda lolos ke tahap pembayaran karena tiap klaim terlihat lengkap secara terpisah.",
    serviceScope: "Fisioterapi · jaringan faskes (scope FAC-03)",
    detectionConditions: [
      { kind: "template", templateId: "TPL-PHYSIO" },
      { kind: "facility", facilityIds: ["FAC-03"] },
      { kind: "sameProviderOverlap" },
      { kind: "sessionsComplete" },
    ],
    signalNotes: [
      "same facility & same provider",
      "overlapping service window",
      "every session complete — each claim looks complete individually",
      "physiotherapy scope at FAC-03",
    ],
    requiredEvidence: [
      "Bukti penyelesaian tiap episode",
      "Tautan episode unik ke klaim",
      "Dokumen pendukung pelayanan",
    ],
    recommendedControl: "Verifikasi keunikan episode layanan (step-up)",
    recommendedControls: [
      {
        code: "SERVICE_UNIQUENESS",
        label: "Service uniqueness",
        reason: "Confirm that this service episode is represented only once.",
        required: true,
        evidence: "passport",
      },
      {
        code: "PROVIDER_ATTESTATION",
        label: "Provider attestation",
        reason: "Confirm provider attestation exists for this episode.",
        required: true,
        evidence: "attestation",
      },
      {
        code: "COMPLETION_EVIDENCE",
        label: "Completion evidence",
        reason: "Confirm required completion evidence exists.",
        required: true,
        evidence: "session",
      },
      {
        code: "BILLING_LINKAGE",
        label: "Billing linkage",
        reason: "Confirm billing points to the same service episode.",
        required: true,
        evidence: "claimTrace",
      },
    ],
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
    serviceScope: "Fisioterapi · seluruh faskes jaringan",
    detectionConditions: [
      { kind: "template", templateId: "TPL-PHYSIO" },
      { kind: "missingEvidence", kinds: ["completion"] },
    ],
    signalNotes: [
      "session-level completion gap",
      "billing present without completion",
      "one or more sessions missing completion evidence",
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

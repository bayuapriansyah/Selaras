import type { ReviewActionKind } from "@/data/app/types";

export const AUDIT_LABEL: Record<string, string> = {
  SERVICE_STARTED: "Pelayanan dimulai",
  SERVICE_COMPLETED: "Pelayanan selesai",
  EVIDENCE_ADDED: "Bukti ditambahkan",
  CLINICAL_NOTE_ADDED: "Catatan klinis ditambahkan",
  BILLING_CREATED: "Billing dibuat",
  CLAIM_LINKED: "Klaim tertaut",
  SIGNAL_GENERATED: "Sinyal dihasilkan",
  CLAIM_REVIEWED: "Klaim ditinjau",
  REVIEW_ACTION: "Aksi tinjauan",
  CLARIFICATION_REQUESTED: "Klarifikasi diminta",
  QR_VERIFIED: "Sesi dibuka via QR",
  QR_REJECTED: "Scan QR ditolak",
  SLA_REMINDER: "Pengingat SLA dikirim",
  SLA_ESCALATED: "Eskalasi SLA ke Admin",
  ROLE_CHANGED: "Role diubah",
  SIG_PROPOSED: "Risk Signature diusulkan",
  SIG_APPROVED: "Proposal disetujui",
  SIG_REJECTED: "Proposal ditolak",
  SIG_REVISION: "Revisi proposal diminta",
  SIG_PUBLISHED: "Risk Signature dipublikasikan",
  SIG_MONITORED: "Risk Signature dipantau",
  SIG_UPDATED: "Risk Signature diperbarui",
  SIG_RETIRED: "Risk Signature dipensiunkan",
  NET_MATCH: "Match jaringan aktif",
  NET_VERIFICATION_STARTED: "Verifikasi step-up dimulai",
  NET_VERIFICATION_RESULT: "Hasil verifikasi step-up",
  IDENTITY_BOUND: "Identitas terikat",
  SERVICE_ANCHORED: "Anchor layanan tercatat",
  SERVICE_ATTESTED: "Attestasi provider",
  ANCHOR_MISMATCH: "Konteks anchor tidak cocok",
  EVIDENCE_RECORDED: "Bukti terekam",
  EVIDENCE_UPDATED: "Bukti diperbarui",
  PROOF_ASSESSED: "Proof dinilai",
  PROOF_SEALED: "Proof diseal",
  PROVENANCE_RECORDED: "Provenance direkam",
};

export const REVIEW_LABEL: Record<ReviewActionKind, string> = {
  NEED_CLARIFICATION: "Minta Klarifikasi",
  MARK_SUPPORTED: "Tandai Didukung",
  RETURN_FOR_REVIEW: "Kembalikan untuk Tinjauan",
};

export const ROLE_LABEL: Record<string, string> = {
  operator: "Operator Faskes",
  provider: "Provider",
  reviewer: "Reviewer",
  admin: "Admin",
};

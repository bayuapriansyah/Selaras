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

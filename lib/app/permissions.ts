import type { EvidenceKind, Role } from "@/data/app/types";
import { ROLE_LABEL } from "@/lib/app/actions";

/**
 * Prototipe RBAC (mock auth demo) — bukan production authorization.
 * Satu sumber kebenaran untuk permission; UI tidak boleh menduplikasi aturan.
 */
export type Permission =
  | "startService"
  | "captureOperational"
  | "captureClinical"
  | "captureSystem"
  | "reviewClaim"
  | "proposeSignature"
  | "publishSignature"
  | "resetDemo"
  | "manageRoles";

export const PERMISSIONS: Permission[] = [
  "startService",
  "captureOperational",
  "captureClinical",
  "captureSystem",
  "reviewClaim",
  "proposeSignature",
  "publishSignature",
  "resetDemo",
  "manageRoles",
];

export const PERMISSION_LABEL: Record<Permission, string> = {
  startService: "Mulai pelayanan",
  captureOperational: "Catat evidence operasional",
  captureClinical: "Catat evidence klinis",
  captureSystem: "Catat billing / klaim",
  reviewClaim: "Tinjau & aksi klaim",
  proposeSignature: "Usulkan Risk Signature",
  publishSignature: "Publikasikan Risk Signature",
  resetDemo: "Reset demo",
  manageRoles: "Kelola role user lain",
};

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  operator: new Set<Permission>([
    "startService",
    "captureOperational",
    "captureSystem",
  ]),
  provider: new Set<Permission>(["captureClinical", "captureSystem"]),
  reviewer: new Set<Permission>(["reviewClaim", "proposeSignature"]),
  admin: new Set<Permission>([
    "startService",
    "captureOperational",
    "captureClinical",
    "captureSystem",
    "reviewClaim",
    "proposeSignature",
    "publishSignature",
    "resetDemo",
    "manageRoles",
  ]),
};

export const ROLES: Role[] = ["operator", "provider", "reviewer", "admin"];

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].has(permission);
}

export function captureKindPermission(kind: EvidenceKind): Permission {
  if (kind === "arrival" || kind === "provider") return "captureOperational";
  if (kind === "treatment" || kind === "note" || kind === "completion")
    return "captureClinical";
  return "captureSystem";
}

export const ROLE_REVIEW_HELPER: Record<Role, string> = {
  operator:
    "Operator dapat mencatat evidence pelayanan, tetapi tidak memiliki kewenangan untuk mengambil keputusan tinjauan klaim.",
  provider:
    "Provider dapat melengkapi evidence klinis dan merespons klarifikasi, tetapi tidak memiliki kewenangan untuk mengambil keputusan tinjauan klaim.",
  reviewer:
    "Reviewer berwenang meninjau evidence dan mengambil tindakan tinjauan klaim.",
  admin: "Admin memiliki akses administratif dan konfigurasi sistem.",
};

export const CAPTURE_HELPER: Record<Role, string> = {
  operator:
    "Peran Operator — evidence operasional (Kedatangan, Verifikasi Provider, Billing, Klaim) dapat dicatat; evidence klinis dicatat Provider.",
  provider:
    "Peran Provider — evidence klinis (Tindakan, Catatan Klinis, Penyelesaian) serta Billing dan Klaim dapat dicatat; Kedatangan & Verifikasi Provider dicatat Operator.",
  reviewer:
    "Peran Reviewer — peran ini meninjau klaim; pencatatan evidence dilakukan Operator dan Provider.",
  admin:
    "Peran Admin — seluruh pencatatan evidence tersedia pada mode demo ini.",
};

export function captureDenyTitle(role: Role): string {
  return `Tidak diizinkan untuk peran ${ROLE_LABEL[role] ?? role}.`;
}

export const PERMISSION_ROLES: Record<Permission, Role[]> = {
  startService: ["operator", "admin"],
  captureOperational: ["operator", "admin"],
  captureClinical: ["provider", "admin"],
  captureSystem: ["operator", "provider", "admin"],
  reviewClaim: ["reviewer", "admin"],
  proposeSignature: ["reviewer", "admin"],
  publishSignature: ["admin"],
  resetDemo: ["admin"],
  manageRoles: ["admin"],
};

export function rolesLabel(permission: Permission): string {
  return PERMISSION_ROLES[permission]
    .map((r) => ROLE_LABEL[r] ?? r)
    .join(" / ");
}

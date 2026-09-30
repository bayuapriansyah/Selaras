import type { Role } from "@/data/app/types";

const QR_PREFIX = "SEL1";

/**
 * Secret HMAC khusus demo.
 * PRODUKSI: secret harus hidup di server — klien hanya menerima token yang
 * sudah ditandatangani, bukan memverifikasi dirinya sendiri.
 */
const QR_SECRET = "SELARAS-DEMO-POC-2026";

export const QR_TTL_MINUTES = 30;

export type QrVerifyReason =
  | "FORMAT"
  | "SERVICE"
  | "SIGNATURE"
  | "ROLE"
  | "EXPIRED";

export type QrVerifyResult = { ok: true } | { ok: false; reason: QrVerifyReason };

export const QR_REASON_MESSAGE: Record<QrVerifyReason, string> = {
  FORMAT: "Token tidak valid — pindai QR dari aplikasi SELARAS.",
  SERVICE: "Token tidak cocok dengan sesi layanan ini.",
  SIGNATURE: "Tanda tangan token tidak cocok — QR mungkin dimodifikasi.",
  ROLE: "Peran ini tidak berwenang membuka sesi — serahkan ke Operator/Provider.",
  EXPIRED: "QR kedaluwarsa — muat ulang halaman untuk QR baru.",
};

const ROLE_CHAR: Record<Role, string> = {
  operator: "O",
  provider: "P",
  reviewer: "R",
  admin: "A",
};

const CHAR_ROLE: Record<string, Role | undefined> = {
  O: "operator",
  P: "provider",
  R: "reviewer",
  A: "admin",
};

function fingerprint(serviceId: string): string {
  let h = 5381;
  for (let i = 0; i < serviceId.length; i += 1) {
    h = ((h << 5) + h + serviceId.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

function randomNonce(len: number): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const out: string[] = [];
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    for (const b of bytes) out.push(alphabet[b % alphabet.length]);
  } else {
    for (let i = 0; i < len; i += 1) {
      out.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }
  }
  return out.join("");
}

async function hmacTag(message: string): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(QR_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(message)),
  );
  return [...sig.slice(0, 6)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Token point-of-care: SEL1.<serviceId>.<nonce10><exp6><role1><sig12>
 * - nonce acak per render (anti-pra-komputasi)
 * - exp = menit-unix kedaluwarsa (TTL 30 menit)
 * - role diikat ke dalam tanda tangan (anti-buddy-scan)
 * - HMAC-SHA256, tanpa data pasien (tanpa PHI)
 * Fallback legacy (tanpa Web Crypto): SEL1.<serviceId>.<fingerprint6>.
 */
export async function mintQrToken(input: {
  serviceId: string;
  role: Role;
}): Promise<string> {
  const { serviceId, role } = input;
  const nonce = randomNonce(10);
  const exp = Math.floor(Date.now() / 60000) + QR_TTL_MINUTES;
  const expPart = exp.toString(36).toUpperCase().padStart(6, "0");
  const roleChar = ROLE_CHAR[role] ?? "R";
  const tag = await hmacTag(
    `${serviceId}|${roleChar}|${expPart}|${nonce}`,
  );
  if (!tag) {
    return `${QR_PREFIX}.${serviceId}.${fingerprint(serviceId)}`;
  }
  const seg = `${nonce}${expPart}${roleChar}${tag}`;
  return `${QR_PREFIX}.${serviceId}.${seg}`;
}

export async function verifyQrToken(
  token: string,
  input: { serviceId: string; role: Role },
): Promise<QrVerifyResult> {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) {
    return { ok: false, reason: "FORMAT" };
  }
  if (parts[1] !== input.serviceId) {
    return { ok: false, reason: "SERVICE" };
  }
  const seg = parts[2];
  if (seg.length === 6) {
    return fingerprint(input.serviceId) === seg
      ? { ok: true }
      : { ok: false, reason: "SIGNATURE" };
  }
  if (seg.length !== 29) {
    return { ok: false, reason: "SIGNATURE" };
  }
  const nonce = seg.slice(0, 10);
  const expPart = seg.slice(10, 16);
  const roleChar = seg.slice(16, 17);
  const tag = seg.slice(17);
  const expected = await hmacTag(
    `${input.serviceId}|${roleChar}|${expPart}|${nonce}`,
  );
  if (!expected || tag !== expected) {
    return { ok: false, reason: "SIGNATURE" };
  }
  if (CHAR_ROLE[roleChar] !== input.role) {
    return { ok: false, reason: "ROLE" };
  }
  const exp = parseInt(expPart, 36);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 60000)) {
    return { ok: false, reason: "EXPIRED" };
  }
  return { ok: true };
}

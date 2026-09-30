const QR_PREFIX = "SEL1";

function fingerprint(serviceId: string): string {
  let h = 5381;
  for (let i = 0; i < serviceId.length; i += 1) {
    h = ((h << 5) + h + serviceId.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

/**
 * Token point-of-care: SEL1.<serviceId>.<fingerprint>.
 * Tidak memuat data pasien (tanpa PHI) — cukup identifikasi sesi layanan.
 */
export function makeQrToken(serviceId: string): string {
  return `${QR_PREFIX}.${serviceId}.${fingerprint(serviceId)}`;
}

export function parseQrToken(token: string): string | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) return null;
  if (fingerprint(parts[1]) !== parts[2]) return null;
  return parts[1];
}

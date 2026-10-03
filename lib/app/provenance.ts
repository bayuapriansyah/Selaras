/**
 * Integrity reference abstraction — deterministic, bukan klaim kriptografis.
 *
 * Hash non-kriptografis (FNV-1a dua seed) atas konten kanonik: identik untuk
 * konten/versi identik, berbeda untuk konten/versi berbeda. Tidak ada random,
 * Date.now, maupun jaringan di dalam perhitungan hash.
 */

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    const src = value as Record<string, unknown>;
    for (const key of Object.keys(src).sort()) {
      if (src[key] !== undefined) out[key] = sortDeep(src[key]);
    }
    return out;
  }
  return value;
}

export function canonicalContent(value: unknown): string {
  return JSON.stringify(sortDeep(value) ?? null);
}

function fnv1a(input: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= input.length;
  h = Math.imul(h, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export type IntegrityRefInput = {
  resourceId: string;
  resourceType: string;
  action: string;
  version: number;
  content: unknown;
};

export function integrityRefOf(input: IntegrityRefInput): string {
  const basis = [
    input.resourceType,
    input.resourceId,
    input.action,
    String(input.version),
    canonicalContent(input.content),
  ].join("|");
  return `int-${fnv1a(basis, 0x811c9dc5)}-${fnv1a(basis, 0x9dc5811c)}`;
}

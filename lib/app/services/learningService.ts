import type {
  FeedbackOutcome,
  SignatureFeedback,
  SignatureMatch,
} from "@/data/app/network";

/**
 * Phase 9 — Learning Loop metrics (derived, transparan, tanpa ML).
 *
 * Semua angka dihitung dari existing matches + SignatureFeedback store.
 * Tidak ada statistik yang dikarang; denominator 0 → null / "NOT ENOUGH DATA"
 * (bukan 0%). Feedback TIDAK pernah mengubah score/queue/payment/local status.
 */

export type FacilityCount = { facilityId: string; count: number };

export type LearningMetrics = {
  /** Jumlah match signature (live bila ACTIVE, snapshot historis bila tidak). */
  totalMatches: number;
  /** Jumlah feedback verifikasi untuk signature ini. */
  totalVerified: number;
  clearedCount: number;
  needsMoreDataCount: number;
  confirmedCount: number;
  falsePositiveCount: number;
  /** falsePositiveCount / totalVerified — null bila totalVerified === 0. */
  falsePositiveRate: number | null;
  /** totalVerified / totalMatches — null bila totalMatches === 0. */
  verificationRate: number | null;
  /** Unique facility dari SignatureMatch, urut count desc lalu id asc. */
  facilitiesMatched: FacilityCount[];
};

export type LearningRecommendation = "GOOD" | "MONITOR" | "INSUFFICIENT";

/**
 * Prototype governance rule (bukan aturan produksi, tanpa aksi otomatis):
 * evaluasi performance butuh minimal MIN_VERIFIED_FOR_EVALUATION verifikasi;
 * MONITOR saat falsePositiveRate >= MONITOR_FP_THRESHOLD.
 * Rekomendasi HANYA advisory — perubahan lifecycle tetap keputusan manusia.
 */
export const MIN_VERIFIED_FOR_EVALUATION = 3;
export const MONITOR_FP_THRESHOLD = 0.25;

export const RECOMMENDATION_TEXT: Record<LearningRecommendation, string> = {
  GOOD: "Signature performance currently stable.",
  MONITOR: "False positives are increasing; consider review.",
  INSUFFICIENT: "Not enough verified matches to evaluate performance.",
};

export const FALSE_POSITIVE_RATE_UNAVAILABLE = "NOT ENOUGH DATA";

/** Persentase 1 desimal: 1/6 → "16.7", 1/3 → "33.3", 0 → "0". */
export function percentLabel(rate: number | null): string | null {
  if (rate === null) return null;
  const pct = Math.round(rate * 1000) / 10;
  return String(pct);
}

export function learningMetrics(
  signatureId: string,
  matches: SignatureMatch[],
  allFeedbacks: SignatureFeedback[],
): LearningMetrics {
  const feedbacks = allFeedbacks.filter((f) => f.signatureId === signatureId);
  const counts: Record<FeedbackOutcome, number> = {
    CLEARED: 0,
    NEEDS_MORE_DATA: 0,
    CONFIRMED: 0,
    FALSE_POSITIVE: 0,
  };
  for (const f of feedbacks) counts[f.outcome] += 1;
  const totalVerified = feedbacks.length;
  const facilityMap = new Map<string, number>();
  for (const m of matches) {
    facilityMap.set(m.facilityId, (facilityMap.get(m.facilityId) ?? 0) + 1);
  }
  const facilitiesMatched = [...facilityMap.entries()]
    .map(([facilityId, count]) => ({ facilityId, count }))
    .sort((a, b) => (b.count - a.count) || a.facilityId.localeCompare(b.facilityId));
  return {
    totalMatches: matches.length,
    totalVerified,
    clearedCount: counts.CLEARED,
    needsMoreDataCount: counts.NEEDS_MORE_DATA,
    confirmedCount: counts.CONFIRMED,
    falsePositiveCount: counts.FALSE_POSITIVE,
    falsePositiveRate:
      totalVerified > 0 ? counts.FALSE_POSITIVE / totalVerified : null,
    verificationRate:
      matches.length > 0 ? totalVerified / matches.length : null,
    facilitiesMatched,
  };
}

export function recommendationOf(m: LearningMetrics): LearningRecommendation {
  if (m.totalVerified < MIN_VERIFIED_FOR_EVALUATION) return "INSUFFICIENT";
  if (
    m.falsePositiveRate !== null &&
    m.falsePositiveRate >= MONITOR_FP_THRESHOLD
  ) {
    return "MONITOR";
  }
  return "GOOD";
}

/** Observation transparan §4 — "Insufficient feedback data" bila belum ada data. */
export function observationLines(m: LearningMetrics): string[] {
  if (m.totalVerified === 0) return ["Insufficient feedback data"];
  const fp = m.falsePositiveCount;
  const rate = percentLabel(m.falsePositiveRate);
  return [
    `${m.totalVerified} match${m.totalVerified === 1 ? "" : "es"} evaluated`,
    `${fp} false positive${fp === 1 ? "" : "s"}`,
    `${rate}% false-positive rate`,
  ];
}

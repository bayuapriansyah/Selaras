import type { ClaimStatus } from "@/data/app/types";
import { GATE_THRESHOLD } from "@/lib/app/score";
import type { RiskScore } from "@/lib/app/score";

export type PaymentGate = {
  blocked: boolean;
  score: number;
  threshold: number;
  reason: string | null;
  action: string | null;
};

export function paymentGate(
  score: RiskScore,
  status: ClaimStatus,
): PaymentGate {
  const open: PaymentGate = {
    blocked: false,
    score: score.score,
    threshold: GATE_THRESHOLD,
    reason: null,
    action: null,
  };
  if (score.score >= GATE_THRESHOLD) {
    return {
      blocked: true,
      score: score.score,
      threshold: GATE_THRESHOLD,
      reason: `Skor risiko ${score.score} mencapai ambang gerbang ${GATE_THRESHOLD} — klaim ditahan sebelum pembayaran.`,
      action:
        "Minta klarifikasi via Clarification Copilot dan lengkapi evidence; gerbang terbuka otomatis saat skor turun di bawah 65.",
    };
  }
  if (status === "CONTRADICTED") {
    return {
      blocked: true,
      score: score.score,
      threshold: GATE_THRESHOLD,
      reason:
        "Status klaim CONTRADICTED — bukti saling bertentangan pada sesi berjalan.",
      action:
        "Selesaikan konflik timestamp pada sesi terkait sebelum klaim ditandai didukung.",
    };
  }
  return open;
}

import type { RiskSignal, SignalCode } from "@/data/app/types";

export type ScoreBand = "RENDAH" | "SEDANG" | "TINGGI";

export type ScoreContribution = {
  label: string;
  detail: string;
  points: number;
  code?: SignalCode;
  sessionId?: number;
};

export type RiskScore = {
  score: number;
  band: ScoreBand;
  contributions: ScoreContribution[];
  threshold: number;
};

export const GATE_THRESHOLD = 65;

const SEVERITY_POINTS: Record<RiskSignal["severity"], number> = {
  critical: 22,
  warning: 14,
  info: 7,
};

export function riskScoreOf(
  evaluation: { claimed: number; supported: number },
  signals: RiskSignal[],
): RiskScore {
  const contributions: ScoreContribution[] = signals.map((s) => ({
    label: `${s.code}${
      s.sessionId ? ` · Sesi ${String(s.sessionId).padStart(2, "0")}` : " · Klaim"
    }`,
    detail: s.message,
    points: SEVERITY_POINTS[s.severity],
    code: s.code,
    sessionId: s.sessionId,
  }));

  const coveragePoints =
    evaluation.claimed > 0
      ? Math.round(
          ((evaluation.claimed - evaluation.supported) / evaluation.claimed) *
            30,
        )
      : 0;
  if (coveragePoints > 0) {
    contributions.push({
      label: "Defisit cakupan bukti",
      detail: `${evaluation.supported} dari ${evaluation.claimed} sesi didukung bukti lengkap.`,
      points: coveragePoints,
    });
  }

  const score = Math.min(
    100,
    contributions.reduce((sum, c) => sum + c.points, 0),
  );
  const band: ScoreBand =
    score >= GATE_THRESHOLD ? "TINGGI" : score >= 35 ? "SEDANG" : "RENDAH";

  return { score, band, contributions, threshold: GATE_THRESHOLD };
}

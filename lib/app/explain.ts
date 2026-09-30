import { claimView, seedSource } from "@/lib/app/selectors";
import type { DataSource } from "@/lib/app/selectors";
import { impactOf } from "@/lib/app/rules";
import { EVIDENCE_LABEL } from "@/data/app/types";
import type { EvidenceKind } from "@/data/app/types";

export type ExplainGap = {
  sessionId: number;
  kinds: string[];
};

export type ExplainSectionKey =
  | "WHAT_WE_KNOW"
  | "IS_MISSING"
  | "IS_SUPPORTED"
  | "WHY_REVIEW"
  | "WHAT_TO_CHECK";

export type ExplainSection = {
  key: ExplainSectionKey;
  eyebrow: string;
  title: string;
  items: string[];
  emptyNote: string;
};

export type ExplainResult = {
  claimId: string;
  headline: string;
  paragraphs: string[];
  bullets: { label: string; value: string }[];
  gaps: ExplainGap[];
  sections: ExplainSection[];
  recommendation: string;
  disclaimer: string;
  generatedAt: string;
};

function listText(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} dan ${items[items.length - 1]}`;
}

export function buildExplanation(
  claimId: string,
  src: DataSource = seedSource,
): ExplainResult | null {
  const view = claimView(claimId, src);
  if (!view) return null;

  const { evaluation, template, patient, signals } = view;
  const impact = impactOf(
    template.rate,
    evaluation.claimed,
    evaluation.supported,
  );

  const gaps: ExplainGap[] = [];
  for (const s of view.sessions) {
    const missing = template.required.filter(
      (k: EvidenceKind) =>
        s.service.evidence?.find((e) => e.kind === k)?.state !== "present",
    );
    if (missing.length > 0) {
      gaps.push({
        sessionId: s.sessionId,
        kinds: missing.map((k) => EVIDENCE_LABEL[k]),
      });
    }
  }

  const pending = evaluation.claimed - evaluation.supported;
  const statusText =
    evaluation.status === "SUPPORTED"
      ? "seluruh sesi didukung evidence"
      : evaluation.status === "CONTRADICTED"
        ? "ditemukan konflik timestamp pada bukti"
        : evaluation.status === "INCOMPLETE"
          ? "terdapat sesi dengan bukti wajib belum lengkap"
          : "terdapat sesi yang menunggu verifikasi reviewer";

  const headline =
    pending > 0
      ? `${evaluation.supported} dari ${evaluation.claimed} sesi didukung; ${pending} sesi perlu tindak lanjut.`
      : `${evaluation.supported} dari ${evaluation.claimed} sesi didukung; klaim siap ditandai didukung.`;

  const gapSentence =
    gaps.length > 0
      ? `Kesenjangan ditemukan pada ${gaps
          .map(
            (g) =>
              `sesi ${String(g.sessionId).padStart(2, "0")} (${listText(g.kinds)})`,
          )
          .join("; ")}.`
      : "Tidak ada kesenjangan evidence pada klaim ini.";

  const signalSentence =
    signals.length > 0
      ? `Sinyal risiko aktif: ${listText(
          signals.map((s) => `${s.code} pada sesi ${s.sessionId ?? "-"}`),
        )}.`
      : "Tidak ada sinyal risiko aktif.";

  const paragraphs = [
    `Klaim ${claimId} untuk ${patient?.display ?? view.claim.patientId} (${template.name}, tarif Rp ${template.rate.toLocaleString("id-ID")} per sesi) ${statusText}.`,
    `${gapSentence} ${signalSentence}`,
    impact.reviewAmount > 0
      ? `Dampak finansial sementara: Rp ${impact.currentAmount.toLocaleString("id-ID")} diajukan, Rp ${impact.supportedAmount.toLocaleString("id-ID")} didukung evidence, dan Rp ${impact.reviewAmount.toLocaleString("id-ID")} (${impact.reviewSessions} sesi) berada dalam antrean tinjauan.`
      : `Seluruh nilai Rp ${impact.currentAmount.toLocaleString("id-ID")} didukung evidence dan dapat diproses ke tahap pembayaran.`,
  ];

  const recommendation =
    evaluation.status === "SUPPORTED"
      ? "Rekomendasi: klaim memenuhi syarat, tandai didukung dan lanjutkan ke verifikasi pembayaran."
      : evaluation.status === "CONTRADICTED"
        ? "Rekomendasi: tahan klaim, minta klarifikasi timestamp dari provider sebelum keputusan pembayaran."
        : gaps.length > 0
          ? "Rekomendasi: minta klarifikasi ke provider untuk melengkapi evidence yang kurang pada sesi terkait, lalu evaluasi ulang."
          : "Rekomendasi: verifikasi manual sesi yang ditandai sebelum menutup klaim.";

  const sections: ExplainSection[] = [
    {
      key: "WHAT_WE_KNOW",
      eyebrow: "WHAT WE KNOW",
      title: "Apa yang kami tahu",
      items: [
        paragraphs[0],
        `Sesi diajukan ${evaluation.claimed}, sesi didukung ${evaluation.supported}, sesi menunggu tinjauan ${pending}.`,
        `Tarif per sesi Rp ${template.rate.toLocaleString("id-ID")} · total diajukan Rp ${impact.currentAmount.toLocaleString("id-ID")}.`,
        `${view.sessions.length} sesi tercatat pada klaim ini.`,
      ],
      emptyNote: "Belum ada data klaim untuk diringkas.",
    },
    {
      key: "IS_MISSING",
      eyebrow: "IS MISSING",
      title: "Apa yang hilang",
      items: gaps.map(
        (g) =>
          `Sesi ${String(g.sessionId).padStart(2, "0")} — ${listText(g.kinds)} belum tercatat.`,
      ),
      emptyNote: "Tidak ada evidence wajib yang hilang.",
    },
    {
      key: "IS_SUPPORTED",
      eyebrow: "IS SUPPORTED",
      title: "Apa yang didukung",
      items: [
        `${evaluation.supported} dari ${evaluation.claimed} sesi sudah didukung evidence lengkap.`,
        `Nilai yang siap diproses Rp ${impact.supportedAmount.toLocaleString("id-ID")}.`,
      ],
      emptyNote: "Belum ada sesi yang seluruh evidence-nya lengkap.",
    },
    {
      key: "WHY_REVIEW",
      eyebrow: "WHY REVIEW",
      title: "Mengapa perlu ditinjau",
      items:
        signals.length > 0
          ? signals.map(
              (s) =>
                `${s.code} — ${s.message} (sesi ${s.sessionId ?? "-"})`,
            )
          : pending > 0
            ? [
                `${pending} sesi masih dalam antrean verifikasi manual reviewer.`,
              ]
            : [],
      emptyNote: "Tidak ada sinyal risiko — tidak ada alasan tinjauan khusus.",
    },
    {
      key: "WHAT_TO_CHECK",
      eyebrow: "WHAT TO CHECK",
      title: "Yang perlu diperiksa",
      items: [
        ...gaps.map(
          (g) =>
            `Lengkapi ${listText(g.kinds)} pada sesi ${String(g.sessionId).padStart(2, "0")} bersama provider.`,
        ),
        recommendation,
      ],
      emptyNote: "Tidak ada pemeriksaan lanjutan yang diperlukan.",
    },
  ];

  return {
    claimId,
    headline,
    paragraphs,
    bullets: [
      { label: "Status evaluasi", value: evaluation.status },
      { label: "Sesi didukung", value: `${evaluation.supported}/${evaluation.claimed}` },
      { label: "Antrean tinjauan", value: `Rp ${impact.reviewAmount.toLocaleString("id-ID")}` },
      { label: "Sinyal risiko", value: String(signals.length) },
    ],
    gaps,
    sections,
    recommendation,
    disclaimer:
      "Ringkasan otomatis dari aturan evidence (demo, tanpa model eksternal). Bukan nasihat medis.",
    generatedAt: new Date().toISOString(),
  };
}

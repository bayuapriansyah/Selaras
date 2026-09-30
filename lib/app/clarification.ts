import { EVIDENCE_LABEL } from "@/data/app/types";
import type { EvidenceKind } from "@/data/app/types";
import { formatDate } from "@/lib/app/format";
import type { ClaimView, SessionView } from "@/lib/app/selectors";
import { getFacility, getProvider } from "@/lib/app/selectors";

export const CLARIFICATION_DEADLINE = "2026-10-01";

export function problemSessions(view: ClaimView): SessionView[] {
  return view.sessions.filter((s) => s.evaluation.status !== "SUPPORTED");
}

function present(
  evidence: SessionView["service"]["evidence"],
  kind: EvidenceKind,
): boolean {
  return evidence.find((e) => e.kind === kind)?.state === "present";
}

export function missingOf(
  view: ClaimView,
  sessionId: number,
): { kind: EvidenceKind; reason: string }[] {
  const s = view.sessions.find((x) => x.sessionId === sessionId);
  if (!s) return [];
  const evidence = s.service.evidence ?? [];
  return view.template.required
    .filter((k) => !present(evidence, k))
    .map((k) => ({
      kind: k,
      reason:
        evidence.find((e) => e.kind === k)?.note ?? "Belum tercatat",
    }));
}

export function clarificationNote(
  view: ClaimView,
  sessionId: number,
): string {
  const missing = missingOf(view, sessionId);
  const labels = missing.map((m) => EVIDENCE_LABEL[m.kind]).join(", ");
  return `Klarifikasi sesi ${String(sessionId).padStart(2, "0")} — bukti belum tercatat: ${labels || "ketidaksesuaian bukti"}.`;
}

export function buildClarificationLetter(
  view: ClaimView,
  sessionId: number,
): string {
  const session = view.sessions.find((x) => x.sessionId === sessionId);
  if (!session) return "";
  const facility = getFacility(view.claim.facilityId);
  const provider = getProvider(session.service.providerId);
  const patient = view.patient?.display ?? view.claim.patientId;
  const missing = missingOf(view, sessionId);
  const nn = String(sessionId).padStart(2, "0");
  const number = `SELARAS/KLR/${view.claim.id.replace("CLM-", "")}/S${nn}`;
  const conflict = session.evaluation.status === "CONTRADICTED";

  const missingLines =
    missing.length > 0
      ? missing
          .map(
            (m, i) =>
              `   ${i + 1}. ${EVIDENCE_LABEL[m.kind]} — ${m.reason}`,
          )
          .join("\n")
      : "   1. Ketidaksesuaian kronologi bukti pada sesi ini.";

  return [
    `Yth. ${provider?.name ?? "Provider"} (${provider?.profession ?? "Tenaga pelayanan"}),`,
    `${facility?.name ?? view.claim.facilityId} — ${facility?.city ?? "-"}`,
    `d.i.n. ${view.template.name}`,
    "",
    "Sistem Integritas Bukti SELARAS — BPJS Kesehatan",
    `Nomor: ${number}`,
    "",
    "Perihal: Permintaan Klarifikasi Bukti Pelayanan",
    "",
    `Dengan ini kami meminta klarifikasi atas sesi ${nn} pada klaim ${view.claim.id} (${view.template.name}) untuk ${patient}, periode ${formatDate(view.claim.periodFrom)}–${formatDate(view.claim.periodTo)}, dengan rincian sebagai berikut:`,
    "",
    `   Tanggal pelayanan : ${session.service.date}, pukul ${session.service.startTime}${session.service.endTime ? `–${session.service.endTime}` : ""}`,
    `   Status evaluasi   : ${session.evaluation.status}`,
    `   Bukti terkait     :`,
    missingLines,
    ...(conflict
      ? [
          "",
          "   Kronologi terindikasi konflik timestamp: billing tercatat sebelum tindakan selesai, sehingga sesi ini berstatus CONTRADICTED.",
        ]
      : []),
    "",
    `Mohon kelengkapan bukti dan penjelasan dikirimkan melalui Service Passport ${session.service.id} paling lambat ${formatDate(CLARIFICATION_DEADLINE)}. Jawaban akan ditautkan otomatis ke audit trail klaim ${view.claim.id}.`,
    "",
    "Hormat kami,",
    "Dewi Ananda — Reviewer Integritas Bukti",
    "SELARAS · Sistem Antisipasi Klaim Fiktif",
  ].join("\n");
}

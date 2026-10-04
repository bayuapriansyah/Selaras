import type { Role } from "@/data/app/types";
import {
  signatureSeeds,
  type SignatureFeedback,
  type SignatureMatch,
} from "@/data/app/network";
import {
  buildDataSource,
  initialPersistedState,
  type PersistedState,
} from "@/lib/app/appState";
import { claimView, queueRows, seedSource } from "@/lib/app/selectors";
import { allMatches, signatureBundle } from "@/lib/app/network";
import * as netSvc from "@/lib/app/services/networkService";
import {
  FALSE_POSITIVE_RATE_UNAVAILABLE,
  learningMetrics,
  MIN_VERIFIED_FOR_EVALUATION,
  MONITOR_FP_THRESHOLD,
  observationLines,
  percentLabel,
  recommendationOf,
  RECOMMENDATION_TEXT,
} from "@/lib/app/services/learningService";
import {
  conditionInputValue,
  historyOf,
  monitorSignature,
  parseConditionInput,
  retireSignature,
  updateSignature,
} from "@/lib/app/services/governanceService";
import {
  startNetworkVerification,
  submitNetworkVerification,
  toggleVerificationStep,
} from "@/lib/app/services/verificationService";

/**
 * Phase 9 — Learning Loop + Signature Monitoring/Governance (§A–O).
 *
 * A–E: metrik transparan dari feedback (tanpa ML, denominator 0 → null).
 * F–J: monitor/update/retire tanpa overwrite versi lama + snapshot historis.
 * K: feedback ganda dicegah. L: RBAC reuse permission existing.
 * M: audit sekali per transisi (idempoten). N: metrik RS-017 aktual.
 * O: semantik match RS-018 tidak berubah. Pipeline klaim terkunci (§21).
 */

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const REV: { name: string; role: Role } = { name: "Dewi Ananda", role: "reviewer" };
const PROV: { name: string; role: Role } = { name: "Arif Nugroho", role: "provider" };
const OP: { name: string; role: Role } = { name: "Sari Wijaya", role: "operator" };
const ADM: { name: string; role: Role } = { name: "Bima Santoso", role: "admin" };

const auditOf = (s: PersistedState, action: string) =>
  s.audit.filter((a) => a.action === action);

const srcOf = (s: PersistedState) => buildDataSource(s);
const bundleOf = (s: PersistedState) =>
  signatureBundle(signatureSeeds, s.proposals, s.signatureStatus, s.signatureDefinitions);
const runtimeOf = (s: PersistedState) => ({
  statusOverrides: s.signatureStatus,
  proposals: s.proposals,
  feedbacks: s.feedbacks,
  definitions: s.signatureDefinitions,
});
const matchesOf = (s: PersistedState, sigId: string) =>
  allMatches(bundleOf(s).active, srcOf(s)).filter((m) => m.signatureId === sigId);
const seedOf = (id: string) => signatureSeeds.find((s) => s.id === id)!;

const scoreBefore = JSON.stringify(claimView("CLM-08611", seedSource)?.score);
const queueBefore = JSON.stringify(queueRows(undefined, seedSource));

let state: PersistedState = {
  ...initialPersistedState,
  signatureStatus: { "RS-017": "ACTIVE" },
};

const fb = (
  i: number,
  sigId: string,
  claimId: string,
  outcome: SignatureFeedback["outcome"],
  result: SignatureFeedback["result"],
): SignatureFeedback => ({
  id: `FB-TEST-${i}`,
  matchKey: `${sigId}|${claimId}`,
  signatureId: sigId,
  claimId,
  result,
  outcome,
  by: "Dewi Ananda",
  at: "2026-10-04 10:00",
});

const mkMatch = (key: string, claimId: string, facilityId: string): SignatureMatch => ({
  key,
  signatureId: "RS-018",
  claimId,
  facilityId,
  matchedConditions: [],
});

// ---------- A. Tanpa feedback → rate null / "NOT ENOUGH DATA" ----------
console.log("A. learning metrics tanpa feedback");
{
  const matches = matchesOf(state, "RS-018");
  const m = learningMetrics("RS-018", matches, []);
  check("matches RS-018 = 5", matches.length === 5, String(matches.length));
  check("totalVerified = 0", m.totalVerified === 0);
  check("falsePositiveRate = null (denominator 0)", m.falsePositiveRate === null);
  check("percentLabel(null) = null", percentLabel(m.falsePositiveRate) === null);
  check(
    "rate text = NOT ENOUGH DATA",
    FALSE_POSITIVE_RATE_UNAVAILABLE === "NOT ENOUGH DATA",
  );
  check(
    "observation = [Insufficient feedback data]",
    JSON.stringify(observationLines(m)) === JSON.stringify(["Insufficient feedback data"]),
    observationLines(m).join(" | "),
  );
  check("recommendation INSUFFICIENT", recommendationOf(m) === "INSUFFICIENT");
  check(
    "teks rekomendasi persis spec",
    RECOMMENDATION_TEXT.INSUFFICIENT ===
      "Not enough verified matches to evaluate performance.",
    RECOMMENDATION_TEXT.INSUFFICIENT,
  );
  check(
    "facility distribution = jumlah match",
    m.facilitiesMatched.reduce((acc, f) => acc + f.count, 0) === 5,
    JSON.stringify(m.facilitiesMatched),
  );
}

// ---------- B. Semua CLEARED → rate 0% (denominator ada) ----------
console.log("B. semua CLEARED");
{
  const fbs = [
    fb(1, "RS-018", "CLM-08421", "CLEARED", "PASS"),
    fb(2, "RS-018", "CLM-08601", "CLEARED", "PASS"),
    fb(3, "RS-018", "CLM-08609", "CLEARED", "PASS"),
  ];
  const m = learningMetrics("RS-018", matchesOf(state, "RS-018"), fbs);
  check("totalVerified = 3", m.totalVerified === 3);
  check("falsePositiveRate = 0", m.falsePositiveRate === 0);
  check('percentLabel = "0"', percentLabel(m.falsePositiveRate) === "0");
  check("clearedCount = 3", m.clearedCount === 3);
  check("recommendation GOOD (3 verifikasi, FP 0%)", recommendationOf(m) === "GOOD");
}

// ---------- C. 1 FP dari 3 verifikasi → 33.3% + MONITOR ----------
console.log("C. 1 false positive dari 3 verifikasi");
{
  const fbs = [
    fb(1, "RS-018", "CLM-08421", "CLEARED", "PASS"),
    fb(2, "RS-018", "CLM-08601", "FALSE_POSITIVE", "HUMAN_REVIEW"),
    fb(3, "RS-018", "CLM-08609", "CLEARED", "PASS"),
  ];
  const m = learningMetrics("RS-018", matchesOf(state, "RS-018"), fbs);
  check("falsePositiveCount = 1", m.falsePositiveCount === 1);
  check("rate = 1/3", m.falsePositiveRate !== null && Math.abs(m.falsePositiveRate - 1 / 3) < 1e-9);
  check('percentLabel = "33.3"', percentLabel(m.falsePositiveRate) === "33.3", percentLabel(m.falsePositiveRate) ?? "null");
  check("recommendation MONITOR", recommendationOf(m) === "MONITOR");
  check(
    "observation 3 baris (spec §4)",
    JSON.stringify(observationLines(m)) ===
      JSON.stringify([
        "3 matches evaluated",
        "1 false positive",
        "33.3% false-positive rate",
      ]),
    observationLines(m).join(" | "),
  );
}

// ---------- D. Aggregate multi-outcome + verificationRate ----------
console.log("D. aggregate multi-outcome");
{
  const fbs = [
    fb(1, "RS-018", "CLM-08421", "CLEARED", "PASS"),
    fb(2, "RS-018", "CLM-08601", "CLEARED", "PASS"),
    fb(3, "RS-018", "CLM-08609", "NEEDS_MORE_DATA", "NEEDS_CLARIFICATION"),
    fb(4, "RS-018", "CLM-08610", "CONFIRMED", "HUMAN_REVIEW"),
    fb(5, "RS-018", "CLM-08621", "FALSE_POSITIVE", "HUMAN_REVIEW"),
  ];
  const m = learningMetrics("RS-018", matchesOf(state, "RS-018"), fbs);
  check("totalVerified = 5", m.totalVerified === 5);
  check(
    "jumlah outcome = totalVerified",
    m.clearedCount + m.needsMoreDataCount + m.confirmedCount + m.falsePositiveCount === 5,
    `${m.clearedCount}/${m.needsMoreDataCount}/${m.confirmedCount}/${m.falsePositiveCount}`,
  );
  check("rate = 1/5", m.falsePositiveRate !== null && Math.abs(m.falsePositiveRate - 0.2) < 1e-9);
  check('percentLabel = "20"', percentLabel(m.falsePositiveRate) === "20");
  check("verificationRate = 5/5 = 1", m.verificationRate === 1);
  check('verificationRate label = "100"', percentLabel(m.verificationRate) === "100");
  check("recommendation GOOD (0.2 < 0.25)", recommendationOf(m) === "GOOD");
  check(
    "threshold prototype dijelaskan",
    MIN_VERIFIED_FOR_EVALUATION === 3 && MONITOR_FP_THRESHOLD === 0.25,
  );
}

// ---------- E. Facility distribution unique + urut ----------
console.log("E. facility distribution");
{
  const matches = [
    mkMatch("k1", "CLM-1", "FAC-03"),
    mkMatch("k2", "CLM-2", "FAC-03"),
    mkMatch("k3", "CLM-3", "FAC-02"),
    mkMatch("k4", "CLM-4", "FAC-03"),
    mkMatch("k5", "CLM-5", "FAC-01"),
    mkMatch("k6", "CLM-6", "FAC-03"),
    mkMatch("k7", "CLM-7", "FAC-01"),
    mkMatch("k8", "CLM-8", "FAC-02"),
  ];
  const m = learningMetrics("RS-018", matches, []);
  check(
    "urut count desc lalu id asc",
    JSON.stringify(m.facilitiesMatched) ===
      JSON.stringify([
        { facilityId: "FAC-03", count: 4 },
        { facilityId: "FAC-01", count: 2 },
        { facilityId: "FAC-02", count: 2 },
      ]),
    JSON.stringify(m.facilitiesMatched),
  );
  check("unique facility = 3", m.facilitiesMatched.length === 3);
}

// ---------- K. Verifikasi nyata CLM-08611 — feedback ganda dicegah ----------
console.log("K. verifikasi nyata + submit ganda idempoten");
{
  const start = startNetworkVerification(
    state,
    { matchKey: "RS-017|CLM-08611", claimId: "CLM-08611", signatureId: "RS-017", level: "LEVEL3" },
    REV,
  );
  state = start.state;
  const s = start.session!;
  for (const step of s.steps) {
    state = toggleVerificationStep(state, s.id, step.id, REV);
  }
  const sub = submitNetworkVerification(state, s.id, "CLEARED", "Episode unik & bukti lengkap", REV);
  state = sub.state;
  check("submit pertama sukses", sub.blocked === undefined && sub.feedback !== null);
  check("feedback = 1 untuk RS-017", state.feedbacks.filter((f) => f.signatureId === "RS-017").length === 1);
  const again = submitNetworkVerification(state, s.id, "CONFIRMED", undefined, REV);
  check("submit ganda = ALREADY_COMPLETED", again.blocked === "ALREADY_COMPLETED", again.blocked);
  check("state identik", again.state === state);
  check(
    "feedback tetap 1 (duplikat dicegah)",
    again.state.feedbacks.filter((f) => f.signatureId === "RS-017").length === 1,
  );
}

// ---------- N. Metrik RS-017 aktual setelah 1 verifikasi ----------
console.log("N. metrik RS-017 aktual");
{
  const m = learningMetrics("RS-017", matchesOf(state, "RS-017"), state.feedbacks);
  check("matches = 1", m.totalMatches === 1, String(m.totalMatches));
  check("verified = 1", m.totalVerified === 1);
  check("cleared = 1", m.clearedCount === 1);
  check("false positive = 0", m.falsePositiveCount === 0);
  check("rate = 0", m.falsePositiveRate === 0);
  check('rate label = "0"', percentLabel(m.falsePositiveRate) === "0");
  check("verificationRate = 1", m.verificationRate === 1);
  check("recommendation INSUFFICIENT (1 < 3)", recommendationOf(m) === "INSUFFICIENT");
  check(
    "observation transparan",
    JSON.stringify(observationLines(m)) ===
      JSON.stringify([
        "1 match evaluated",
        "0 false positives",
        "0% false-positive rate",
      ]),
    observationLines(m).join(" | "),
  );
  const fm = m.facilitiesMatched;
  check(
    "facility = [FAC-03 1]",
    JSON.stringify(fm) === JSON.stringify([{ facilityId: "FAC-03", count: 1 }]),
    JSON.stringify(fm),
  );
}

// ---------- L. RBAC reuse permission existing ----------
console.log("L. RBAC governance");
{
  const updInput = {
    reason: "alasan",
    pattern: "pola",
    signalNotes: ["catatan"],
    detectionConditions: seedOf("RS-017").detectionConditions,
  };
  const m1 = monitorSignature(state, "RS-017", OP);
  check("operator monitor = RBAC", m1.blocked === "RBAC", m1.blocked);
  check("operator state identik", m1.state === state);
  const m2 = monitorSignature(state, "RS-017", PROV);
  check("provider monitor = RBAC", m2.blocked === "RBAC", m2.blocked);
  const u1 = updateSignature(state, "RS-017", updInput, REV);
  check("reviewer update = RBAC", u1.blocked === "RBAC", u1.blocked);
  const u2 = updateSignature(state, "RS-017", updInput, OP);
  check("operator update = RBAC", u2.blocked === "RBAC", u2.blocked);
  const r1 = retireSignature(state, "RS-017", "alasan", REV);
  check("reviewer retire = RBAC", r1.blocked === "RBAC", r1.blocked);
  const r2 = retireSignature(state, "RS-017", "alasan", PROV);
  check("provider retire = RBAC", r2.blocked === "RBAC", r2.blocked);

  const validated: PersistedState = { ...initialPersistedState };
  const mv = monitorSignature(validated, "RS-017", REV);
  check("monitor VALIDATED = INVALID_STATUS", mv.blocked === "INVALID_STATUS", mv.blocked);
  check("VALIDATED state identik", mv.state === validated);
  const uv = updateSignature(validated, "RS-017", updInput, ADM);
  check("update VALIDATED = INVALID_STATUS", uv.blocked === "INVALID_STATUS", uv.blocked);
  const rv = retireSignature(validated, "RS-017", "alasan", ADM);
  check("retire VALIDATED = INVALID_STATUS", rv.blocked === "INVALID_STATUS", rv.blocked);
  const ur = updateSignature(state, "RS-016", updInput, ADM);
  check("update RETIRED (RS-016) = INVALID_STATUS", ur.blocked === "INVALID_STATUS", ur.blocked);
  check("RS-016 seed tetap RETIRED", seedOf("RS-016").status === "RETIRED");
}

// ---------- F. ACTIVE → MONITORED (reviewer) ----------
console.log("F. monitor RS-017 (reviewer)");
const mon = monitorSignature(state, "RS-017", REV);
{
  check("monitor sukses", mon.blocked === undefined, mon.blocked);
  state = mon.state;
  check("statusOverride = MONITORED", state.signatureStatus["RS-017"] === "MONITORED");
  check("history = 1 record MONITORED", state.signatureHistory.length === 1);
  const h = state.signatureHistory[0];
  check("kind = MONITORED", h.kind === "MONITORED");
  check("version tetap 1 (tanpa bump)", h.version === 1 && h.previousVersion === 1);
  check("previousStatus ACTIVE → newStatus MONITORED", h.previousStatus === "ACTIVE" && h.newStatus === "MONITORED");
  check("updatedBy = Dewi Ananda", h.updatedBy === "Dewi Ananda", h.updatedBy);
  check("updatedAt terisi", h.updatedAt.length > 0);
  check(
    "snapshot historis = [CLM-08611]",
    h.snapshotMatches.length === 1 && h.snapshotMatches[0].claimId === "CLM-08611",
    h.snapshotMatches.map((m) => m.claimId).join(","),
  );
  check(
    "previousConditions = kondisi seed (tidak diubah)",
    JSON.stringify(h.previousConditions) === JSON.stringify(seedOf("RS-017").detectionConditions),
  );
  check(
    "previousPattern = pola seed",
    h.previousPattern === seedOf("RS-017").pattern,
  );
  check("audit SIG_MONITORED = 1", auditOf(state, "SIG_MONITORED").length === 1);
  const a = auditOf(state, "SIG_MONITORED")[0];
  check(
    "audit description informatif",
    !!a &&
      a.description.includes("RS-017") &&
      a.description.includes("DIPANTAU") &&
      a.description.includes("1 match") &&
      a.entityId === "RS-017" &&
      a.entity === "Network",
    a?.description,
  );
}

// ---------- Detector dinonaktifkan, snapshot historis tersedia ----------
console.log("F2. MONITORED ≠ detector aktif");
{
  const bundle = bundleOf(state);
  check(
    "bundle.active tidak memuat RS-017",
    !bundle.active.some((s) => s.id === "RS-017"),
    bundle.active.map((s) => s.id).join(","),
  );
  check("bundle.all tetap memuat RS-017", bundle.all.some((s) => s.id === "RS-017"));
  const am = netSvc.activeMatches(runtimeOf(state), srcOf(state));
  check("activeMatches tanpa RS-017", !am.some((m) => m.signatureId === "RS-017"));
  const mc = netSvc.matchesForClaim("CLM-08611", runtimeOf(state), srcOf(state));
  check("matchesForClaim CLM-08611 = []", mc.length === 0, mc.map((m) => m.signatureId).join(","));
  check(
    "snapshot historis tetap [CLM-08611]",
    historyOf(state, "RS-017")[0].snapshotMatches.length === 1,
  );
  check("claimView score tidak berubah", JSON.stringify(claimView("CLM-08611", srcOf(state))?.score) === scoreBefore);
  check("queueRows tidak berubah", JSON.stringify(queueRows(undefined, srcOf(state))) === queueBefore);
  check(
    "claim statusOverrides tidak berubah",
    JSON.stringify(state.statusOverrides) === JSON.stringify(initialPersistedState.statusOverrides),
  );
}

// ---------- M. Idempotensi monitor + audit sekali ----------
console.log("M. monitor ganda idempoten");
{
  const again = monitorSignature(state, "RS-017", REV);
  check("monitor ke-2 = ALREADY_DONE", again.blocked === "ALREADY_DONE", again.blocked);
  check("state identik", again.state === state);
  const againAdm = monitorSignature(state, "RS-017", ADM);
  check("monitor admin ke-2 = ALREADY_DONE", againAdm.blocked === "ALREADY_DONE", againAdm.blocked);
  check("history tetap 1", state.signatureHistory.length === 1);
  check("audit SIG_MONITORED tetap 1", auditOf(state, "SIG_MONITORED").length === 1);
}

// ---------- J. Update v1 → v2 tanpa overwrite ----------
console.log("J. update RS-017 → v2");
{
  const bad1 = updateSignature(state, "RS-017", { reason: "  ", pattern: "x", signalNotes: [], detectionConditions: seedOf("RS-017").detectionConditions }, ADM);
  check("tanpa alasan = REASON_REQUIRED", bad1.blocked === "REASON_REQUIRED", bad1.blocked);
  check("state identik", bad1.state === state);
  const bad2 = updateSignature(state, "RS-017", { reason: "alasan", pattern: " ", signalNotes: [], detectionConditions: seedOf("RS-017").detectionConditions }, ADM);
  check("pola kosong = BAD_INPUT", bad2.blocked === "BAD_INPUT", bad2.blocked);

  const cur = bundleOf(state).all.find((s) => s.id === "RS-017")!;
  const detectionConditions = cur.detectionConditions.map(
    (c) => parseConditionInput(c, conditionInputValue(c))!,
  );
  const reason = "False positive meningkat — pola dipersempit ke overlap ketat.";
  const r = updateSignature(
    state,
    "RS-017",
    {
      reason,
      pattern: "Satu episode fisioterapi unik per klaim — jendela overlap ketat di FAC-03.",
      signalNotes: ["same facility & same provider", "overlap ketat"],
      detectionConditions,
    },
    ADM,
  );
  check("update sukses", r.blocked === undefined, r.blocked);
  state = r.state;
  const def = state.signatureDefinitions["RS-017"];
  check("definisi v2 tersimpan", !!def && def.version === 2, def ? `v${def.version}` : "undefined");
  check("status definisi UPDATED", def?.status === "UPDATED");
  check("pola baru tersimpan", def?.pattern === "Satu episode fisioterapi unik per klaim — jendela overlap ketat di FAC-03.");
  check("statusOverride = UPDATED", state.signatureStatus["RS-017"] === "UPDATED");
  check("updatedAt definisi diperbarui", !!def?.updatedAt && def.updatedAt !== seedOf("RS-017").updatedAt);

  const seed = seedOf("RS-017");
  check("seed RS-017 TIDAK berubah (v1)", seed.version === 1 && seed.status === "VALIDATED");
  check("seed pattern tidak tertimpa", seed.pattern.startsWith("Satu episode layanan fisioterapi"));

  const h = state.signatureHistory.find((x) => x.kind === "UPDATE")!;
  check("history UPDATE ada", !!h);
  check("UPDATE v1 → v2", h.previousVersion === 1 && h.version === 2);
  check("previousStatus MONITORED → UPDATED", h.previousStatus === "MONITORED" && h.newStatus === "UPDATED");
  check("changeReason sesuai input", h.changeReason === reason);
  check("updatedBy = Bima Santoso", h.updatedBy === "Bima Santoso", h.updatedBy);
  check(
    "previousConditions deep-equal kondisi lama",
    JSON.stringify(h.previousConditions) === JSON.stringify(cur.detectionConditions),
  );
  check("previousPattern = pola lama", h.previousPattern === cur.pattern);
  check(
    "snapshot match versi lama = [CLM-08611]",
    h.snapshotMatches.length === 1 && h.snapshotMatches[0].claimId === "CLM-08611",
    h.snapshotMatches.map((m) => m.claimId).join(","),
  );
  check("audit SIG_UPDATED = 1", auditOf(state, "SIG_UPDATED").length === 1);
  const a = auditOf(state, "SIG_UPDATED")[0];
  check(
    "audit menyebut v2, alasan, dan versi lama",
    !!a && a.description.includes("v2") && a.description.includes("(dari v1)") && a.description.includes(reason) && a.entityId === "RS-017",
    a?.description,
  );

  const byId = netSvc.signatureById("RS-017", runtimeOf(state), srcOf(state));
  check("signatureById (threading definitions) = v2", byId?.version === 2, byId ? `v${byId.version}` : "undefined");
  const listed = netSvc.signatures(runtimeOf(state), srcOf(state)).find((s) => s.id === "RS-017");
  check("signatures list (threading definitions) = v2", listed?.version === 2);
}

// ---------- H. Retire soft transition ----------
console.log("H. retire RS-017 (admin)");
{
  const bad = retireSignature(state, "RS-017", "   ", ADM);
  check("tanpa alasan = REASON_REQUIRED", bad.blocked === "REASON_REQUIRED", bad.blocked);
  check("state identik", bad.state === state);
  const reason = "Pola lama tidak relevan setelah pembaruan kontrol completion.";
  const r = retireSignature(state, "RS-017", reason, ADM);
  check("retire sukses", r.blocked === undefined, r.blocked);
  state = r.state;
  check("statusOverride = RETIRED", state.signatureStatus["RS-017"] === "RETIRED");
  check("history = 3 record", state.signatureHistory.length === 3, String(state.signatureHistory.length));
  const h = state.signatureHistory[2];
  check("record RETIRED", h.kind === "RETIRED" && h.newStatus === "RETIRED");
  check("previousStatus UPDATED", h.previousStatus === "UPDATED");
  check("alasan tersimpan", h.changeReason === reason);
  check(
    "snapshot historis tetap [CLM-08611]",
    h.snapshotMatches.length === 1 && h.snapshotMatches[0].claimId === "CLM-08611",
    h.snapshotMatches.map((m) => m.claimId).join(","),
  );
  check("audit SIG_RETIRED = 1", auditOf(state, "SIG_RETIRED").length === 1);
  const a = auditOf(state, "SIG_RETIRED")[0];
  check(
    "audit description pensiun",
    !!a && a.description.includes("dipensiunkan") && a.description.includes(reason) && a.entityId === "RS-017",
    a?.description,
  );

  const again = retireSignature(state, "RS-017", reason, ADM);
  check("retire ke-2 = ALREADY_DONE", again.blocked === "ALREADY_DONE", again.blocked);
  check("audit SIG_RETIRED tetap 1", auditOf(state, "SIG_RETIRED").length === 1);
  check("history tetap 3", state.signatureHistory.length === 3);
}

// ---------- I. Setelah retire: tanpa match baru, historis tetap ----------
console.log("I. pasca-retire");
{
  const am = netSvc.activeMatches(runtimeOf(state), srcOf(state));
  check("activeMatches tanpa RS-017", !am.some((m) => m.signatureId === "RS-017"));
  check(
    "matchesForClaim CLM-08611 = []",
    netSvc.matchesForClaim("CLM-08611", runtimeOf(state), srcOf(state)).length === 0,
  );
  check("bundle.active tanpa RS-017", !bundleOf(state).active.some((s) => s.id === "RS-017"));
  const hist = historyOf(state, "RS-017").filter((h) => h.snapshotMatches.length > 0);
  check(
    "riwayat snapshot historis tetap tersimpan (3 transisi punya snapshot)",
    hist.length === 3,
    String(hist.length),
  );
  const latest = [...state.signatureHistory].reverse().find((h) => h.signatureId === "RS-017" && h.snapshotMatches.length > 0)!;
  check(
    "snapshot final = CLM-08611 (match versi lama tidak dihapus/dipindah)",
    latest.snapshotMatches[0].claimId === "CLM-08611",
  );
  check("definisi v2 tidak dihapus", state.signatureDefinitions["RS-017"]?.version === 2);
  check("feedback RS-017 tetap tersimpan", state.feedbacks.filter((f) => f.signatureId === "RS-017").length === 1);
  check("claimView score tetap terkunci", JSON.stringify(claimView("CLM-08611", srcOf(state))?.score) === scoreBefore);
  check("queueRows tetap terkunci", JSON.stringify(queueRows(undefined, srcOf(state))) === queueBefore);
  check(
    "statusOverrides klaim tetap kosong",
    JSON.stringify(state.statusOverrides) === JSON.stringify(initialPersistedState.statusOverrides),
  );
}

// ---------- O. RS-018 semantik match tidak berubah ----------
console.log("O. RS-018 tetap 5 match");
{
  const bundle = bundleOf(state);
  const rs018 = bundle.all.find((s) => s.id === "RS-018")!;
  check("RS-018 tetap ACTIVE", rs018.status === "ACTIVE", rs018.status);
  check("RS-018 tetap v1 seed", rs018.version === 1 && rs018.pattern === seedOf("RS-018").pattern);
  check(
    "tanpa statusOverride RS-018 tertulis",
    state.signatureStatus["RS-018"] === undefined,
  );
  const m = matchesOf(state, "RS-018");
  const claims = m.map((x) => x.claimId).sort();
  check(
    "5 claim persis",
    JSON.stringify(claims) ===
      JSON.stringify(
        ["CLM-08421", "CLM-08601", "CLM-08609", "CLM-08610", "CLM-08621"].sort(),
      ),
    claims.join(","),
  );
  check("tanpa definisi override RS-018", state.signatureDefinitions["RS-018"] === undefined);
}

console.log("");
console.log(`${passed} PASS, ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);

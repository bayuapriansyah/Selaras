import type { Role } from "@/data/app/types";
import {
  signatureSeeds,
} from "@/data/app/network";
import {
  buildDataSource,
  initialPersistedState,
  type PersistedState,
} from "@/lib/app/appState";
import {
  adaptiveAction,
  allMatches,
  controlsOf,
  signatureBundle,
} from "@/lib/app/network";
import { claimView, queueRows, seedSource } from "@/lib/app/selectors";
import { claimNetwork } from "@/lib/app/services/networkService";
import {
  activeSessionOf,
  sessionStatusOf,
  startNetworkVerification,
  stepsCompletion,
  submitGate,
  submitNetworkVerification,
  toggleVerificationStep,
} from "@/lib/app/services/verificationService";

/**
 * Phase 8 â€” Adaptive Verification + Risk-Specific Verification (Â§22 Aâ€“S).
 * T = 390px responsive diverifikasi oleh E2E network.js.
 *
 * CLM-08611 + RS-017 â†’ STEP-UP VERIFICATION dengan 4 kontrol risk-specific;
 * hasil CLEARED / NEEDS_MORE_DATA / CONFIRMED; audit + feedback; idempotency;
 * RBAC reviewClaim; pipeline klaim (score/queue/status) terkunci.
 */

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` â€” ${detail}` : ""}`);
  }
}

const REV = { name: "Dewi Ananda", role: "reviewer" as Role };
const PROV = { name: "Arif Nugroho", role: "provider" as Role };
const OP = { name: "Sari Wijaya", role: "operator" as Role };
const ADM = { name: "Bima Santoso", role: "admin" as Role };

const auditOf = (s: PersistedState, action: string) =>
  s.audit.filter((a) => a.action === action);
const codesOf = (steps: { code: string }[]) => steps.map((s) => s.code);
const ids = (ms: { signatureId: string }[]) =>
  ms.map((m) => m.signatureId).sort();

// Snapshot awal â€” klaim pipeline terkunci (Â§21 / Q / R / S).
const score08611Before = JSON.stringify(
  claimView("CLM-08611", seedSource)?.score,
);
const queueBefore = JSON.stringify(queueRows(undefined, seedSource));
const claimOverridesBefore = JSON.stringify(initialPersistedState.statusOverrides);

let state: PersistedState = {
  ...initialPersistedState,
  signatureStatus: { "RS-017": "ACTIVE" },
};
const runtime = {
  statusOverrides: state.signatureStatus,
  proposals: [] as [],
  feedbacks: [] as typeof state.feedbacks,
};
const srcOf = (s: PersistedState) => buildDataSource(s);
const matchesBefore = JSON.stringify(
  allMatches(
    signatureBundle(signatureSeeds, [], state.signatureStatus).active,
    srcOf(state),
  ),
);

// ---------- A. CLM-08611 â†’ RS-017 STEP-UP VERIFICATION ----------
console.log("A. CLM-08611 network view (RS-017 aktif)");
{
  const view = claimView("CLM-08611", srcOf(state))!;
  const net = claimNetwork(view, { ...runtime, statusOverrides: state.signatureStatus }, srcOf(state));
  check("match = [RS-017]", JSON.stringify(ids(net.matches)) === JSON.stringify(["RS-017"]), ids(net.matches).join(","));
  check("level = LEVEL3", net.level === "LEVEL3", net.level);
  check("action = VERIFIKASI STEP-UP", net.action === "VERIFIKASI STEP-UP", net.action);
  const sig = signatureSeeds.find((s) => s.id === "RS-017")!;
  check("adaptiveAction(LEVEL3) = VERIFIKASI STEP-UP", adaptiveAction(net.level) === "VERIFIKASI STEP-UP");
  check("risk-specific controls = 4", controlsOf(sig).length === 4, String(controlsOf(sig).length));
}

// ---------- B + C. Reviewer memulai verifikasi â†’ session ----------
console.log("B/C. start verification (reviewer)");
const start1 = startNetworkVerification(
  state,
  { matchKey: "RS-017|CLM-08611", claimId: "CLM-08611", signatureId: "RS-017", level: "LEVEL3" },
  REV,
);
state = start1.state;
const s1 = start1.session!;
{
  check("B created", start1.created === true && !start1.denied);
  check("B status IN_PROGRESS", s1.status === "IN_PROGRESS", s1.status);
  check("C id = NET-VER-0001", s1.id === "NET-VER-0001", s1.id);
  check("C claim CLM-08611", s1.claimId === "CLM-08611");
  check("C signature RS-017", s1.signatureId === "RS-017");
  check("C level LEVEL3", s1.level === "LEVEL3");
  check("C startedBy = Dewi Ananda", s1.startedBy === "Dewi Ananda", s1.startedBy);
  check("C startedAt terisi", s1.startedAt.length > 0);
  check("C sessionStatusOf = IN_PROGRESS", sessionStatusOf(s1) === "IN_PROGRESS");
  check("C matchKey tersimpan", s1.matchKey === "RS-017|CLM-08611");
}

// ---------- D. Exactly 4 RS-017 controls ----------
console.log("D. RS-017 checklist (data-driven)");
{
  check("steps.length === 4", s1.steps.length === 4, String(s1.steps.length));
  check(
    "codes = SERVICE_UNIQUENESS, PROVIDER_ATTESTATION, COMPLETION_EVIDENCE, BILLING_LINKAGE",
    JSON.stringify(codesOf(s1.steps)) ===
      JSON.stringify([
        "SERVICE_UNIQUENESS",
        "PROVIDER_ATTESTATION",
        "COMPLETION_EVIDENCE",
        "BILLING_LINKAGE",
      ]),
    codesOf(s1.steps).join(","),
  );
  check("labels sesuai Â§2", JSON.stringify(s1.steps.map((s) => s.label)) ===
    JSON.stringify(["Service uniqueness", "Provider attestation", "Completion evidence", "Billing linkage"]));
  check("reason per kontrol non-kosong", s1.steps.every((s) => s.reason.length > 0));
  check("semua required", s1.steps.every((s) => s.required));
  check("status awal PENDING", s1.steps.every((s) => s.status === "PENDING"));
  check("signatureId per langkah", s1.steps.every((s) => s.signatureId === "RS-017"));
  check("id = RS-017:CODE", s1.steps.every((s) => s.id.startsWith("RS-017:")));
  check(
    "reason verbatim dari definisi kontrol",
    s1.steps[0].reason === "Confirm that this service episode is represented only once.",
    s1.steps[0].reason,
  );
}

// ---------- E. Checklist tidak lengkap â†’ submit ditolak ----------
console.log("E. submit saat required belum selesai");
{
  const gate = submitGate(state, s1);
  check("gate = REQUIRED_PENDING", gate.ok === false && gate.reason === "REQUIRED_PENDING");
  const sub = submitNetworkVerification(state, s1.id, "CLEARED", undefined, REV);
  check("blocked = REQUIRED_PENDING", sub.blocked === "REQUIRED_PENDING", sub.blocked);
  check("state tidak berubah", sub.state === state);
  check("tidak ada feedback", sub.feedback === null);
  check("audit NET_VERIFICATION_RESULT = 0", auditOf(state, "NET_VERIFICATION_RESULT").length === 0);
  check(
    "progress 0/4",
    JSON.stringify(stepsCompletion(s1)) === JSON.stringify({ required: 4, done: 0, complete: false }),
  );
}

// ---------- F. Checklist lengkap â†’ boleh submit ----------
console.log("F. toggle seluruh required controls");
{
  for (const step of s1.steps) {
    state = toggleVerificationStep(state, s1.id, step.id, REV);
  }
  const current = activeSessionOf(state, "CLM-08611", "RS-017")!;
  const done = stepsCompletion(current);
  check("4/4 complete", done.complete && done.done === 4 && done.required === 4, JSON.stringify(done));
  check("gate ok", submitGate(state, current).ok === true);
  check(
    "checkedBy/checkedAt terisi",
    current.steps.every((s) => s.checkedBy === "Dewi Ananda" && !!s.checkedAt),
  );
  const untoggled = toggleVerificationStep(state, s1.id, s1.steps[0].id, REV);
  const back = untoggled.verificationSessions.find((s) => s.id === s1.id)!;
  check("un-toggle kembali PENDING", back.steps[0].status === "PENDING");
  state = toggleVerificationStep(untoggled, s1.id, s1.steps[0].id, REV);
  check(
    "re-toggle kembali VERIFIED (4/4)",
    stepsCompletion(activeSessionOf(state, "CLM-08611", "RS-017")!).complete,
  );
}

// ---------- M. Start idempoten (sebelum submit) ----------
console.log("M. repeated start idempotent");
{
  const again = startNetworkVerification(
    state,
    { matchKey: "RS-017|CLM-08611", claimId: "CLM-08611", signatureId: "RS-017", level: "LEVEL3" },
    REV,
  );
  check("tidak membuat sesi baru", again.created === false && again.session?.id === s1.id);
  check("state identik (tidak ada audit dobel)", again.state === state);
  check(
    "satu sesi IN_PROGRESS untuk claim+signature",
    state.verificationSessions.filter(
      (s) => s.claimId === "CLM-08611" && s.signatureId === "RS-017" && s.status === "IN_PROGRESS",
    ).length === 1,
  );
  check("audit NET_VERIFICATION_STARTED = 1", auditOf(state, "NET_VERIFICATION_STARTED").length === 1);
}

// ---------- G + J + K + L. Submit CLEARED â†’ session, audit, feedback ----------
console.log("G/J/K/L. submit CLEARED");
const sub1 = submitNetworkVerification(state, s1.id, "CLEARED", "Episode unik & bukti lengkap", REV);
state = sub1.state;
check("G submit tidak diblokir", sub1.blocked === undefined, sub1.blocked);
{
  check("G session COMPLETED", sub1.session?.status === "COMPLETED", sub1.session?.status);
  check("G result = CLEARED", sub1.session?.result === "CLEARED", sub1.session?.result);
  check("G completedBy/At terisi", !!sub1.session?.completedBy && !!sub1.session?.completedAt);
  check("G note tersimpan", sub1.session?.note === "Episode unik & bukti lengkap");

  const startAudits = auditOf(state, "NET_VERIFICATION_STARTED");
  const j = startAudits[0];
  check("J audit NET_VERIFICATION_STARTED ada", startAudits.length === 1, String(startAudits.length));
  check("J menyimpan claim+signature+reviewer", !!j && j.description.includes("CLM-08611") && j.description.includes("RS-017") && j.description.includes("Dewi Ananda"));
  check("J menyimpan timestamp+user", !!j && !!j.at && j.user === "Dewi Ananda");

  const resultAudits = auditOf(state, "NET_VERIFICATION_RESULT");
  const k = resultAudits[0];
  check("K audit NET_VERIFICATION_RESULT ada", resultAudits.length === 1, String(resultAudits.length));
  check("K menyimpan claim+signature+result", !!k && k.description.includes("CLM-08611") && k.description.includes("RS-017") && k.description.includes("CLEARED"));
  check("K menyimpan reviewer+timestamp", !!k && k.user === "Dewi Ananda" && !!k.at);

  const f = sub1.feedback;
  check("L feedback tersimpan", state.feedbacks.length === 1 && !!f);
  check(
    "L field matchKey/signatureId/claimId",
    !!f && f.matchKey === "RS-017|CLM-08611" && f.signatureId === "RS-017" && f.claimId === "CLM-08611",
  );
  check("L outcome CLEARED + result PASS", !!f && f.outcome === "CLEARED" && f.result === "PASS");
  check("L note/by/at", !!f && f.note === "Episode unik & bukti lengkap" && f.by === "Dewi Ananda" && f.at.length > 0);
}

// ---------- N. Submit ganda idempoten ----------
console.log("N. repeated submit idempotent");
{
  const fbBefore = state.feedbacks.length;
  const auditBefore = auditOf(state, "NET_VERIFICATION_RESULT").length;
  const again = submitNetworkVerification(state, s1.id, "CONFIRMED", undefined, REV);
  check("blocked = ALREADY_COMPLETED", again.blocked === "ALREADY_COMPLETED", again.blocked);
  check("state identik", again.state === state);
  check("feedback tidak dobel", state.feedbacks.length === fbBefore);
  check("audit result tidak dobel", auditOf(state, "NET_VERIFICATION_RESULT").length === auditBefore);
}

// ---------- H. NEEDS_MORE_DATA (CLM-08610 + RS-018, kontrol derived) ----------
console.log("H. NEEDS_MORE_DATA â€” CLM-08610 / RS-018");
{
  const r = startNetworkVerification(
    state,
    { matchKey: "RS-018|CLM-08610", claimId: "CLM-08610", signatureId: "RS-018", level: "LEVEL4" },
    REV,
  );
  state = r.state;
  const sh = r.session!;
  check("H session NET-VER-0002", sh.id === "NET-VER-0002", sh.id);
  check(
    "H kontrol derived dari missingEvidence(completion) = [COMPLETION_EVIDENCE]",
    JSON.stringify(codesOf(sh.steps)) === JSON.stringify(["COMPLETION_EVIDENCE"]),
    codesOf(sh.steps).join(","),
  );
  for (const step of sh.steps) state = toggleVerificationStep(state, sh.id, step.id, REV);
  const sub = submitNetworkVerification(
    state,
    sh.id,
    "NEEDS_MORE_DATA",
    "Lengkapi completion sesi 02â€“04",
    REV,
  );
  state = sub.state;
  check("H COMPLETED + NEEDS_MORE_DATA", sub.session?.status === "COMPLETED" && sub.session?.result === "NEEDS_MORE_DATA");
  check("H feedback NEEDS_CLARIFICATION/NEEDS_MORE_DATA", sub.feedback?.result === "NEEDS_CLARIFICATION" && sub.feedback?.outcome === "NEEDS_MORE_DATA");
  check("H restart tersedia (state IN_PROGRESS baru = null)", activeSessionOf(state, "CLM-08610", "RS-018") === undefined);
}

// ---------- I. CONFIRMED (CLM-08609 + RS-019) ----------
console.log("I. CONFIRMED â€” CLM-08609 / RS-019");
{
  const r = startNetworkVerification(
    state,
    { matchKey: "RS-019|CLM-08609", claimId: "CLM-08609", signatureId: "RS-019", level: "LEVEL4" },
    REV,
  );
  state = r.state;
  const si = r.session!;
  check("I session NET-VER-0003", si.id === "NET-VER-0003", si.id);
  check(
    "I kontrol derived dari BILLING_BEFORE_PASSPORT = [BILLING_LINKAGE]",
    JSON.stringify(codesOf(si.steps)) === JSON.stringify(["BILLING_LINKAGE"]),
    codesOf(si.steps).join(","),
  );
  for (const step of si.steps) state = toggleVerificationStep(state, si.id, step.id, REV);
  const sub = submitNetworkVerification(state, si.id, "CONFIRMED", "Tautan billing lemah", REV);
  state = sub.state;
  check("I COMPLETED + CONFIRMED", sub.session?.result === "CONFIRMED" && sub.session?.status === "COMPLETED");
  check("I feedback HUMAN_REVIEW/CONFIRMED", sub.feedback?.result === "HUMAN_REVIEW" && sub.feedback?.outcome === "CONFIRMED");
}

// ---------- Â§20. Multi-signature context ----------
console.log("Â§20. CLM-08609 â€” dua active signals (scope jelas)");
{
  const view = claimView("CLM-08609", srcOf(state))!;
  const net = claimNetwork(view, { ...runtime, statusOverrides: state.signatureStatus }, srcOf(state));
  check(
    "matches = [RS-018, RS-019]",
    JSON.stringify(ids(net.matches)) === JSON.stringify(["RS-018", "RS-019"]),
    ids(net.matches).join(","),
  );
  check("level LEVEL4 (multi sinyal)", net.level === "LEVEL4", net.level);
}

// ---------- O. Provider TIDAK boleh start ----------
console.log("O. provider start ditolak");
{
  const r = startNetworkVerification(
    state,
    { matchKey: "RS-018|CLM-08621", claimId: "CLM-08621", signatureId: "RS-018", level: "LEVEL4" },
    PROV,
  );
  check("denied", r.denied === true && r.session === null);
  check("state identik (tanpa sesi/audit)", r.state === state);
  check("tidak ada sesi IN_PROGRESS", activeSessionOf(state, "CLM-08621", "RS-018") === undefined);
  check("audit STARTED tidak bertambah", auditOf(state, "NET_VERIFICATION_STARTED").length === 3);
}

// ---------- P. Operator TIDAK boleh submit ----------
console.log("P. operator submit ditolak");
{
  const r = startNetworkVerification(
    state,
    { matchKey: "RS-018|CLM-08601", claimId: "CLM-08601", signatureId: "RS-018", level: "LEVEL4" },
    REV,
  );
  state = r.state;
  const sp = r.session!;
  check("P sesi NET-VER-0004 (reviewer)", sp.id === "NET-VER-0004", sp.id);
  for (const step of sp.steps) state = toggleVerificationStep(state, sp.id, step.id, REV);
  const fbBefore = state.feedbacks.length;
  const sub = submitNetworkVerification(state, sp.id, "CLEARED", undefined, OP);
  check("blocked = RBAC", sub.blocked === "RBAC", sub.blocked);
  check("state identik", sub.state === state);
  check("sesi tetap IN_PROGRESS", activeSessionOf(state, "CLM-08601", "RS-018")?.status === "IN_PROGRESS");
  check("tanpa feedback", state.feedbacks.length === fbBefore);
}

// ---------- Admin boleh (positif RBAC) ----------
console.log("RBAC. admin start diizinkan");
{
  const r = startNetworkVerification(
    state,
    { matchKey: "RS-018|CLM-08621", claimId: "CLM-08621", signatureId: "RS-018", level: "LEVEL4" },
    ADM,
  );
  state = r.state;
  check("admin created", r.created === true && r.session?.id === "NET-VER-0005");
  check("startedBy = Bima Santoso", r.session?.startedBy === "Bima Santoso");
}

// ---------- Re-verification loop (NEEDS_MORE_DATA â†’ start ulang) ----------
console.log("Restart. start ulang setelah COMPLETED");
{
  const r = startNetworkVerification(
    state,
    { matchKey: "RS-017|CLM-08611", claimId: "CLM-08611", signatureId: "RS-017", level: "LEVEL3" },
    REV,
  );
  state = r.state;
  check("sesi baru NET-VER-0006 dibuat", r.created === true && r.session?.id === "NET-VER-0006", r.session?.id);
  check("fresh steps semua PENDING", r.session!.steps.every((s) => s.status === "PENDING"));
  check("sesi lama tetap COMPLETED", state.verificationSessions.find((s) => s.id === s1.id)?.status === "COMPLETED");
}

// ---------- Q. Local score unchanged ----------
console.log("Q. local score unchanged");
{
  check(
    "skor CLM-08611 identik (seed vs state runtime)",
    JSON.stringify(claimView("CLM-08611", srcOf(state))?.score) === score08611Before,
  );
  check(
    "skor via seedSource identik",
    JSON.stringify(claimView("CLM-08611", seedSource)?.score) === score08611Before,
  );
  check("baseStatus CLM-08611 tetap SUPPORTED", claimView("CLM-08611", srcOf(state))?.baseStatus === "SUPPORTED");
}

// ---------- R. Queue unchanged ----------
console.log("R. queue unchanged");
{
  check(
    "queueRows identik sebelum/sesudah seluruh verifikasi",
    JSON.stringify(queueRows(undefined, srcOf(state))) === queueBefore,
  );
  check("claim statusOverrides tetap kosong", JSON.stringify(state.statusOverrides) === claimOverridesBefore);
  check("signatureStatus tidak berubah oleh verifikasi", JSON.stringify(state.signatureStatus) === JSON.stringify({ "RS-017": "ACTIVE" }));
}

// ---------- S. Network match tetap additive ----------
console.log("S. network match remains additive");
{
  const after = JSON.stringify(
    allMatches(
      signatureBundle(signatureSeeds, state.proposals, state.signatureStatus).active,
      srcOf(state),
    ),
  );
  check("allMatches deep-equal sebelum/sesudah", after === matchesBefore);
  check("3 feedback (G+H+I), tanpa statistik baru", state.feedbacks.length === 3, String(state.feedbacks.length));
  check(
    "audit: 6 STARTED / 3 RESULT",
    auditOf(state, "NET_VERIFICATION_STARTED").length === 6 &&
      auditOf(state, "NET_VERIFICATION_RESULT").length === 3,
    `${auditOf(state, "NET_VERIFICATION_STARTED").length}/${auditOf(state, "NET_VERIFICATION_RESULT").length}`,
  );
  check(
    "outcome hanya CLEARED/NEEDS_MORE_DATA/CONFIRMED",
    state.feedbacks.every((f) =>
      ["CLEARED", "NEEDS_MORE_DATA", "CONFIRMED"].includes(f.outcome),
    ),
  );
}

console.log("");
console.log(`${passed} PASS, ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);

import { signatureSeeds, type RiskSignature } from "@/data/app/network";
import {
  adaptiveAction,
  adaptiveLevel,
  allMatches,
  conditionLabel,
  matchesForClaim,
  networkStats,
  signatureBundle,
} from "@/lib/app/network";
import {
  buildDataSource,
  initialPersistedState,
  type EvidenceAdd,
} from "@/lib/app/appState";
import { claimView, queueRows, seedSource } from "@/lib/app/selectors";

/**
 * Phase 7 — Network Risk Signature tests (§21 A–M).
 * N (banner) & O (audit) diverifikasi oleh E2E network.js.
 *
 * RS-017 A2 structural matching: template TPL-PHYSIO + facility FAC-03 +
 * sameProviderOverlap + sessionsComplete → EXACTLY CLM-08611.
 * RS-018 session-level missing completion (network-wide) → 5 klaim
 * termasuk CLM-08610.
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

const ids = (ms: { claimId: string }[]) =>
  ms.map((m) => m.claimId).sort((a, b) => a.localeCompare(b));

const sigOf = (bundle: ReturnType<typeof signatureBundle>, id: string) =>
  bundle.all.find((s) => s.id === id)!;

const withStatus = (id: string, status: "ACTIVE" | "VALIDATED"): RiskSignature => ({
  ...signatureSeeds.find((s) => s.id === id)!,
  status,
});

const EXPECTED_RS018 = [
  "CLM-08421",
  "CLM-08601",
  "CLM-08609",
  "CLM-08610",
  "CLM-08621",
];

// Snapshot lokal SEBELUM seluruh pemanggilan matcher (L & M).
const queueBefore = JSON.stringify(queueRows(undefined, seedSource));
const score08611Before = JSON.stringify(
  claimView("CLM-08611", seedSource)?.score,
);

// ---------- A. RS-017 pre-publish = VALIDATED / 0 active match ----------
console.log("A. RS-017 pre-publish");
{
  const pre = signatureBundle(signatureSeeds, [], {});
  const rs017 = sigOf(pre, "RS-017");
  check("status VALIDATED", rs017.status === "VALIDATED", rs017.status);
  check("masuk paket pending", pre.pending.some((s) => s.id === "RS-017"));
  const activeHits = allMatches(pre.active, seedSource).filter(
    (m) => m.signatureId === "RS-017",
  );
  check("0 active match", activeHits.length === 0, ids(activeHits).join(","));
  const pendingHits = allMatches(pre.pending, seedSource).filter(
    (m) => m.signatureId === "RS-017",
  );
  check(
    "pending match = [CLM-08611]",
    JSON.stringify(ids(pendingHits)) === JSON.stringify(["CLM-08611"]),
    ids(pendingHits).join(","),
  );
}

// ---------- B. publish RS-017 → ACTIVE ----------
console.log("B. publish RS-017 (simulate status override)");
const post = signatureBundle(signatureSeeds, [], { "RS-017": "ACTIVE" });
{
  const rs017 = sigOf(post, "RS-017");
  check("status ACTIVE", rs017.status === "ACTIVE", rs017.status);
  check("masuk paket active", post.active.some((s) => s.id === "RS-017"));
}

// ---------- C. RS-017 post-publish = EXACTLY CLM-08611 ----------
console.log("C. RS-017 match set eksak");
const rs017Matches = allMatches(
  [sigOf(post, "RS-017")],
  seedSource,
);
{
  const got = ids(rs017Matches);
  check("matches.length === 1", got.length === 1, got.join(","));
  check(
    'matches === ["CLM-08611"]',
    JSON.stringify(got) === JSON.stringify(["CLM-08611"]),
    got.join(","),
  );
}

// ---------- D. RS-017 TIDAK match CLM-08421 ----------
console.log("D. RS-017 excludes CLM-08421");
{
  const golden = matchesForClaim(
    [sigOf(post, "RS-017")],
    "CLM-08421",
    seedSource,
  );
  check("CLM-08421 tanpa match RS-017", golden.length === 0);
  check(
    "CLM-08421 tetap match RS-018",
    matchesForClaim([withStatus("RS-018", "ACTIVE")], "CLM-08421", seedSource)
      .length === 1,
  );
}

// ---------- E. RS-018 active includes CLM-08610 ----------
console.log("E. RS-018 includes CLM-08610");
const rs018Matches = allMatches([withStatus("RS-018", "ACTIVE")], seedSource);
{
  check("RS-018 status ACTIVE", withStatus("RS-018", "ACTIVE").status === "ACTIVE");
  check("include CLM-08610", ids(rs018Matches).includes("CLM-08610"));
}

// ---------- F. RS-018 expected set (>=5, network-wide) ----------
console.log("F. RS-018 expected match set");
{
  const got = ids(rs018Matches);
  check("minimal 5 match", got.length >= 5, got.join(","));
  check(
    "set = {08421, 08601, 08609, 08610, 08621}",
    JSON.stringify(got) === JSON.stringify(EXPECTED_RS018),
    got.join(","),
  );
  for (const id of EXPECTED_RS018) {
    check(`set contains ${id}`, got.includes(id));
  }
}

// ---------- G. sameProviderOverlap (data aktual) ----------
console.log("G. sameProviderOverlap");
{
  const overlapOnly: RiskSignature = {
    ...withStatus("RS-017", "ACTIVE"),
    id: "TEST-OVERLAP",
    detectionConditions: [
      { kind: "facility", facilityIds: ["FAC-03"] },
      { kind: "sameProviderOverlap" },
    ],
  };
  const got = ids(allMatches([overlapOnly], seedSource));
  check(
    "overlap FAC-03 = [CLM-08610, CLM-08611]",
    JSON.stringify(got) === JSON.stringify(["CLM-08610", "CLM-08611"]),
    got.join(","),
  );
  check(
    "08612/08613/08614 tidak overlap (provider beda / jendela terpisah)",
    !got.includes("CLM-08612") &&
      !got.includes("CLM-08613") &&
      !got.includes("CLM-08614"),
  );
  const label = conditionLabel({ kind: "sameProviderOverlap" });
  check("label overlap non-kosong", label.length > 0, label);
}

// ---------- H. sessionsComplete (data aktual) ----------
console.log("H. sessionsComplete");
{
  const completeOnly: RiskSignature = {
    ...withStatus("RS-017", "ACTIVE"),
    id: "TEST-COMPLETE",
    detectionConditions: [
      { kind: "facility", facilityIds: ["FAC-03"] },
      { kind: "sessionsComplete" },
    ],
  };
  const got = ids(allMatches([completeOnly], seedSource));
  check(
    "FAC-03 lengkap = [08611, 08612, 08613, 08614] (08610 gap)",
    JSON.stringify(got) ===
      JSON.stringify(["CLM-08611", "CLM-08612", "CLM-08613", "CLM-08614"]),
    got.join(","),
  );
  check("CLM-08610 tidak sessionsComplete", !got.includes("CLM-08610"));
  const label = conditionLabel({ kind: "sessionsComplete" });
  check("label sessionsComplete non-kosong", label.length > 0, label);
}

// ---------- I. evidenceAdds mengubah completeSessions ----------
console.log("I. evidenceAdds overlay → completeSessions");
{
  // Lengkapi semua gap CLM-08610 (note + completion pada sesi 02/03/04).
  const serviceOf = (sid: string) => sid;
  const adds: EvidenceAdd[] = [
    { serviceId: serviceOf("SVC-08610-02"), kind: "note", at: "2026-09-30 10:00", source: "Provider" },
    { serviceId: serviceOf("SVC-08610-02"), kind: "completion", at: "2026-09-30 10:01", source: "Provider" },
    { serviceId: serviceOf("SVC-08610-03"), kind: "note", at: "2026-09-30 10:02", source: "Provider" },
    { serviceId: serviceOf("SVC-08610-03"), kind: "completion", at: "2026-09-30 10:03", source: "Provider" },
    { serviceId: serviceOf("SVC-08610-04"), kind: "completion", at: "2026-09-30 10:04", source: "Provider" },
  ];
  const overlaid = buildDataSource({
    ...initialPersistedState,
    evidenceAdds: adds,
  });
  check(
    "overlay diterapkan ke services",
    overlaid.services.some(
      (s) =>
        s.id === "SVC-08610-04" &&
        s.evidence.find((e) => e.kind === "completion")?.state === "present",
    ),
  );
  const rs017Added = ids(
    allMatches([withStatus("RS-017", "ACTIVE")], overlaid),
  );
  check(
    "RS-017 kini = [CLM-08610, CLM-08611]",
    JSON.stringify(rs017Added) ===
      JSON.stringify(["CLM-08610", "CLM-08611"]),
    rs017Added.join(","),
  );
  const rs018Added = ids(
    allMatches([withStatus("RS-018", "ACTIVE")], overlaid),
  );
  check(
    "RS-018 kehilangan CLM-08610 (completion terpenuhi)",
    !rs018Added.includes("CLM-08610"),
    rs018Added.join(","),
  );
  check(
    "RS-018 lain tetap = 4 klaim",
    rs018Added.length === 4,
    rs018Added.join(","),
  );
}

// ---------- J. matcher deterministik ----------
console.log("J. determinism");
{
  const a1 = JSON.stringify(ids(allMatches([withStatus("RS-018", "ACTIVE")], seedSource)));
  const a2 = JSON.stringify(ids(allMatches([withStatus("RS-018", "ACTIVE")], seedSource)));
  check("RS-018 dua panggilan identik", a1 === a2, `${a1} vs ${a2}`);
  const b1 = JSON.stringify(ids(rs017Matches));
  const b2 = JSON.stringify(
    ids(allMatches([sigOf(post, "RS-017")], seedSource)),
  );
  check("RS-017 dua panggilan identik", b1 === b2, `${b1} vs ${b2}`);
}

// ---------- K. publish recompute memakai state terbaru ----------
console.log("K. publish recompute (latest state)");
{
  const latest = buildDataSource({
    ...initialPersistedState,
    evidenceAdds: [
      { serviceId: "SVC-08610-02", kind: "note", at: "2026-09-30 10:00", source: "Provider" },
      { serviceId: "SVC-08610-02", kind: "completion", at: "2026-09-30 10:01", source: "Provider" },
      { serviceId: "SVC-08610-03", kind: "note", at: "2026-09-30 10:02", source: "Provider" },
      { serviceId: "SVC-08610-03", kind: "completion", at: "2026-09-30 10:03", source: "Provider" },
      { serviceId: "SVC-08610-04", kind: "completion", at: "2026-09-30 10:04", source: "Provider" },
    ],
  });
  const preBundle = signatureBundle(signatureSeeds, [], {});
  const before = allMatches(preBundle.active, latest);
  const after = allMatches(
    [
      ...preBundle.active,
      { ...sigOf(preBundle, "RS-017"), status: "ACTIVE" as const },
    ],
    latest,
  );
  const newOnes = after.filter(
    (m) => !before.some((b) => b.key === m.key),
  );
  check(
    "match baru setelah publish memakai src terbaru (08610 & 08611)",
    JSON.stringify(ids(newOnes)) ===
      JSON.stringify(["CLM-08610", "CLM-08611"]),
    ids(newOnes).join(","),
  );
}

// ---------- L. local score / status lokal tidak berubah ----------
console.log("L. local score unchanged");
{
  const score08611After = JSON.stringify(
    claimView("CLM-08611", seedSource)?.score,
  );
  check(
    "skor CLM-08611 identik sebelum/sesudah matcher",
    score08611After === score08611Before,
  );
  const view = claimView("CLM-08611", seedSource);
  check(
    "status lokal CLM-08611 = SUPPORTED",
    view?.baseStatus === "SUPPORTED",
    view?.baseStatus,
  );
  // Rekomendasi aksi LEVEL3 = step-up verification (§16)
  const level = adaptiveLevel(view!, rs017Matches.filter((m) => m.claimId === "CLM-08611"));
  check("level CLM-08611 = LEVEL3", level === "LEVEL3", level);
  check(
    "rekomendasi = VERIFIKASI STEP-UP",
    adaptiveAction(level) === "VERIFIKASI STEP-UP",
    adaptiveAction(level),
  );
}

// ---------- M. queue order tidak berubah ----------
console.log("M. queue order unchanged");
{
  const queueAfter = JSON.stringify(queueRows(undefined, seedSource));
  check("queueRows identik setelah semua panggilan matcher", queueAfter === queueBefore);
  const order = queueRows(undefined, seedSource).map((r) => r.claim.id);
  check("urutan tetap non-kosong", order.length > 0);
}

// ---------- Tambahan: statistik publish propagation (§14) ----------
console.log("Stats. propagation delta");
{
  const pre = networkStats({
    seeds: signatureSeeds,
    proposals: [],
    statusOverrides: undefined,
    feedbacks: [],
    src: seedSource,
  });
  const postStats = networkStats({
    seeds: signatureSeeds,
    proposals: [],
    statusOverrides: { "RS-017": "ACTIVE" },
    feedbacks: [],
    src: seedSource,
  });
  check("pre: 2 signature aktif", pre.activeSignatures === 2, String(pre.activeSignatures));
  check("pre: 1 menunggu publikasi", pre.pendingSignatures === 1, String(pre.pendingSignatures));
  check(
    "post: 3 signature aktif",
    postStats.activeSignatures === 3,
    String(postStats.activeSignatures),
  );
  check(
    "post: network matches +1 (6 → 7)",
    postStats.networkMatches === pre.networkMatches + 1,
    `${pre.networkMatches} → ${postStats.networkMatches}`,
  );
  check(
    "post: pending matches 0",
    postStats.pendingMatches === 0,
    String(postStats.pendingMatches),
  );
}

console.log("");
console.log(`${passed} PASS, ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);

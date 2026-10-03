import * as fs from "node:fs";
import * as path from "node:path";
import type { ProofAssessment } from "@/data/app/proof";
import { PROOF_MODEL_VERSION } from "@/data/app/proof";
import type { Billing, Claim, EvidenceKind, Service } from "@/data/app/types";
import { EVIDENCE_ORDER } from "@/data/app/types";
import {
  buildConformanceWorkflow,
  evaluateConformance,
} from "@/lib/app/conformance";
import { canTransition, evaluateProof } from "@/lib/app/proof";
import { assessClaimProof } from "@/lib/app/services/proofService";

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

const STAMP = "2026-09-30 12:00";

// ---------------------------------------------------------------- helpers

function present(kind: EvidenceKind, at: string) {
  return { kind, state: "present" as const, at, source: "Sistem" as const };
}
function missing(kind: EvidenceKind) {
  return { kind, state: "missing" as const };
}

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "SVC-TEST-01",
    patientId: "P-1025",
    providerId: "T-031",
    facilityId: "FAC-01",
    templateId: "TPL-PHYSIO",
    servicePoint: "Ruang Fisioterapi 2",
    date: "2026-09-02",
    startTime: "08:00",
    endTime: "09:30",
    status: "SELESAI",
    claimId: "CLM-TEST-01",
    sessionId: 1,
    evidence: [
      present("arrival", "08:00"),
      present("provider", "08:05"),
      present("treatment", "08:30"),
      present("note", "08:40"),
      present("completion", "09:00"),
      present("billing", "09:10"),
      present("claim", "09:15"),
    ],
    events: [
      {
        id: "EV-1",
        serviceId: "SVC-TEST-01",
        kind: "start",
        at: "08:10",
        source: "Sistem",
        description: "Mulai layanan",
      },
    ],
    ...overrides,
  };
}

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "CLM-TEST-01",
    patientId: "P-1025",
    templateId: "TPL-PHYSIO",
    facilityId: "FAC-01",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-10",
    status: "SUPPORTED",
    items: [
      {
        id: "CI-1",
        claimId: "CLM-TEST-01",
        serviceId: "SVC-TEST-01",
        sessionId: 1,
        amount: 100000,
      },
    ],
    lastUpdated: "2026-09-30 10:00",
    ...overrides,
  };
}

const TEST_BILLINGS: Billing[] = [
  { id: "BLG-TEST-01", serviceId: "SVC-TEST-01", amount: 100000, createdAt: "09:10" },
];

function fullClaimInput() {
  return {
    claim: makeClaim(),
    sessions: [makeService()],
    template: {
      id: "TPL-PHYSIO",
      name: "Fisioterapi",
      nameEn: "Physiotherapy",
      required: [...EVIDENCE_ORDER],
      rate: 150000,
      description: "-",
    },
    billings: TEST_BILLINGS,
    assessedAt: STAMP,
  };
}

function dim(a: ProofAssessment, name: string) {
  return a.dimensions.find((d) => d.dimension === name)?.verdict;
}

// A. Golden claim — CLM-08421
console.log("A. Golden CLM-08421");
{
  const r = assessClaimProof("CLM-08421", { assessedAt: STAMP });
  check("hasil tidak null", !!r);
  if (r) {
    const a = r.assessment;
    check("state PROOF_GAP", a.state === "PROOF_GAP", a.state);
    check("triangulation PARTIAL", a.triangulation === "PARTIAL", a.triangulation);
    check(
      "conformance MISSING_STAGE",
      a.conformance?.status === "MISSING_STAGE",
      a.conformance?.status,
    );
    check("trace TRACEABLE", a.traceStatus === "TRACEABLE", a.traceStatus);
    check("modelVersion", a.modelVersion === PROOF_MODEL_VERSION);
    check("assessedAt terisi", a.assessedAt === STAMP);
    check(
      "dimensi non-evidence PASS",
      (["identity", "provider", "serviceContext", "temporal", "billing", "claim"] as const).every(
        (d) => dim(a, d) === "PASS",
      ),
      JSON.stringify(a.dimensions),
    );
    check("evidence GAP", dim(a, "evidence") === "GAP", dim(a, "evidence"));
    const g09 = a.gaps.find((g) => g.serviceId.endsWith("-09"));
    const g10 = a.gaps.find((g) => g.serviceId.endsWith("-10"));
    check(
      "sesi 09 treatment+completion critical",
      !!g09 &&
        g09.dimension === "evidence" &&
        g09.gaps.join("+") === "treatment+completion" &&
        g09.severity === "critical",
      JSON.stringify(g09),
    );
    check(
      "sesi 10 completion warning",
      !!g10 &&
        g10.gaps.join("+") === "completion" &&
        g10.severity === "warning",
      JSON.stringify(g10),
    );
    check("2 gap total", a.gaps.length === 2, String(a.gaps.length));
    check("0 konflik", a.conflicts.length === 0, String(a.conflicts.length));
    check("witness > 0", r.witnesses.length > 0, String(r.witnesses.length));
    check(
      "ada witness billing",
      r.witnesses.some((w) => w.id.startsWith("W-BIL-")),
    );
  }
}

// B. Klaim temporal conflict — CLM-08416
console.log("B. Temporal conflict CLM-08416");
{
  const r = assessClaimProof("CLM-08416", { assessedAt: STAMP });
  check("hasil tidak null", !!r);
  if (r) {
    const a = r.assessment;
    check("state INCONSISTENT", a.state === "INCONSISTENT", a.state);
    check("temporal CONFLICT", dim(a, "temporal") === "CONFLICT", dim(a, "temporal"));
    check("triangulation CONFLICT", a.triangulation === "CONFLICT", a.triangulation);
    check(
      "conformance OUT_OF_ORDER",
      a.conformance?.status === "OUT_OF_ORDER",
      a.conformance?.status,
    );
    check(
      "alasan billing sebelum penyelesaian",
      a.conformance?.reasons.some((x) => x.includes("Billing") && x.includes("Penyelesaian")) ??
        false,
      JSON.stringify(a.conformance?.reasons),
    );
    check("konflik > 0", a.conflicts.length > 0, String(a.conflicts.length));
    check("0 gap", a.gaps.length === 0, String(a.gaps.length));
  }
}

// C. Klaim bersih — CLM-08611 & CLM-08409
console.log("C. Klaim bersih");
for (const id of ["CLM-08611", "CLM-08409"]) {
  const r = assessClaimProof(id, { assessedAt: STAMP });
  check(`${id} hasil tidak null`, !!r);
  if (!r) continue;
  const a = r.assessment;
  check(`${id} state CORROBORATED`, a.state === "CORROBORATED", a.state);
  check(`${id} triangulation AGREE`, a.triangulation === "AGREE", a.triangulation);
  check(
    `${id} conformance CONFORMANT`,
    a.conformance?.status === "CONFORMANT",
    a.conformance?.status,
  );
  check(`${id} trace TRACEABLE`, a.traceStatus === "TRACEABLE", a.traceStatus);
  check(`${id} 0 gap`, a.gaps.length === 0, String(a.gaps.length));
  check(
    `${id} semua dimensi PASS`,
    a.dimensions.every((d) => d.verdict === "PASS"),
    JSON.stringify(a.dimensions.map((d) => [d.dimension, d.verdict])),
  );
}

// D. Gap multipel — CLM-08610
console.log("D. Gap multipel CLM-08610");
{
  const r = assessClaimProof("CLM-08610", { assessedAt: STAMP });
  check("hasil tidak null", !!r);
  if (r) {
    const a = r.assessment;
    check("3 gap", a.gaps.length === 3, String(a.gaps.length));
    const critical = a.gaps.filter((g) => g.severity === "critical");
    const warning = a.gaps.filter((g) => g.severity === "warning");
    check("2 critical (≥2 jenis)", critical.length === 2, String(critical.length));
    check("1 warning (1 jenis)", warning.length === 1, String(warning.length));
    check(
      "critical = note+completion",
      critical.every((g) => g.gaps.join("+") === "note+completion"),
      JSON.stringify(critical.map((g) => g.gaps)),
    );
    check("state PROOF_GAP", a.state === "PROOF_GAP", a.state);
  }
}

// E. Determinisme
console.log("E. Determinisme");
{
  const input = fullClaimInput();
  const r1 = evaluateProof(input);
  const r2 = evaluateProof(input);
  check(
    "evaluasi berulang identik",
    JSON.stringify(r1) === JSON.stringify(r2),
  );
}

// F. Mesin state ProofState
console.log("F. Transisi ProofState");
{
  check("REGISTERED → IDENTITY_BOUND", canTransition("REGISTERED", "IDENTITY_BOUND"));
  check("REGISTERED → INCONSISTENT", canTransition("REGISTERED", "INCONSISTENT"));
  check("ATTESTED → CORROBORATED", canTransition("ATTESTED", "CORROBORATED"));
  check("CORROBORATED → SEALED", canTransition("CORROBORATED", "SEALED"));
  check("PROOF_GAP → REGISTERED", canTransition("PROOF_GAP", "REGISTERED"));
  check("INCONSISTENT → REGISTERED", canTransition("INCONSISTENT", "REGISTERED"));
  check(
    "CORROBORATED → ATTESTED ditolak",
    !canTransition("CORROBORATED", "ATTESTED"),
  );
  check("SEALED → apa pun ditolak", !canTransition("SEALED", "CORROBORATED"));
  check("REGISTERED → SEALED ditolak", !canTransition("REGISTERED", "SEALED"));
}

// G. Derivasi state dari input sintetis
console.log("G. Derivasi state sintetis");
{
  // REGISTERED: tidak ada check-in sama sekali
  const noArrival = fullClaimInput();
  noArrival.sessions = [
    makeService({
      evidence: [
        missing("arrival"),
        present("provider", "08:05"),
        present("treatment", "08:30"),
        present("note", "08:40"),
        present("completion", "09:00"),
        present("billing", "09:10"),
        present("claim", "09:15"),
      ],
    }),
  ];
  check("tanpa arrival → REGISTERED", evaluateProof(noArrival).assessment.state === "REGISTERED");

  // IDENTITY_BOUND: arrival ada, provider hilang
  const noProvider = fullClaimInput();
  noProvider.sessions = [
    makeService({
      evidence: [
        present("arrival", "08:00"),
        missing("provider"),
        present("treatment", "08:30"),
        present("note", "08:40"),
        present("completion", "09:00"),
        present("billing", "09:10"),
        present("claim", "09:15"),
      ],
    }),
  ];
  const np = evaluateProof(noProvider);
  check("tanpa provider → IDENTITY_BOUND", np.assessment.state === "IDENTITY_BOUND", np.assessment.state);
  check(
    "provider dimensi GAP",
    dim(np.assessment, "provider") === "GAP",
    dim(np.assessment, "provider"),
  );

  // ATTESTED: billing belum masuk tahap (UNKNOWN), sisanya PASS
  const billingPending = fullClaimInput();
  billingPending.billings = [];
  billingPending.sessions = [
    makeService({
      evidence: [
        present("arrival", "08:00"),
        present("provider", "08:05"),
        present("treatment", "08:30"),
        present("note", "08:40"),
        present("completion", "09:00"),
        missing("billing"),
        present("claim", "09:15"),
      ],
    }),
  ];
  const bp = evaluateProof(billingPending);
  check("billing UNKNOWN", dim(bp.assessment, "billing") === "UNKNOWN", dim(bp.assessment, "billing"));
  check("tanpa billing → ATTESTED", bp.assessment.state === "ATTESTED", bp.assessment.state);
  check(
    "triangulation PARTIAL (ada UNKNOWN)",
    bp.assessment.triangulation === "PARTIAL",
    bp.assessment.triangulation,
  );

  // SEALED: semua PASS + sealed
  const sealed = evaluateProof({ ...fullClaimInput(), sealed: true });
  check("PASS+sealed → SEALED", sealed.assessment.state === "SEALED", sealed.assessment.state);

  // INCONSISTENT: pasien tidak cocok
  const mismatch = fullClaimInput();
  mismatch.sessions = [makeService({ patientId: "P-OTHER" })];
  const mm = evaluateProof(mismatch);
  check("pasien beda → INCONSISTENT", mm.assessment.state === "INCONSISTENT", mm.assessment.state);
  check(
    "identity dimensi CONFLICT",
    dim(mm.assessment, "identity") === "CONFLICT",
    dim(mm.assessment, "identity"),
  );

  // PROOF_GAP: evidence klinis hilang (2 jenis → critical)
  const gapInput = fullClaimInput();
  gapInput.sessions = [
    makeService({
      evidence: [
        present("arrival", "08:00"),
        present("provider", "08:05"),
        missing("treatment"),
        missing("note"),
        present("completion", "09:00"),
        present("billing", "09:10"),
        present("claim", "09:15"),
      ],
    }),
  ];
  const gi = evaluateProof(gapInput);
  check("evidence hilang → PROOF_GAP", gi.assessment.state === "PROOF_GAP", gi.assessment.state);
  check("1 gap critical", gi.assessment.gaps.length === 1 && gi.assessment.gaps[0].severity === "critical");
}

// H. Conformance evaluator
console.log("H. Conformance");
{
  const svc = makeService();
  const wf = buildConformanceWorkflow("CLM-TEST-01", svc, STAMP);
  check("semua tahap DONE", wf.stages.every((s) => s.status === "DONE"));
  check(
    "windowEnd ikut terisi",
    wf.windowStart === "08:00" && wf.windowEnd === "09:30",
    `${wf.windowStart}/${wf.windowEnd}`,
  );
  check("CONFORMANT", evaluateConformance([wf]).status === "CONFORMANT");

  // MISSING_STAGE: completion hilang
  const w2 = buildConformanceWorkflow("CLM-TEST-01", makeService(), STAMP);
  w2.stages = w2.stages.map((s) =>
    s.stage === "COMPLETION" ? { ...s, status: "PENDING", at: undefined } : s,
  );
  check("MISSING_STAGE", evaluateConformance([w2]).status === "MISSING_STAGE");

  // OUT_OF_ORDER: billing sebelum completion
  const w3 = buildConformanceWorkflow("CLM-TEST-01", makeService(), STAMP);
  w3.stages = w3.stages.map((s) => {
    if (s.stage === "BILLING") return { ...s, at: "08:50" };
    if (s.stage === "COMPLETION") return { ...s, at: "09:00" };
    return s;
  });
  const r3 = evaluateConformance([w3]);
  check("OUT_OF_ORDER", r3.status === "OUT_OF_ORDER", r3.status);
  check("menyebut Billing & Penyelesaian", r3.reasons.some((x) => x.includes("Billing")));

  // DEVIATED: urutan benar tetapi claim tercatat setelah jendela layanan
  const w4 = buildConformanceWorkflow("CLM-TEST-01", makeService(), STAMP);
  w4.stages = w4.stages.map((s) => (s.stage === "CLAIM" ? { ...s, at: "10:00" } : s));
  const r4 = evaluateConformance([w4]);
  check("DEVIATED", r4.status === "DEVIATED", r4.status);
  check("menyebut jendela layanan", r4.reasons.some((x) => x.includes("jendela")), JSON.stringify(r4.reasons));

  // Precedence: MISSING_STAGE menang atas OUT_OF_ORDER
  const w5 = w3; // billing out of order
  const w5b = buildConformanceWorkflow("CLM-TEST-01", makeService(), STAMP);
  w5b.stages = w5b.stages.map((s) =>
    s.stage === "COMPLETION" ? { ...s, status: "PENDING", at: undefined } : s,
  );
  check(
    "precedence MISSING_STAGE > OUT_OF_ORDER",
    evaluateConformance([w5, w5b]).status === "MISSING_STAGE",
  );

  // Precedence: OUT_OF_ORDER menang atas DEVIATED
  const w6 = buildConformanceWorkflow("CLM-TEST-01", makeService(), STAMP);
  w6.windowEnd = "09:05"; // claim 09:15 di luar jendela → DEVIATED
  w6.stages = w6.stages.map((s) => {
    if (s.stage === "BILLING") return { ...s, at: "08:50" }; // billing < completion → OUT_OF_ORDER
    if (s.stage === "CLAIM") return { ...s, at: "10:00" }; // di luar jendela
    return s;
  });
  const r6 = evaluateConformance([w6]);
  check(
    "precedence OUT_OF_ORDER > DEVIATED",
    r6.status === "OUT_OF_ORDER",
    r6.status,
  );
}

// I. Trace linkage gap + triangulation PENDING
console.log("I. Trace & triangulation");
{
  // Sesi tidak tertaut klaim + item hilang → LINKAGE_GAP
  const bad = fullClaimInput();
  bad.claim = makeClaim({ items: [] });
  bad.sessions = [makeService({ claimId: "CLM-OTHER" })];
  const br = evaluateProof(bad);
  check("trace LINKAGE_GAP", br.traceStatus === "LINKAGE_GAP", br.traceStatus);
  check("claim dimensi GAP", dim(br.assessment, "claim") === "GAP", dim(br.assessment, "claim"));
  check(
    "alasan trace menyebut item & claimId",
    br.trace.edges.length > 0 && br.assessment.gaps.some((g) => g.dimension === "claim"),
  );

  // Tidak ada witness sama sekali → triangulation PENDING
  const noWitness = fullClaimInput();
  noWitness.sessions = [
    makeService({
      claimId: undefined,
      evidence: [
        missing("arrival"),
        missing("provider"),
        missing("treatment"),
        missing("note"),
        missing("completion"),
        missing("billing"),
        missing("claim"),
      ],
    }),
  ];
  noWitness.billings = [];
  const nw = evaluateProof(noWitness);
  check("0 witness → PENDING", nw.assessment.triangulation === "PENDING", nw.assessment.triangulation);
  check("0 witness → REGISTERED", nw.assessment.state === "REGISTERED", nw.assessment.state);
}

// J. Off hot path — modul locked tidak mengimport proof
console.log("J. Off hot path");
{
  const root = process.cwd();
  const locked = [
    "lib/app/score.ts",
    "lib/app/signals.ts",
    "lib/app/gate.ts",
    "lib/app/selectors.ts",
    "lib/app/network.ts",
    "lib/app/rules.ts",
    "lib/app/clarification.ts",
    "lib/app/permissions.ts",
  ];
  const banned = ["lib/app/proof", "proofService", "lib/app/conformance"];
  for (const f of locked) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    const hit = banned.find((b) => src.includes(b));
    check(`${f} bebas import proof`, !hit, hit);
  }
}

console.log(`\n${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;

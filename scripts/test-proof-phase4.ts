import type { AuditEntry, Role } from "@/data/app/types";
import type { PersistedState } from "@/lib/app/appState";
import {
  applyEvidenceAdds,
  initialPersistedState,
  mergePersistedState,
} from "@/lib/app/appState";
import { canonicalContent, integrityRefOf } from "@/lib/app/provenance";
import { getTemplate, seedSource } from "@/lib/app/selectors";
import {
  appendAnchorEvent,
  assessClaimProof,
  assessProofAction,
  sealProofAction,
} from "@/lib/app/services/proofService";
import {
  captureEvidence,
  startService,
} from "@/lib/app/services/serviceService";

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

const OP = { id: "U-OP", name: "Budi Operator", role: "operator" as Role };
const STAMP = "2026-09-30 12:00";

const proofTypesOf = (s: PersistedState) =>
  s.proofEvents.map((e) => e.proofType);
const auditOf = (s: PersistedState, action: string) =>
  s.audit.filter((a) => a.action === action);

let state: PersistedState = initialPersistedState;
let serviceId = "";
let earlyAuditIds: string[] = [];

// A. SERVICE_STARTED → proof event + audit
console.log("A. SERVICE_STARTED");
{
  const result = startService(
    state,
    {
      patientId: "P-1025",
      providerId: "T-031",
      templateId: "TPL-PHYSIO",
      servicePoint: "Ruang Fisioterapi 1",
    },
    OP.name,
    OP.role,
    OP.id,
  );
  state = result.state;
  serviceId = result.serviceId;
  const ev = state.proofEvents.find(
    (e) => e.proofType === "SERVICE_STARTED" && e.serviceId === serviceId,
  );
  check("proof event SERVICE_STARTED tercatat", !!ev, proofTypesOf(state).join());
  check("audit SERVICE_STARTED", auditOf(state, "SERVICE_STARTED").some((a) => a.entityId === serviceId));
  check("createdServices +1", state.createdServices.length === 1);
  check("proof event membawa actorId", ev?.actorId === OP.id);
}

// B. IDENTITY_BOUND → proof event (+ audit)
console.log("B. IDENTITY_BOUND");
{
  const ev = state.proofEvents.find(
    (e) => e.proofType === "IDENTITY_BOUND" && e.serviceId === serviceId,
  );
  check("proof event IDENTITY_BOUND tercatat", !!ev);
  check(
    "audit IDENTITY_BOUND",
    auditOf(state, "IDENTITY_BOUND").some(
      (a) => a.entityId === `${serviceId}#arrival`,
    ),
  );
}

// C. EVIDENCE_RECORDED → proof event
console.log("C. EVIDENCE_RECORDED");
{
  const next = captureEvidence(state, serviceId, "treatment", OP.name, OP.role, "MANUAL", OP.id);
  check("capture menghasilkan state", !!next);
  if (next) {
    state = next;
    const ev = state.proofEvents.find(
      (e) =>
        e.proofType === "EVIDENCE_RECORDED" &&
        e.serviceId === serviceId &&
        e.kind === "treatment",
    );
    check("proof event EVIDENCE_RECORDED", !!ev);
    check("event membawa kind & actor", ev?.kind === "treatment" && ev?.actorId === OP.id);
    check(
      "audit EVIDENCE_ADDED tetap dipakai",
      auditOf(state, "EVIDENCE_ADDED").some(
        (a) => a.entityId === `${serviceId}#treatment`,
      ),
    );
    check(
      "audit PROVENANCE_RECORDED (CREATE)",
      state.audit.some(
        (a) =>
          a.action === "PROVENANCE_RECORDED" &&
          a.entityId === `${serviceId}#treatment`,
      ),
    );
  }
}

// D. SERVICE_COMPLETED → proof event
console.log("D. SERVICE_COMPLETED");
{
  const required = getTemplate("TPL-PHYSIO").required;
  for (const kind of required) {
    const created = state.createdServices.find((s) => s.id === serviceId);
    const overlaid = created
      ? applyEvidenceAdds(created, state.evidenceAdds)
      : undefined;
    const present =
      overlaid?.evidence.find((e) => e.kind === kind)?.state === "present";
    if (present) continue;
    const next = captureEvidence(state, serviceId, kind, OP.name, OP.role, "MANUAL", OP.id);
    if (next) state = next;
  }
  const ev = state.proofEvents.find(
    (e) => e.proofType === "SERVICE_COMPLETED" && e.serviceId === serviceId,
  );
  check("proof event SERVICE_COMPLETED", !!ev);
  check(
    "audit SERVICE_COMPLETED",
    auditOf(state, "SERVICE_COMPLETED").some((a) => a.entityId === serviceId),
  );
  earlyAuditIds = state.audit.map((a) => a.id);
}

// E. PROOF_ASSESSED → assessment + state + audit
console.log("E. PROOF_ASSESSED");
{
  state = assessProofAction(state, "CLM-08611", OP);
  const a = state.proofAssessments["CLM-08611"];
  check("assessment tersimpan", !!a);
  check("state CORROBORATED", a?.state === "CORROBORATED", a?.state);
  check("proofStates terisi", state.proofStates["CLM-08611"] === "CORROBORATED");
  check(
    "audit PROOF_ASSESSED",
    auditOf(state, "PROOF_ASSESSED").some((a2) => a2.entityId === "CLM-08611"),
  );
  check(
    "proof event PROOF_ASSESSED",
    state.proofEvents.some(
      (e) => e.proofType === "PROOF_ASSESSED" && e.claimId === "CLM-08611",
    ),
  );
}

// F. PROVENANCE version 1
console.log("F. PROVENANCE v1");
{
  const rec = state.provenance.find(
    (r) => r.resourceId === `${serviceId}#treatment` && r.version === 1,
  );
  check("record provenance ada", !!rec);
  check("version 1", rec?.version === 1, String(rec?.version));
  check("action CREATE", rec?.action === "CREATE", rec?.action);
  check("integrityRef terisi", !!rec?.integrityRef, rec?.integrityRef);
  check("previousIntegrityRef kosong pada v1", rec?.previousIntegrityRef === undefined);
  check("content tersimpan", !!rec?.content);
}

// G. Update evidence → version 2 + chain
console.log("G. Evidence update → v2 + chain");
{
  const rec1 = state.provenance.find(
    (r) => r.resourceId === `${serviceId}#treatment` && r.version === 1,
  );
  const addsBefore = state.evidenceAdds.filter(
    (a) => a.serviceId === serviceId && a.kind === "treatment",
  ).length;
  const next = captureEvidence(state, serviceId, "treatment", OP.name, OP.role, "MANUAL", OP.id);
  check("re-capture menghasilkan state", !!next);
  if (next) {
    state = next;
    const rec2 = state.provenance.find(
      (r) => r.resourceId === `${serviceId}#treatment` && r.version === 2,
    );
    check("proof event EVIDENCE_UPDATED", state.proofEvents.some((e) => e.proofType === "EVIDENCE_UPDATED" && e.serviceId === serviceId));
    check("audit EVIDENCE_UPDATED", auditOf(state, "EVIDENCE_UPDATED").some((a) => a.entityId === `${serviceId}#treatment`));
    check("provenance v2 tercatat", !!rec2, String(state.provenance.length));
    check("action UPDATE", rec2?.action === "UPDATE", rec2?.action);
    check("v2.previousIntegrityRef === v1.integrityRef", rec2?.previousIntegrityRef === rec1?.integrityRef);
    check(
      "evidenceAdds lama tetap tercatat (behavior existing utuh)",
      state.evidenceAdds.filter(
        (a) => a.serviceId === serviceId && a.kind === "treatment",
      ).length === addsBefore + 1,
    );
  }
}

// H. Integrity chain (ditekankan ulang pada level terpisah)
console.log("H. Integrity chain");
{
  const v1 = state.provenance.find(
    (r) => r.resourceId === `${serviceId}#treatment` && r.version === 1,
  );
  const v2 = state.provenance.find(
    (r) => r.resourceId === `${serviceId}#treatment` && r.version === 2,
  );
  check("v1 & v2 ada", !!v1 && !!v2);
  check("v2.previousIntegrityRef === v1.integrityRef", v2?.previousIntegrityRef === v1?.integrityRef);
}

// I. Same content/version → same integrityRef
console.log("I. Determinisme integrityRef");
{
  const parts = {
    resourceId: "R-TEST",
    resourceType: "Evidence",
    action: "CREATE",
    version: 1,
    content: { b: 2, a: 1, nested: { z: [1, 2], y: "ok" } },
  };
  const again = { ...parts, content: { nested: { y: "ok", z: [1, 2] }, a: 1, b: 2 } };
  check("input identik (beda urutan key) → ref identik", integrityRefOf(parts) === integrityRefOf(again));
  check("canonicalContent stabil", canonicalContent(parts.content) === canonicalContent(again.content));
  check("tanpa Date.now/random di hash", /^int-[0-9a-f]{8}-[0-9a-f]{8}$/.test(integrityRefOf(parts)));
}

// J. Different content/version → different integrityRef
console.log("J. Perbedaan konten/versi");
{
  const base = {
    resourceId: "R-TEST",
    resourceType: "Evidence",
    action: "CREATE",
    version: 1,
    content: { a: 1 },
  };
  const ref = integrityRefOf(base);
  check("konten beda → ref beda", ref !== integrityRefOf({ ...base, content: { a: 2 } }));
  check("versi beda → ref beda", ref !== integrityRefOf({ ...base, version: 2 }));
  check("resource beda → ref beda", ref !== integrityRefOf({ ...base, resourceId: "R-OTHER" }));
}

// K. PROOF_SEALED hanya bila evaluator mengizinkan
console.log("K. Seal eligibility");
{
  state = assessProofAction(state, "CLM-08421", OP);
  check("assessment 08421 → PROOF_GAP", state.proofAssessments["CLM-08421"]?.state === "PROOF_GAP");

  const refused = sealProofAction(state, "CLM-08421", OP);
  check("CLM-08421 (PROOF_GAP) → no-op", refused === state);
  check("state CLM-08421 tidak berubah", state.proofStates["CLM-08421"] === "PROOF_GAP", state.proofStates["CLM-08421"]);
  check("tidak ada audit PROOF_SEALED untuk 08421", !auditOf(state, "PROOF_SEALED").some((a) => a.entityId === "CLM-08421"));
  check("tidak ada provenance Proof untuk 08421", !state.provenance.some((r) => r.resourceType === "Proof" && r.resourceId === "CLM-08421"));

  state = sealProofAction(state, "CLM-08611", OP);
  check("CLM-08611 (CORROBORATED) → SEALED", state.proofStates["CLM-08611"] === "SEALED");
  check("assessment final SEALED", state.proofAssessments["CLM-08611"]?.state === "SEALED");
  const sealAudit = auditOf(state, "PROOF_SEALED").filter((a) => a.entityId === "CLM-08611");
  check("audit PROOF_SEALED", sealAudit.length === 1, String(sealAudit.length));
  check("deskripsi menyebut diseal", sealAudit[0]?.description.includes("diseal") ?? false);
  check(
    "audit PROVENANCE_RECORDED untuk Proof",
    state.audit.some((a) => a.action === "PROVENANCE_RECORDED" && a.entityId === "CLM-08611"),
  );
  const sealRec = state.provenance.find((r) => r.resourceType === "Proof" && r.resourceId === "CLM-08611");
  check("provenance SEAL v1 + integrityRef", !!sealRec && sealRec.version === 1 && !!sealRec.integrityRef);
  check(
    "proof event PROOF_SEALED",
    state.proofEvents.some((e) => e.proofType === "PROOF_SEALED" && e.claimId === "CLM-08611"),
  );
}

// L. Seal idempoten
console.log("L. Seal idempoten");
{
  const before = state;
  const sealedAgain = sealProofAction(state, "CLM-08611", OP);
  check("seal ulang → state identik (no-op)", sealedAgain === before);
  check(
    "audit PROOF_SEALED tetap 1",
    auditOf(sealedAgain, "PROOF_SEALED").filter((a) => a.entityId === "CLM-08611").length === 1,
  );
  check(
    "provenance Proof tetap 1",
    sealedAgain.provenance.filter((r) => r.resourceType === "Proof" && r.resourceId === "CLM-08611").length === 1,
  );
}

// M. Payload localStorage lama tetap kompatibel
console.log("M. Backward compatibility payload lama");
{
  const oldAudit: AuditEntry = {
    id: "AUD-OLD-1",
    at: "2026-09-30 09:00",
    user: "Pengguna Demo",
    role: "reviewer",
    action: "CLAIM_REVIEWED",
    entity: "Claim",
    entityId: "CLM-08421",
    description: "Tinjauan lama.",
  };
  const oldPayload = {
    role: "operator",
    createdServices: [],
    evidenceAdds: [
      { serviceId: "SVC-08421-09", kind: "treatment", at: "10:00", source: "Provider", channel: "MANUAL" },
    ],
    statusOverrides: {},
    reviews: [],
    audit: [oldAudit],
    notifications: [],
    readIds: ["N-1"],
    nextSeq: 7,
    proposals: [],
    signatureStatus: {},
    feedbacks: [],
  };
  const merged = mergePersistedState(JSON.parse(JSON.stringify(oldPayload)));
  check("field proof terisi default", merged.proofEvents.length === 0 && merged.attestations.length === 0 && merged.anchors.length === 0 && merged.provenance.length === 0);
  check("proofStates & proofAssessments default", Object.keys(merged.proofStates).length === 0 && Object.keys(merged.proofAssessments).length === 0);
  check("payload lama dipertahankan", merged.role === "operator" && merged.nextSeq === 7 && merged.readIds[0] === "N-1" && merged.evidenceAdds.length === 1);
  check("audit lama utuh", merged.audit.length === 1 && merged.audit[0].id === "AUD-OLD-1");
}

// N. Audit entries existing tetap utuh
console.log("N. Audit existing utuh");
{
  const finalIds = new Set(state.audit.map((a) => a.id));
  check(
    "semua audit awal masih ada setelah aksi seal",
    earlyAuditIds.length > 0 && earlyAuditIds.every((id) => finalIds.has(id)),
    `${earlyAuditIds.length} entri`,
  );
  check("audit awal SERVICE_STARTED masih ada", auditOf(state, "SERVICE_STARTED").some((a) => a.entityId === serviceId));
  check("audit awal EVIDENCE_ADDED masih ada", auditOf(state, "EVIDENCE_ADDED").some((a) => a.entityId === `${serviceId}#treatment`));
  check("audit awal IDENTITY_BOUND masih ada", auditOf(state, "IDENTITY_BOUND").some((a) => a.entityId === `${serviceId}#arrival`));
}

// O. Golden flow — klaim emas tidak berubah
console.log("O. Golden flow");
{
  const g = [
    ["CLM-08421", "PROOF_GAP"],
    ["CLM-08611", "CORROBORATED"],
    ["CLM-08409", "CORROBORATED"],
    ["CLM-08416", "INCONSISTENT"],
    ["CLM-08610", "PROOF_GAP"],
  ] as const;
  for (const [id, expect] of g) {
    const r = assessClaimProof(id, { assessedAt: STAMP });
    check(`${id} → ${expect}`, r?.assessment.state === expect, r?.assessment.state);
  }
}

// P. Evidence berubah → assessment stale
console.log("P. Assessment stale");
{
  state = assessProofAction(state, "CLM-08421", OP);
  check("assessment 08421 tersimpan & belum stale", state.proofAssessments["CLM-08421"]?.stale === undefined);

  const missingSvc = seedSource.services.find(
    (s) =>
      s.claimId === "CLM-08421" &&
      s.evidence.some((e) => e.state === "missing"),
  );
  const missingKind = missingSvc?.evidence.find((e) => e.state === "missing")?.kind;
  check("ada seed sesi 08421 dengan evidence missing", !!missingSvc && !!missingKind, missingSvc?.id);
  if (missingSvc && missingKind) {
    const next = captureEvidence(state, missingSvc.id, missingKind, OP.name, OP.role, "MANUAL", OP.id);
    if (next) state = next;
    check(
      `capture ${missingKind} → assessment stale`,
      state.proofAssessments["CLM-08421"]?.stale === true,
      String(state.proofAssessments["CLM-08421"]?.stale),
    );
    state = assessProofAction(state, "CLM-08421", OP);
    const fresh = state.proofAssessments["CLM-08421"];
    check("re-assess → stale hilang (assessment wajib diulang)", fresh?.stale === undefined);
    check(
      `gap ${missingKind} pada ${missingSvc.id} hilang setelah re-assess`,
      !!fresh &&
        !fresh.gaps.some(
          (g) =>
            g.dimension === "evidence" &&
            g.serviceId === missingSvc.id &&
            g.gaps.includes(missingKind),
        ),
      JSON.stringify(fresh?.gaps.map((g) => [g.serviceId, g.gaps])),
    );
  }
}

// Q. SERVICE_ANCHORED (addAnchorEvent reducer)
console.log("Q. SERVICE_ANCHORED");
{
  const res = appendAnchorEvent(
    state,
    {
      serviceId,
      sequence: 1,
      previousHash: "0000",
      contentHash: "abcd1234",
      source: "Sistem",
      state: "ANCHORED",
    },
    OP,
  );
  state = res.state;
  check("anchor event tersimpan", state.anchors.some((a) => a.id === res.id));
  check("audit SERVICE_ANCHORED", auditOf(state, "SERVICE_ANCHORED").some((a) => a.entityId === serviceId));
  check("proof event SERVICE_ANCHORED", state.proofEvents.some((e) => e.proofType === "SERVICE_ANCHORED" && e.serviceId === serviceId));
}

console.log(`\n${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;

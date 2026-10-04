import type { Role } from "@/data/app/types";
import type { PersistedState } from "@/lib/app/appState";
import { initialPersistedState } from "@/lib/app/appState";
import {
  attestServiceStart,
  confirmServiceAnchor,
} from "@/lib/app/services/proofService";
import { findAnchor } from "@/data/app/anchorRegistry";
import { startService } from "@/lib/app/services/serviceService";

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

const OP = { id: "U-OP-01", name: "Sari Wijaya", role: "operator" as Role };
const PR = { id: "U-PR-01", name: "Arif Nugroho", role: "provider" as Role };

const proofTypesOf = (s: PersistedState) =>
  s.proofEvents.map((e) => e.proofType);
const auditOf = (s: PersistedState, action: string) =>
  s.audit.filter((a) => a.action === action);
const eventsOf = (s: PersistedState, serviceId: string, type: string) =>
  s.proofEvents.filter(
    (e) => e.serviceId === serviceId && e.proofType === type,
  );

let state: PersistedState = initialPersistedState;
let serviceId = "";

// A. Operator memulai sesi (startService tidak diubah)
console.log("A. startService (operator, tidak diubah)");
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
  const svc = state.createdServices.find((s) => s.id === serviceId);
  check("sesi layanan dibuat", !!svc, serviceId);
  check("facility FAC-01 (template Fisioterapi)", svc?.facilityId === "FAC-01");
  check(
    "operator SERVICE_STARTED tercatat",
    eventsOf(state, serviceId, "SERVICE_STARTED").some(
      (e) => e.source === "Operator",
    ),
    proofTypesOf(state).join(),
  );
}

// B. attestServiceStart (provider) → proof event + audit
console.log("B. attestServiceStart");
{
  const before = eventsOf(state, serviceId, "SERVICE_STARTED").length;
  const r = attestServiceStart(state, serviceId, PR);
  state = r.state;
  const ev = eventsOf(state, serviceId, "SERVICE_STARTED");
  check("outcome ATTESTED", r.outcome === "ATTESTED", r.outcome);
  check(
    "provider SERVICE_STARTED +1",
    ev.length === before + 1 && ev.some((e) => e.source === "Provider"),
    String(ev.length),
  );
  check(
    "audit SERVICE_ATTESTED",
    auditOf(state, "SERVICE_ATTESTED").some((a) => a.entityId === serviceId),
  );
  check(
    "event membawa actorId provider",
    ev.find((e) => e.source === "Provider")?.actorId === PR.id,
  );
}

// C. Idempoten: attestasi berulang tidak menggandakan event
console.log("C. attestServiceStart idempoten");
{
  const count = eventsOf(state, serviceId, "SERVICE_STARTED").length;
  const r = attestServiceStart(state, serviceId, PR);
  check("outcome IDEMPOTENT", r.outcome === "IDEMPOTENT", r.outcome);
  check("state tidak berubah", r.state === state);
  check(
    "jumlah event tetap",
    eventsOf(state, serviceId, "SERVICE_STARTED").length === count,
  );
}

// D. Anchor salah (beda faskes/titik) → MISMATCH, ditolak
console.log("D. anchor konteks salah → MISMATCH");
{
  const r = confirmServiceAnchor(
    state,
    { serviceId, code: "RADIOLOGY-02", method: "QR" },
    PR,
  );
  state = r.state;
  check("outcome MISMATCH", r.outcome === "MISMATCH", r.outcome);
  check(
    "pesan memuat ANCHOR CONTEXT MISMATCH",
    r.message.includes("ANCHOR CONTEXT MISMATCH"),
    r.message,
  );
  check(
    "tanpa kata terlarang",
    !/fraud|blockchain|immutable|tamper/i.test(r.message),
    r.message,
  );
  check(
    "tanpa event SERVICE_ANCHORED",
    eventsOf(state, serviceId, "SERVICE_ANCHORED").length === 0,
    proofTypesOf(state).join(),
  );
  check("tanpa anchor event", !state.anchors.some((a) => a.serviceId === serviceId));
  check(
    "audit ANCHOR_MISMATCH",
    auditOf(state, "ANCHOR_MISMATCH").some((a) => a.entityId === serviceId),
  );
}

// E. Anchor kode tidak dikenal → MISMATCH
console.log("E. kode anchor tidak terdaftar → MISMATCH");
{
  const r = confirmServiceAnchor(
    state,
    { serviceId, code: "TITIK-999", method: "VIRTUAL" },
    PR,
  );
  check("outcome MISMATCH", r.outcome === "MISMATCH", r.outcome);
  check(
    "tanpa SERVICE_ANCHORED",
    eventsOf(state, serviceId, "SERVICE_ANCHORED").length === 0,
  );
}

// F. Anchor benar → CONFIRMED (event + audit + konteks)
console.log("F. anchor benar → CONFIRMED");
{
  const r = confirmServiceAnchor(
    state,
    { serviceId, code: "PHYSIO-01", method: "VIRTUAL" },
    PR,
  );
  state = r.state;
  check("outcome CONFIRMED", r.outcome === "CONFIRMED", r.outcome);
  const anc = state.anchors.find((a) => a.serviceId === serviceId);
  check("anchor event tersimpan", !!anc, r.message);
  check("state ANCHORED", anc?.state === "ANCHORED");
  check("facilityId konteks", anc?.facilityId === "FAC-01");
  check("servicePointId = PHYSIO-01", anc?.servicePointId === "PHYSIO-01");
  check("servicePoint konteks", anc?.servicePoint === "Ruang Fisioterapi 1");
  check("method VIRTUAL", anc?.method === "VIRTUAL");
  check("sequence 1", anc?.sequence === 1);
  check("source Provider", anc?.source === "Provider");
  check(
    "proof event SERVICE_ANCHORED",
    eventsOf(state, serviceId, "SERVICE_ANCHORED").length === 1,
    proofTypesOf(state).join(),
  );
  check(
    "audit SERVICE_ANCHORED",
    auditOf(state, "SERVICE_ANCHORED").some((a) => a.entityId === serviceId),
  );
}

// G. Konfirmasi berulang konteks sama → idempoten, tanpa duplikasi
console.log("G. konfirmasi ulang idempoten");
{
  const ancBefore = state.anchors.length;
  const r = confirmServiceAnchor(
    state,
    { serviceId, code: "PHYSIO-01", method: "QR" },
    PR,
  );
  check("outcome IDEMPOTENT", r.outcome === "IDEMPOTENT", r.outcome);
  check("state identik (tidak ditulis ulang)", r.state === state);
  check(
    "jumlah anchor tetap",
    state.anchors.length === ancBefore,
    `${state.anchors.length} vs ${ancBefore}`,
  );
  check(
    "jumlah SERVICE_ANCHORED tetap",
    eventsOf(state, serviceId, "SERVICE_ANCHORED").length === 1,
  );
}

// H. Anchor berbeda setelah valid → ditolak, tidak menimpa anchor aktif
console.log("H. anchor berbeda tidak menimpa");
{
  const r = confirmServiceAnchor(
    state,
    { serviceId, code: "PHYSIO-02", method: "VIRTUAL" },
    PR,
  );
  check("outcome MISMATCH", r.outcome === "MISMATCH", r.outcome);
  check(
    "anchor aktif tetap PHYSIO-01",
    state.anchors.find((a) => a.serviceId === serviceId)?.servicePointId ===
      "PHYSIO-01",
  );
  check(
    "tanpa SERVICE_ANCHORED baru",
    eventsOf(state, serviceId, "SERVICE_ANCHORED").length === 1,
  );
}

// I. Registry: kode contoh spec + lookup
console.log("I. anchor registry");
{
  check("PHYSIO-04 terdaftar", findAnchor("PHYSIO-04")?.facilityId === "FAC-03");
  check(
    "RADIOLOGY-02 terdaftar (Radiologi Puspa)",
    findAnchor("radiology-02")?.servicePoint === "Radiologi Puspa",
  );
  check("lookup case-insensitive + trim", findAnchor("  physio-01  ")?.code === "PHYSIO-01");
  check("kode tak dikenal → undefined", findAnchor("NOPE-1") === undefined);
}

// J. Determinisme: contentHash sama untuk input sama (tanpa waktu runtime)
console.log("J. contentHash deterministik");
{
  const base = startService(
    initialPersistedState,
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
  const r1 = confirmServiceAnchor(
    base.state,
    { serviceId: base.serviceId, code: "PHYSIO-01", method: "VIRTUAL" },
    PR,
  );
  const r2 = confirmServiceAnchor(
    base.state,
    { serviceId: base.serviceId, code: "PHYSIO-01", method: "VIRTUAL" },
    PR,
  );
  check(
    "contentHash identik antar run",
    (r1.state.anchors[0]?.contentHash ?? "") ===
      (r2.state.anchors[0]?.contentHash ?? ""),
    `${r1.state.anchors[0]?.contentHash} vs ${r2.state.anchors[0]?.contentHash}`,
  );
  check(
    "previousHash empty pada sequence pertama",
    r1.state.anchors[0]?.previousHash === "",
  );
}

console.log(`\n${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);

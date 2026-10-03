import type {
  Attestation,
  ClaimTrace,
  ClaimTraceStatus,
  ClaimTraceEdge,
  ClaimTraceNode,
  ConformanceResult,
  ConformanceWorkflow,
  EvidenceEvent,
  ProofAssessment,
  ProofDimension,
  ProofDimensionResult,
  ProofDimensionVerdict,
  ProofGapItem,
  ProofState,
  ServiceAnchorEvent,
  TriangulationOutcome,
  Witness,
} from "@/data/app/proof";
import { PROOF_MODEL_VERSION, PROOF_TRANSITIONS } from "@/data/app/proof";
import type {
  Billing,
  Claim,
  EvidenceKind,
  Service,
  ServiceTemplate,
} from "@/data/app/types";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import {
  buildConformanceWorkflow,
  evaluateConformance,
} from "@/lib/app/conformance";

/**
 * Proof Evaluator — DOMAIN EVALUATION ONLY (Phase 3).
 *
 * OFF HOT PATH: modul ini TIDAK di-import claimView, score.ts, signals.ts,
 * gate.ts, ranking/queue, maupun network matcher. Evaluasi hanya dipanggil
 * dari proof-specific service/halaman (explicit assess), bukan per render.
 *
 * Deterministik: input sama → output sama. Tidak ada random, Date.now,
 * network, maupun global mutable state; assessedAt diberikan oleh caller.
 */

export type ProofEvaluationInput = {
  claim: Claim;
  sessions: Service[];
  template: ServiceTemplate;
  billings: Billing[];
  evidenceEvents?: EvidenceEvent[];
  attestations?: Attestation[];
  anchors?: ServiceAnchorEvent[];
  sealed?: boolean;
  assessedAt: string;
};

export type ProofEvaluationResult = {
  assessment: ProofAssessment;
  witnesses: Witness[];
  workflows: ConformanceWorkflow[];
  conformance: ConformanceResult;
  trace: ClaimTrace;
  traceStatus: ClaimTraceStatus;
};

const evidenceOf = (s: Service, kind: EvidenceKind) =>
  s.evidence.find((e) => e.kind === kind);

const isPresent = (s: Service, kind: EvidenceKind) =>
  evidenceOf(s, kind)?.state === "present";

const atOf = (s: Service, kind: EvidenceKind): string | undefined => {
  const e = evidenceOf(s, kind);
  return e?.state === "present" ? e.at : undefined;
};

const sess = (s: Service) =>
  `Sesi ${String(s.sessionId ?? 0).padStart(2, "0")}`;

const verdictOf = (
  dims: ProofDimensionResult[],
  d: ProofDimension,
): ProofDimensionVerdict =>
  dims.find((x) => x.dimension === d)?.verdict ?? "UNKNOWN";

const result = (
  dimension: ProofDimension,
  verdict: ProofDimensionVerdict,
  refs: string[],
  reason?: string,
): ProofDimensionResult => ({
  dimension,
  verdict,
  refs,
  ...(reason ? { reason } : {}),
});

/**
 * Resolusi ProofState dari verdict dimensi (deterministik, absolut):
 * - konflik witness            → INCONSISTENT (menang atas gap)
 * - tanpa identity witness     → REGISTERED (belum terikat sama sekali)
 * - identity parsial           → PROOF_GAP
 * - provider belum tercatat    → IDENTITY_BOUND (identitas sudah, provider belum)
 * - gap dimensi lain           → PROOF_GAP
 * - ada UNKNOWN (billing/claim belum sampai) → ATTESTED (butuh dukungan)
 * - semua PASS + sealed        → SEALED, selain itu CORROBORATED
 */
function deriveProofState(
  dims: ProofDimensionResult[],
  arrivalWitnesses: number,
  sealed: boolean,
): ProofState {
  if (dims.some((d) => d.verdict === "CONFLICT")) return "INCONSISTENT";
  if (arrivalWitnesses === 0) return "REGISTERED";
  if (verdictOf(dims, "identity") === "GAP") return "PROOF_GAP";
  const provider = verdictOf(dims, "provider");
  if (provider === "GAP" || provider === "UNKNOWN") return "IDENTITY_BOUND";
  for (const d of [
    "serviceContext",
    "evidence",
    "temporal",
    "billing",
    "claim",
  ] as const) {
    if (verdictOf(dims, d) === "GAP") return "PROOF_GAP";
  }
  const ladders: ProofDimension[] = [
    "serviceContext",
    "evidence",
    "temporal",
    "billing",
    "claim",
  ];
  if (ladders.some((d) => verdictOf(dims, d) === "UNKNOWN")) {
    return "ATTESTED";
  }
  return sealed ? "SEALED" : "CORROBORATED";
}

export function canTransition(from: ProofState, to: ProofState): boolean {
  return (PROOF_TRANSITIONS[from] ?? []).includes(to);
}

function resolveTriangulation(
  witnessCount: number,
  dims: ProofDimensionResult[],
): TriangulationOutcome {
  if (witnessCount === 0) return "PENDING";
  if (dims.some((d) => d.verdict === "CONFLICT")) return "CONFLICT";
  if (dims.some((d) => d.verdict === "GAP")) return "PARTIAL";
  if (dims.some((d) => d.verdict === "UNKNOWN")) return "PARTIAL";
  return "AGREE";
}

export function buildProofWitnesses(
  claim: Claim,
  sessions: Service[],
  billings: Billing[],
  evidenceEvents: EvidenceEvent[],
  attestations: Attestation[],
  anchors: ServiceAnchorEvent[],
): Witness[] {
  const w: Witness[] = [];

  for (const s of sessions) {
    const arrival = atOf(s, "arrival");
    if (arrival) {
      w.push({
        id: `W-ID-${s.id}`,
        source: "Operator",
        role: "primary",
        statementRef: s.id,
        at: arrival,
      });
    }
    const provider = atOf(s, "provider");
    if (provider) {
      w.push({
        id: `W-PRV-${s.id}`,
        source: "Provider",
        role: "corroborating",
        statementRef: s.id,
        at: provider,
      });
    }
    const billing = billings.find((b) => b.serviceId === s.id);
    if (billing) {
      w.push({
        id: `W-BIL-${s.id}`,
        source: "Sistem",
        role: "corroborating",
        statementRef: billing.id,
        at: billing.createdAt,
      });
    }
  }

  for (const a of attestations) {
    w.push({
      id: `W-ATT-${a.id}`,
      source: a.actorRole === "provider" ? "Provider" : a.actorRole === "operator" ? "Operator" : "Sistem",
      role: "corroborating",
      statementRef: a.subjectId,
      actorId: a.actorId,
      at: a.at,
    });
  }

  for (const an of anchors) {
    w.push({
      id: `W-ANC-${an.id}`,
      source: "Sistem",
      role: "corroborating",
      statementRef: an.serviceId,
      at: an.anchoredAt,
    });
  }

  for (const ev of evidenceEvents) {
    w.push({
      id: `W-EVT-${ev.id}`,
      source: ev.source,
      role: "corroborating",
      statementRef: ev.serviceId,
      at: ev.observedAt,
    });
  }

  if (sessions.some((s) => s.claimId === claim.id)) {
    w.push({
      id: `W-CLM-${claim.id}`,
      source: "Sistem",
      role: "corroborating",
      statementRef: claim.id,
      at: claim.lastUpdated,
    });
  }

  return w;
}

export function assessClaimTrace(
  claim: Claim,
  sessions: Service[],
  billings: Billing[],
): { status: ClaimTraceStatus; trace: ClaimTrace; reasons: string[] } {
  const nodes: ClaimTraceNode[] = [
    { id: `trace:${claim.id}`, kind: "claim", label: claim.id, refId: claim.id },
    {
      id: `trace:svc:${claim.templateId}`,
      kind: "service",
      label: claim.templateId,
      refId: claim.templateId,
    },
  ];
  const edges: ClaimTraceEdge[] = [];
  const reasons: string[] = [];

  for (const s of sessions) {
    const ses = sess(s);
    const item = claim.items.find((i) => i.serviceId === s.id);
    const billing = billings.find((b) => b.serviceId === s.id);
    const chargeId = item ? `trace:chg:${s.id}` : null;
    const invoiceId = billing ? `trace:inv:${s.id}` : null;
    const encId = `trace:enc:${s.id}`;

    if (s.claimId !== claim.id) {
      reasons.push(
        `${ses}: sesi tidak tertaut ke klaim ini (claimId=${s.claimId ?? "kosong"})`,
      );
    }
    if (!item) reasons.push(`${ses}: item klaim tidak ditemukan`);
    if (!billing) reasons.push(`${ses}: billing tidak ditemukan`);

    if (invoiceId && billing) {
      nodes.push({
        id: invoiceId,
        kind: "invoice",
        label: billing.id,
        refId: billing.id,
      });
      edges.push({
        from: `trace:${claim.id}`,
        to: invoiceId,
        label: "HAS_INVOICE",
      });
    }
    if (chargeId && item) {
      nodes.push({
        id: chargeId,
        kind: "charge",
        label: item.id,
        refId: item.id,
      });
      if (invoiceId) {
        edges.push({ from: invoiceId, to: chargeId, label: "CHARGES" });
      }
      edges.push({
        from: chargeId,
        to: `trace:svc:${claim.templateId}`,
        label: "FOR_SERVICE",
      });
    }

    nodes.push({ id: encId, kind: "encounter", label: sess(s), refId: s.id });
    edges.push({
      from: `trace:svc:${claim.templateId}`,
      to: encId,
      label: "HAS_ENCOUNTER",
    });

    nodes.push({
      id: `trace:prv:${s.providerId}`,
      kind: "provider",
      label: s.providerId,
      refId: s.providerId,
    });
    edges.push({
      from: encId,
      to: `trace:prv:${s.providerId}`,
      label: "PROVIDED_BY",
    });

    for (const e of s.evidence) {
      if (e.state !== "present") continue;
      const id = `trace:ev:${s.id}:${e.kind}`;
      nodes.push({
        id,
        kind: "evidence",
        label: EVIDENCE_LABEL[e.kind],
        refId: `${s.id}:${e.kind}`,
        detail: e.at,
      });
      edges.push({ from: encId, to: id, label: "SUPPORTED_BY" });
    }
  }

  if (sessions.length === 0) {
    reasons.push("Klaim tidak memiliki sesi layanan");
  }

  const trace: ClaimTrace = {
    claimId: claim.id,
    nodes,
    edges,
    generatedAt: claim.lastUpdated,
  };
  return {
    status: reasons.length === 0 ? "TRACEABLE" : "LINKAGE_GAP",
    trace,
    reasons,
  };
}

export function evaluateProof(input: ProofEvaluationInput): ProofEvaluationResult {
  const { claim, template, billings, assessedAt, sealed = false } = input;
  const sessions = [...input.sessions].sort(
    (a, b) => (a.sessionId ?? 0) - (b.sessionId ?? 0),
  );
  const evidenceEvents = input.evidenceEvents ?? [];
  const attestations = input.attestations ?? [];
  const anchors = input.anchors ?? [];

  const dims: ProofDimensionResult[] = [];
  const gaps: ProofGapItem[] = [];
  const conflicts: string[] = [];

  // 1. identity — check-in (arrival) per sesi + kecocokan pasien
  if (sessions.length === 0) {
    dims.push(result("identity", "UNKNOWN", [], "Klaim belum memiliki sesi layanan"));
  } else {
    const patientMismatch = sessions.filter(
      (s) => s.patientId !== claim.patientId,
    );
    const bound = sessions.filter((s) => isPresent(s, "arrival"));
    const missingArrival = sessions.filter((s) => !isPresent(s, "arrival"));
    if (patientMismatch.length > 0) {
      for (const s of patientMismatch) {
        conflicts.push(
          `${sess(s)}: pasien ${s.patientId} tidak sama dengan pasien klaim ${claim.patientId}`,
        );
      }
      dims.push(
        result(
          "identity",
          "CONFLICT",
          patientMismatch.map((s) => s.id),
          "Identitas pasien pada sesi tidak sama dengan klaim",
        ),
      );
    } else if (bound.length === 0) {
      dims.push(
        result("identity", "GAP", [], "Belum ada check-in pada sesi mana pun"),
      );
    } else if (missingArrival.length > 0) {
      for (const s of missingArrival) {
        gaps.push({
          dimension: "identity",
          serviceId: s.id,
          claimId: claim.id,
          gaps: ["arrival"],
          status: "OPEN",
          severity: "warning",
          reasons: [`${sess(s)}: check-in (kedatangan) belum tercatat`],
        });
      }
      dims.push(
        result(
          "identity",
          "GAP",
          missingArrival.map((s) => s.id),
          "Sebagian sesi belum memiliki check-in",
        ),
      );
    } else {
      dims.push(result("identity", "PASS", bound.map((s) => s.id)));
    }
  }

  // 2. provider — verifikasi provider + kecocokan attestation
  if (sessions.length === 0) {
    dims.push(result("provider", "UNKNOWN", [], "Tidak ada sesi untuk dinilai"));
  } else {
    const mismatched = attestations.filter((a) => {
      if (a.subjectType !== "ServicePassport") return false;
      const s = sessions.find((x) => x.id === a.subjectId);
      return !!s && s.providerId !== a.actorId;
    });
    const missingProvider = sessions.filter((s) => !isPresent(s, "provider"));
    if (mismatched.length > 0) {
      for (const a of mismatched) {
        const s = sessions.find((x) => x.id === a.subjectId);
        conflicts.push(
          `Attestasi ${a.id} oleh ${a.actorId} tidak sama dengan provider sesi ${s?.providerId ?? "?"}`,
        );
      }
      dims.push(
        result(
          "provider",
          "CONFLICT",
          mismatched.map((a) => a.id),
          "Provider pada attestation tidak sama dengan penugasan layanan",
        ),
      );
    } else if (missingProvider.length > 0) {
      for (const s of missingProvider) {
        gaps.push({
          dimension: "provider",
          serviceId: s.id,
          claimId: claim.id,
          gaps: ["provider"],
          status: "OPEN",
          severity: "warning",
          reasons: [`${sess(s)}: verifikasi provider belum tercatat`],
        });
      }
      dims.push(
        result(
          "provider",
          "GAP",
          missingProvider.map((s) => s.id),
          "Verifikasi provider belum tercatat pada sebagian sesi",
        ),
      );
    } else {
      dims.push(
        result(
          "provider",
          "PASS",
          [
            ...sessions.map((s) => s.id),
            ...attestations.map((a) => a.id),
          ],
        ),
      );
    }
  }

  // 3. serviceContext — kecocokan template/faskes + anchor
  if (sessions.length === 0) {
    dims.push(result("serviceContext", "UNKNOWN", [], "Tidak ada sesi untuk dinilai"));
  } else {
    const issues: string[] = [];
    const badRefs: string[] = [];
    for (const s of sessions) {
      if (s.templateId !== claim.templateId) {
        issues.push(
          `${sess(s)}: template ${s.templateId} berbeda dari klaim ${claim.templateId}`,
        );
        badRefs.push(s.id);
      }
      if (s.facilityId !== claim.facilityId) {
        issues.push(
          `${sess(s)}: faskes ${s.facilityId} berbeda dari klaim ${claim.facilityId}`,
        );
        badRefs.push(s.id);
      }
    }
    for (const a of anchors) {
      if (a.state === "FAILED") {
        issues.push(`Anchor ${a.id} pada ${a.serviceId} gagal dibuat`);
        badRefs.push(a.id);
      }
    }
    if (issues.length > 0) {
      for (const reason of issues) conflicts.push(reason);
      dims.push(result("serviceContext", "CONFLICT", badRefs, issues[0]));
    } else {
      dims.push(
        result(
          "serviceContext",
          "PASS",
          [...sessions.map((s) => s.id), ...anchors.map((a) => a.id)],
        ),
      );
    }
  }

  // 4. evidence — kelengkapan bukti klinis per sesi (billing/claim dinilai dimensi sendiri)
  if (sessions.length === 0) {
    dims.push(result("evidence", "UNKNOWN", [], "Tidak ada sesi untuk dinilai"));
  } else {
    const affected: string[] = [];
    for (const s of sessions) {
      const missing = template.required.filter(
        (k) => k !== "billing" && k !== "claim" && !isPresent(s, k),
      );
      if (missing.length === 0) continue;
      affected.push(s.id);
      gaps.push({
        dimension: "evidence",
        serviceId: s.id,
        claimId: claim.id,
        gaps: missing,
        status: "OPEN",
        severity: missing.length >= 2 ? "critical" : "warning",
        reasons: missing.map(
          (k) => `${sess(s)}: ${EVIDENCE_LABEL[k]} belum tercatat`,
        ),
      });
    }
    if (affected.length > 0) {
      dims.push(
        result(
          "evidence",
          "GAP",
          affected,
          "Bukti klinis wajib belum lengkap pada sebagian sesi",
        ),
      );
    } else {
      dims.push(result("evidence", "PASS", sessions.map((s) => s.id)));
    }
  }

  // 5. temporal — urutan timestamp bukti dalam sesi + periode klaim
  {
    const bad: string[] = [];
    for (const s of sessions) {
      for (let i = 0; i < EVIDENCE_ORDER.length; i++) {
        for (let j = i + 1; j < EVIDENCE_ORDER.length; j++) {
          const earlier = atOf(s, EVIDENCE_ORDER[i]);
          const later = atOf(s, EVIDENCE_ORDER[j]);
          if (!earlier || !later) continue;
          if (later < earlier) {
            if (!bad.includes(s.id)) bad.push(s.id);
            conflicts.push(
              `${sess(s)}: ${EVIDENCE_LABEL[EVIDENCE_ORDER[j]]} (${later}) tercatat sebelum ${EVIDENCE_LABEL[EVIDENCE_ORDER[i]]} (${earlier})`,
            );
          }
        }
      }
      if (s.date < claim.periodFrom || s.date > claim.periodTo) {
        if (!bad.includes(s.id)) bad.push(s.id);
        conflicts.push(
          `${sess(s)}: tanggal layanan ${s.date} di luar periode klaim ${claim.periodFrom}–${claim.periodTo}`,
        );
      }
      if (s.endTime && s.endTime < s.startTime) {
        if (!bad.includes(s.id)) bad.push(s.id);
        conflicts.push(
          `${sess(s)}: waktu selesai ${s.endTime} lebih awal dari mulai ${s.startTime}`,
        );
      }
    }
    if (sessions.length === 0) {
      dims.push(result("temporal", "UNKNOWN", [], "Tidak ada sesi untuk dinilai"));
    } else if (bad.length > 0) {
      dims.push(
        result("temporal", "CONFLICT", bad, "Terdapat ketidakcocokan waktu"),
      );
    } else {
      dims.push(result("temporal", "PASS", sessions.map((s) => s.id)));
    }
  }

  // 6. billing — bukti billing + Billing record tersambung
  if (sessions.length === 0) {
    dims.push(result("billing", "UNKNOWN", [], "Tidak ada sesi untuk dinilai"));
  } else {
    const affected: string[] = [];
    let pending = 0;
    for (const s of sessions) {
      const hasEvidence = isPresent(s, "billing");
      const hasRow = billings.some((b) => b.serviceId === s.id);
      if (hasEvidence && hasRow) continue;
      if (!hasEvidence && !hasRow) {
        // Sesi belum masuk tahap billing — belum dinilai (bukan gap).
        pending += 1;
        continue;
      }
      affected.push(s.id);
      gaps.push({
        dimension: "billing",
        serviceId: s.id,
        claimId: claim.id,
        gaps: ["billing"],
        status: "OPEN",
        severity: "critical",
        reasons: [
          hasEvidence
            ? `${sess(s)}: bukti billing ada tanpa Billing record`
            : `${sess(s)}: Billing record ada tanpa bukti billing`,
        ],
      });
    }
    if (affected.length > 0) {
      dims.push(
        result(
          "billing",
          "GAP",
          affected,
          "Tautan billing tidak utuh pada sebagian sesi",
        ),
      );
    } else if (pending > 0) {
      dims.push(
        result("billing", "UNKNOWN", [], "Belum ada sesi yang masuk tahap billing"),
      );
    } else {
      dims.push(result("billing", "PASS", sessions.map((s) => s.id)));
    }
  }

  // 7. claim — tautan sesi → klaim → item
  if (sessions.length === 0) {
    dims.push(result("claim", "UNKNOWN", [], "Tidak ada sesi untuk dinilai"));
  } else {
    const affected: string[] = [];
    for (const s of sessions) {
      const reasons: string[] = [];
      if (s.claimId !== claim.id) {
        reasons.push(
          `${sess(s)}: sesi tidak tertaut ke klaim ini (claimId=${s.claimId ?? "kosong"})`,
        );
      }
      if (!claim.items.some((i) => i.serviceId === s.id)) {
        reasons.push(`${sess(s)}: item klaim tidak ditemukan untuk sesi ini`);
      }
      if (!isPresent(s, "claim")) {
        reasons.push(`${sess(s)}: bukti terkait klaim belum tercatat`);
      }
      if (reasons.length > 0) {
        affected.push(s.id);
        gaps.push({
          dimension: "claim",
          serviceId: s.id,
          claimId: claim.id,
          gaps: ["claim"],
          status: "OPEN",
          severity: "critical",
          reasons,
        });
      }
    }
    if (affected.length > 0) {
      dims.push(
        result("claim", "GAP", affected, "Tautan klaim tidak utuh pada sebagian sesi"),
      );
    } else {
      dims.push(result("claim", "PASS", sessions.map((s) => s.id)));
    }
  }

  const workflows = sessions.map((s) =>
    buildConformanceWorkflow(claim.id, s, claim.lastUpdated),
  );
  const conformance = evaluateConformance(workflows);
  const traceResult = assessClaimTrace(claim, sessions, billings);
  const witnesses = buildProofWitnesses(
    claim,
    sessions,
    billings,
    evidenceEvents,
    attestations,
    anchors,
  );
  const arrivalWitnesses = sessions.filter((s) => isPresent(s, "arrival")).length;
  const triangulation = resolveTriangulation(witnesses.length, dims);
  const state = deriveProofState(dims, arrivalWitnesses, sealed);

  const assessment: ProofAssessment = {
    claimId: claim.id,
    state,
    dimensions: dims,
    gaps,
    conflicts,
    triangulation,
    conformance,
    traceStatus: traceResult.status,
    assessedAt,
    modelVersion: PROOF_MODEL_VERSION,
  };

  return {
    assessment,
    witnesses,
    workflows,
    conformance,
    trace: traceResult.trace,
    traceStatus: traceResult.status,
  };
}


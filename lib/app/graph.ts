import { EVIDENCE_LABEL } from "@/data/app/types";
import { claimView, getProvider, seedSource } from "@/lib/app/selectors";
import type { DataSource } from "@/lib/app/selectors";

export type GraphNodeKind =
  | "claim"
  | "session"
  | "evidence"
  | "signal"
  | "patient"
  | "provider"
  | "servicePoint"
  | "billing"
  | "note";

export type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  detail?: string;
  missing?: boolean;
  sessionId?: number;
};

export type GraphEdge = { from: string; to: string; label: string };

export type GraphPayload = {
  source: "seed" | "neo4j";
  claimId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type NeoSessionRow = {
  sessionId: number;
  status: string;
  evidence: { kind: string; state: string; at?: string }[];
};

export type NeoSignalRow = {
  code: string;
  message: string;
  sessionId?: number;
};

export function claimNodeId(claimId: string): string {
  return claimId;
}

export function sessionNodeId(claimId: string, sessionId: number): string {
  return `${claimId}:S${sessionId}`;
}

export function evidenceNodeId(
  claimId: string,
  sessionId: number,
  kind: string,
): string {
  return `${claimId}:S${sessionId}:${kind}`;
}

function evidenceNodeKind(kind: string): GraphNodeKind {
  if (kind === "billing") return "billing";
  if (kind === "note") return "note";
  return "evidence";
}

function evidenceEdgeLabel(kind: string, present: boolean): string {
  if (!present) return "HAS_EVIDENCE";
  if (kind === "note") return "DOCUMENTED_BY";
  if (kind === "billing") return "GENERATED_BILLING";
  return "SUPPORTED_BY";
}

function entityLayer(
  claimId: string,
  view: NonNullable<ReturnType<typeof claimView>>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  sessionNodeIds: Map<number, string>,
) {
  if (view.patient) {
    nodes.push({
      id: `PAT:${view.claim.patientId}`,
      label: view.patient.display,
      kind: "patient",
      detail: view.claim.patientId,
    });
    edges.push({
      from: `PAT:${view.claim.patientId}`,
      to: claimNodeId(claimId),
      label: "LINKED_TO_CLAIM",
    });
  }

  const providersDone = new Set<string>();
  const pointsDone = new Set<string>();

  for (const s of view.sessions) {
    const sid = sessionNodeIds.get(s.sessionId);
    if (!sid) continue;
    const service = s.service;

    if (!providersDone.has(service.providerId)) {
      providersDone.add(service.providerId);
      nodes.push({
        id: `PRV:${service.providerId}`,
        label:
          getProvider(service.providerId)?.name ?? service.providerId,
        kind: "provider",
        detail: getProvider(service.providerId)?.profession ?? service.providerId,
      });
    }
    edges.push({
      from: sid,
      to: `PRV:${service.providerId}`,
      label: "PROVIDED_BY",
    });

    if (!pointsDone.has(service.servicePoint)) {
      pointsDone.add(service.servicePoint);
      nodes.push({
        id: `SP:${service.servicePoint}`,
        label: service.servicePoint,
        kind: "servicePoint",
        detail: "titik layanan",
      });
    }
    edges.push({
      from: sid,
      to: `SP:${service.servicePoint}`,
      label: "OCCURRED_AT",
    });
  }
}

export function buildSeedGraph(
  claimId: string,
  src: DataSource = seedSource,
): GraphPayload | null {
  const view = claimView(claimId, src);
  if (!view) return null;

  const nodes: GraphNode[] = [
    {
      id: claimNodeId(claimId),
      label: claimId,
      kind: "claim",
      detail: `${view.template.name} · ${view.evaluation.supported}/${view.evaluation.claimed} didukung`,
    },
  ];
  const edges: GraphEdge[] = [];
  const sessionNodeIds = new Map<number, string>();

  for (const s of view.sessions) {
    const sid = sessionNodeId(claimId, s.sessionId);
    sessionNodeIds.set(s.sessionId, sid);
    nodes.push({
      id: sid,
      label: `Sesi ${String(s.sessionId).padStart(2, "0")}`,
      kind: "session",
      detail: s.evaluation.status,
      sessionId: s.sessionId,
    });
    edges.push({ from: claimNodeId(claimId), to: sid, label: "HAS_SERVICE" });

    for (const kind of view.template.required) {
      const item = s.service.evidence?.find((e) => e.kind === kind);
      const present = item?.state === "present";
      const eid = evidenceNodeId(claimId, s.sessionId, kind);
      nodes.push({
        id: eid,
        label: EVIDENCE_LABEL[kind as keyof typeof EVIDENCE_LABEL] ?? kind,
        kind: evidenceNodeKind(kind),
        missing: !present,
        detail: present ? item?.at : "Belum tercatat",
        sessionId: s.sessionId,
      });
      edges.push({
        from: sid,
        to: eid,
        label: evidenceEdgeLabel(kind, present),
      });
      if (present && kind === "billing") {
        edges.push({
          from: eid,
          to: claimNodeId(claimId),
          label: "LINKED_TO_CLAIM",
        });
      }
    }
  }

  entityLayer(claimId, view, nodes, edges, sessionNodeIds);

  for (const sig of view.signals) {
    const id = `SIG-${sig.id}`;
    const target = sig.sessionId
      ? sessionNodeId(claimId, sig.sessionId)
      : claimNodeId(claimId);
    nodes.push({
      id,
      label: sig.code,
      kind: "signal",
      detail: sig.message,
      sessionId: sig.sessionId,
    });
    edges.push({ from: target, to: id, label: "SIGNAL" });
  }

  return { source: "seed", claimId, nodes, edges };
}

export function projectNeoRows(
  claimId: string,
  sessions: NeoSessionRow[],
  signals: NeoSignalRow[],
): GraphPayload {
  const nodes: GraphNode[] = [
    { id: claimNodeId(claimId), label: claimId, kind: "claim" },
  ];
  const edges: GraphEdge[] = [];
  const sessionNodeIds = new Map<number, string>();

  const sorted = [...sessions].sort((a, b) => a.sessionId - b.sessionId);
  for (const s of sorted) {
    const sid = sessionNodeId(claimId, s.sessionId);
    sessionNodeIds.set(s.sessionId, sid);
    nodes.push({
      id: sid,
      label: `Sesi ${String(s.sessionId).padStart(2, "0")}`,
      kind: "session",
      detail: s.status,
      sessionId: s.sessionId,
    });
    edges.push({ from: claimNodeId(claimId), to: sid, label: "HAS_SERVICE" });

    for (const e of s.evidence) {
      const present = e.state === "present";
      const eid = evidenceNodeId(claimId, s.sessionId, e.kind);
      nodes.push({
        id: eid,
        label: EVIDENCE_LABEL[e.kind as keyof typeof EVIDENCE_LABEL] ?? e.kind,
        kind: evidenceNodeKind(e.kind),
        missing: !present,
        detail: present ? e.at : "Belum tercatat",
        sessionId: s.sessionId,
      });
      edges.push({
        from: sid,
        to: eid,
        label: evidenceEdgeLabel(e.kind, present),
      });
      if (present && e.kind === "billing") {
        edges.push({
          from: eid,
          to: claimNodeId(claimId),
          label: "LINKED_TO_CLAIM",
        });
      }
    }
  }

  const view = claimView(claimId, seedSource);
  if (view) {
    entityLayer(claimId, view, nodes, edges, sessionNodeIds);
  }

  for (const sig of signals) {
    const id = `SIG-${sig.code}-${sig.sessionId ?? 0}`;
    const target = sig.sessionId
      ? sessionNodeId(claimId, sig.sessionId)
      : claimNodeId(claimId);
    nodes.push({
      id,
      label: sig.code,
      kind: "signal",
      detail: sig.message,
      sessionId: sig.sessionId,
    });
    edges.push({ from: target, to: id, label: "SIGNAL" });
  }

  return { source: "neo4j", claimId, nodes, edges };
}

import { EVIDENCE_LABEL } from "@/data/app/types";
import { claimView, seedSource } from "@/lib/app/selectors";
import type { DataSource } from "@/lib/app/selectors";

export type GraphNodeKind = "claim" | "session" | "evidence" | "signal";

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

  for (const s of view.sessions) {
    const sid = sessionNodeId(claimId, s.sessionId);
    nodes.push({
      id: sid,
      label: `Sesi ${String(s.sessionId).padStart(2, "0")}`,
      kind: "session",
      detail: s.evaluation.status,
      sessionId: s.sessionId,
    });
    edges.push({ from: claimNodeId(claimId), to: sid, label: "HAS_SESSION" });

    for (const kind of view.template.required) {
      const item = s.service.evidence?.find((e) => e.kind === kind);
      const present = item?.state === "present";
      const eid = evidenceNodeId(claimId, s.sessionId, kind);
      nodes.push({
        id: eid,
        label: EVIDENCE_LABEL[kind as keyof typeof EVIDENCE_LABEL] ?? kind,
        kind: "evidence",
        missing: !present,
        detail: present ? item?.at : "Belum tercatat",
        sessionId: s.sessionId,
      });
      edges.push({ from: sid, to: eid, label: "HAS_EVIDENCE" });
    }
  }

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

  const sorted = [...sessions].sort((a, b) => a.sessionId - b.sessionId);
  for (const s of sorted) {
    const sid = sessionNodeId(claimId, s.sessionId);
    nodes.push({
      id: sid,
      label: `Sesi ${String(s.sessionId).padStart(2, "0")}`,
      kind: "session",
      detail: s.status,
      sessionId: s.sessionId,
    });
    edges.push({ from: claimNodeId(claimId), to: sid, label: "HAS_SESSION" });

    for (const e of s.evidence) {
      const present = e.state === "present";
      const eid = evidenceNodeId(claimId, s.sessionId, e.kind);
      nodes.push({
        id: eid,
        label: EVIDENCE_LABEL[e.kind as keyof typeof EVIDENCE_LABEL] ?? e.kind,
        kind: "evidence",
        missing: !present,
        detail: present ? e.at : "Belum tercatat",
        sessionId: s.sessionId,
      });
      edges.push({ from: sid, to: eid, label: "HAS_EVIDENCE" });
    }
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

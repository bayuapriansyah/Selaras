"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Database, Loader2, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/app/store";
import { buildSeedGraph } from "@/lib/app/graph";
import type {
  GraphEdge,
  GraphNode,
  GraphNodeKind,
  GraphPayload,
} from "@/lib/app/graph";

const W = 1040;
const COL = {
  patient: 36,
  claim: 134,
  session: 348,
  entity: 528,
  evidence: 736,
  signal: 954,
};

type Placed = { node: GraphNode; x: number; y: number };

const EVIDENCE_KINDS = new Set(["evidence", "billing", "note"]);

function truncate(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export default function ClaimGraphPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  const { src } = useApp();
  const [payload, setPayload] = React.useState<GraphPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fallback, setFallback] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/graph/${claimId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (alive) {
          setPayload(json);
          setFallback(false);
        }
      })
      .catch(() => {
        if (alive) {
          setPayload(buildSeedGraph(claimId, src));
          setFallback(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [claimId, src]);

  const layout = React.useMemo(() => {
    if (!payload) return null;
    const sessions = payload.nodes
      .filter((n) => n.kind === "session")
      .sort((a, b) => (a.sessionId ?? 0) - (b.sessionId ?? 0));

    const placed: Placed[] = [];
    const byId = new Map<string, Placed>();

    const claimNode = payload.nodes.find((n) => n.kind === "claim");
    const height = Math.max(320, 100 + sessions.length * 78);
    if (claimNode) {
      const p = { node: claimNode, x: COL.claim, y: height / 2 };
      placed.push(p);
      byId.set(claimNode.id, p);
    }

    const patientNode = payload.nodes.find((n) => n.kind === "patient");
    if (patientNode) {
      const p = { node: patientNode, x: COL.patient, y: height / 2 };
      placed.push(p);
      byId.set(patientNode.id, p);
    }

    payload.nodes
      .filter((n) => n.kind === "provider")
      .forEach((n, i) => {
        const p = { node: n, x: COL.entity, y: 36 + i * 30 };
        placed.push(p);
        byId.set(n.id, p);
      });

    const points = payload.nodes.filter((n) => n.kind === "servicePoint");
    points.forEach((n, i) => {
      const p = { node: n, x: COL.entity, y: height - 36 - (points.length - 1 - i) * 30 };
      placed.push(p);
      byId.set(n.id, p);
    });

    sessions.forEach((s, i) => {
      const y = 76 + i * 78 + 24;
      const p = { node: s, x: COL.session, y };
      placed.push(p);
      byId.set(s.id, p);
    });

    payload.nodes
      .filter((n) => EVIDENCE_KINDS.has(n.kind))
      .forEach((n) => {
        const parent = payload.edges.find((e) => e.to === n.id)?.from;
        const pp = parent ? byId.get(parent) : undefined;
        const sameSession = payload.nodes.filter(
          (x) => EVIDENCE_KINDS.has(x.kind) && x.sessionId === n.sessionId,
        );
        const idx = sameSession.findIndex((x) => x.id === n.id);
        const center = pp?.y ?? 0;
        const y = center + (idx - (sameSession.length - 1) / 2) * 13;
        const p = { node: n, x: COL.evidence, y };
        placed.push(p);
        byId.set(n.id, p);
      });

    payload.nodes
      .filter((n) => n.kind === "signal")
      .forEach((n) => {
        const parent = payload.edges.find((e) => e.to === n.id)?.from;
        const pp = parent ? byId.get(parent) : undefined;
        const p = { node: n, x: COL.signal, y: (pp?.y ?? 120) - 16 };
        placed.push(p);
        byId.set(n.id, p);
      });

    return { placed, byId, height };
  }, [payload]);

  function edgePath(e: GraphEdge): string | null {
    if (!layout) return null;
    const a = layout.byId.get(e.from);
    const b = layout.byId.get(e.to);
    if (!a || !b) return null;
    const entityKind = (k: GraphNodeKind) =>
      k === "provider" || k === "servicePoint";
    const x1 =
      a.x +
      (a.node.kind === "claim"
        ? 30
        : a.node.kind === "session"
          ? 18
          : a.node.kind === "patient"
            ? 24
            : entityKind(a.node.kind)
              ? 48
              : 8);
    const x2 =
      b.x -
      (b.node.kind === "session"
        ? 18
        : b.node.kind === "signal"
          ? 10
          : b.node.kind === "claim"
            ? 30
            : b.node.kind === "patient"
              ? 24
              : entityKind(b.node.kind)
                ? 48
                : 9);
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${x2} ${b.y}`;
  }

  const color = (n: GraphNode) => {
    if (n.kind === "claim") return "#0284c7";
    if (n.kind === "session") return "#475569";
    if (n.kind === "signal") return "#dc2626";
    if (n.kind === "patient") return "#0369a1";
    if (n.kind === "provider") return "#475569";
    if (n.kind === "servicePoint") return "#64748b";
    if (n.kind === "billing") return "#475569";
    return n.missing ? "#d97706" : "#059669";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/app/claims/${claimId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Klaim {claimId}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Graf Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Klaim → sesi → evidence → sinyal, plus pasien, provider, titik
            layanan, billing, dan catatan klinis. Node putus-putus = evidence
            belum tercatat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            <Database aria-hidden="true" className="size-3.5" />
            {payload?.source === "neo4j" ? "Neo4j" : "Mode seed"}
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-500">
            {payload ? `${payload.nodes.length} node · ${payload.edges.length} rel` : "—"}
          </span>
        </div>
      </div>

      {fallback ? (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          Endpoint graph tidak tersedia — menampilkan proyeksi lokal dari seed.
        </p>
      ) : null}

      <section
        aria-label="Visualisasi graf"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {loading ? (
          <div className="flex h-72 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Memuat graf evidence…
          </div>
        ) : payload && layout ? (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${W} ${layout.height}`}
              width="100%"
              style={{ minWidth: 760, height: layout.height }}
              role="img"
              aria-label={`Graf evidence klaim ${claimId}`}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill="#cbd5e1" />
                </marker>
              </defs>

              {payload.edges.map((e, i) => {
                const d = edgePath(e);
                if (!d) return null;
                return (
                  <path
                    key={`${e.from}-${e.to}-${i}`}
                    d={d}
                    fill="none"
                    stroke={e.label === "SIGNAL" ? "#fca5a5" : "#e2e8f0"}
                    strokeWidth={e.label === "HAS_SERVICE" ? 2 : 1.5}
                    strokeDasharray={e.label === "SIGNAL" ? "4 3" : undefined}
                    markerEnd="url(#arrow)"
                  >
                    <title>{e.label}</title>
                  </path>
                );
              })}

              {layout.placed.map(({ node, x, y }) => {
                if (node.kind === "patient") {
                  return (
                    <g key={node.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r={24}
                        fill="#e0f2fe"
                        stroke="#0369a1"
                        strokeWidth={1.5}
                      />
                      <text
                        x={x}
                        y={y + 4}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill="#0369a1"
                        fontFamily="monospace"
                      >
                        PASIEN
                      </text>
                      <title>{`${node.label} · ${node.detail ?? ""}`}</title>
                    </g>
                  );
                }
                if (node.kind === "provider" || node.kind === "servicePoint") {
                  const isProvider = node.kind === "provider";
                  return (
                    <g key={node.id}>
                      <rect
                        x={x - 48}
                        y={y - 12}
                        width={96}
                        height={24}
                        rx={12}
                        fill={isProvider ? "#f8fafc" : "#f1f5f9"}
                        stroke={isProvider ? "#475569" : "#94a3b8"}
                        strokeWidth={1.5}
                      />
                      <text
                        x={x}
                        y={y + 3.5}
                        textAnchor="middle"
                        fontSize={9}
                        fill={isProvider ? "#334155" : "#475569"}
                        fontFamily="monospace"
                      >
                        {truncate(isProvider ? node.label : node.label, 15)}
                      </text>
                      <title>{`${node.kind === "provider" ? "Provider" : "Titik layanan"} · ${node.label}`}</title>
                    </g>
                  );
                }
                if (node.kind === "claim") {
                  return (
                    <g key={node.id}>
                      <circle cx={x} cy={y} r={30} fill="#e0f2fe" stroke="#0284c7" strokeWidth={2} />
                      <text
                        x={x}
                        y={y + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={700}
                        fill="#0369a1"
                        fontFamily="monospace"
                      >
                        KLAIM
                      </text>
                      <title>{node.detail ?? node.label}</title>
                    </g>
                  );
                }
                if (node.kind === "session") {
                  return (
                    <g key={node.id}>
                      <circle cx={x} cy={y} r={17} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
                      <text
                        x={x}
                        y={y + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={600}
                        fill="#334155"
                        fontFamily="monospace"
                      >
                        {(node.sessionId ?? 0).toString().padStart(2, "0")}
                      </text>
                      <text x={x} y={y + 32} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
                        {node.detail ?? ""}
                      </text>
                      <title>{`${node.label} · ${node.detail ?? ""}`}</title>
                    </g>
                  );
                }
                if (node.kind === "signal") {
                  return (
                    <g key={node.id}>
                      <path
                        d={`M ${x} ${y - 9} L ${x + 9} ${y} L ${x} ${y + 9} L ${x - 9} ${y} Z`}
                        fill="#fee2e2"
                        stroke="#dc2626"
                        strokeWidth={1.5}
                      />
                      <text x={x + 14} y={y + 4} fontSize={10} fill="#b91c1c" fontFamily="monospace">
                        {node.label}
                      </text>
                      <title>{node.detail ?? node.label}</title>
                    </g>
                  );
                }
                return (
                  <g key={node.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={6}
                      fill={
                        node.missing
                          ? "#fef3c7"
                          : node.kind === "billing"
                            ? "#f1f5f9"
                            : "#d1fae5"
                      }
                      stroke={color(node)}
                      strokeWidth={1.5}
                      strokeDasharray={node.missing ? "2 2" : undefined}
                    />
                    <text
                      x={x + 12}
                      y={y + 3.5}
                      fontSize={10}
                      fill={node.missing ? "#b45309" : "#475569"}
                    >
                      {node.label}
                    </text>
                    <title>{`${node.label} · ${node.detail ?? ""}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            Graf tidak tersedia untuk klaim ini.
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sky-600" /> klaim
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-sky-700 bg-sky-100" />{" "}
            pasien
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-500" /> sesi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full border border-slate-500 bg-slate-100" />{" "}
            provider · titik layanan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-600" /> evidence
            tercatat
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-slate-600 bg-slate-100" />{" "}
            billing · catatan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-dashed border-amber-600 bg-amber-100" />
            belum tercatat
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rotate-45 border border-red-600 bg-red-100" /> sinyal
          </span>
        </div>
      </section>
    </div>
  );
}

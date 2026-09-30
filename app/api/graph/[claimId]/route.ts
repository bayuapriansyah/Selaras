import { NextResponse } from "next/server";
import neo4j, { type Integer } from "neo4j-driver";
import {
  buildSeedGraph,
  projectNeoRows,
  type NeoSessionRow,
  type NeoSignalRow,
} from "@/lib/app/graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ claimId: string }> };

function envConfig() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !password) return null;
  return { uri, user, password };
}

async function fromNeo4j(claimId: string) {
  const cfg = envConfig();
  if (!cfg) return null;

  const driver = neo4j.driver(
    cfg.uri,
    neo4j.auth.basic(cfg.user, cfg.password),
    { connectionAcquisitionTimeout: 2500, maxConnectionLifetime: 10000 },
  );

  try {
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const sessionsRes = await session.run(
        `MATCH (c:Claim {id: $claimId})-[:HAS_SESSION]->(s:Session)-[r:HAS_EVIDENCE]->(e:Evidence)
         RETURN s.sessionId AS sessionId, s.status AS status,
                e.kind AS kind, e.state AS state, e.at AS at
         ORDER BY s.sessionId`,
        { claimId },
      );

      const signalsRes = await session.run(
        `MATCH (s:Session)-[:SIGNAL]->(sig:Signal)
         WHERE s.claimId = $claimId
         RETURN sig.code AS code, sig.message AS message, s.sessionId AS sessionId`,
        { claimId },
      );

      const map = new Map<number, NeoSessionRow>();
      for (const rec of sessionsRes.records) {
        const sessionId = neo4j.isInt(rec.get("sessionId"))
          ? (rec.get("sessionId") as Integer).toNumber()
          : Number(rec.get("sessionId"));
        const status = String(rec.get("status"));
        const row =
          map.get(sessionId) ?? ({ sessionId, status, evidence: [] } as NeoSessionRow);
        row.evidence.push({
          kind: String(rec.get("kind")),
          state: String(rec.get("state")),
          at: rec.get("at") ? String(rec.get("at")) : undefined,
        });
        map.set(sessionId, row);
      }

      const signals: NeoSignalRow[] = signalsRes.records.map((rec) => {
        const sessionId = rec.get("sessionId");
        return {
          code: String(rec.get("code")),
          message: String(rec.get("message")),
          sessionId: sessionId
            ? neo4j.isInt(sessionId)
              ? (sessionId as Integer).toNumber()
              : Number(sessionId)
            : undefined,
        };
      });

      if (map.size === 0) return null;
      return projectNeoRows(claimId, [...map.values()], signals);
    } finally {
      await session.close();
    }
  } catch {
    return null;
  } finally {
    await driver.close().catch(() => undefined);
  }
}

export async function GET(_req: Request, ctx: Params) {
  const { claimId } = await ctx.params;

  const fromGraph = await fromNeo4j(claimId);
  const payload = fromGraph ?? buildSeedGraph(claimId);

  if (!payload) {
    return NextResponse.json(
      { error: "Claim tidak ditemukan", claimId },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { ...payload, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}

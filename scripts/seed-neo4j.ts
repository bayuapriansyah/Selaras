import neo4j from "neo4j-driver";
import { claims, riskSignals, services } from "../data/app/seed";
import { getPatient, getProvider, getTemplate } from "../lib/app/selectors";
import { evaluateSession } from "../lib/app/rules";

function envConfig() {
  const uri = process.env.NEO4J_URI;
  const password = process.env.NEO4J_PASSWORD;
  const user = process.env.NEO4J_USER ?? "neo4j";
  if (!uri || !password) {
    console.error(
      "NEO4J_URI / NEO4J_PASSWORD belum di-set. Isi .env.local lalu jalankan ulang.",
    );
    process.exit(1);
  }
  return { uri, user, password };
}

async function main() {
  const cfg = envConfig();
  const driver = neo4j.driver(
    cfg.uri,
    neo4j.auth.basic(cfg.user, cfg.password),
    { connectionAcquisitionTimeout: 5000 },
  );

  try {
    await driver.verifyConnectivity();

    let claimsCount = 0;
    let sessionsCount = 0;
    let evidenceCount = 0;
    let signalsCount = 0;

    for (const claim of claims) {
      const template = getTemplate(claim.templateId);
      const patient = getPatient(claim.patientId);

      const session = driver.session();
      try {
        await session.executeWrite((tx) =>
          tx.run(
            `MERGE (c:Claim {id: $id})
             SET c.status = $status, c.periodFrom = $periodFrom, c.periodTo = $periodTo,
                 c.templateId = $templateId, c.patientName = $patientName
             RETURN c.id AS id`,
            {
              id: claim.id,
              status: claim.status,
              periodFrom: claim.periodFrom,
              periodTo: claim.periodTo,
              templateId: claim.templateId,
              patientName: patient?.display ?? claim.patientId,
            },
          ),
        );
        claimsCount += 1;

        for (const item of claim.items) {
          const service = services.find((s) => s.id === item.serviceId);
          if (!service) continue;
          const evaluation = evaluateSession(
            service.evidence,
            template.required,
          );

          await session.executeWrite((tx) =>
            tx.run(
              `MATCH (c:Claim {id: $claimId})
               MERGE (s:Session {id: $id})
               SET s.claimId = $claimId, s.sessionId = $sessionId, s.status = $status,
                   s.serviceId = $serviceId, s.providerName = $providerName
               MERGE (c)-[:HAS_SESSION]->(s)
               RETURN s.id AS id`,
              {
                claimId: claim.id,
                id: service.id,
                sessionId: item.sessionId,
                status: evaluation.status,
                serviceId: service.id,
                providerName: getProvider(service.providerId)?.name ?? service.providerId,
              },
            ),
          );
          sessionsCount += 1;

          for (const e of service.evidence) {
            await session.executeWrite((tx) =>
              tx.run(
                `MATCH (s:Session {id: $sessionId})
                 MERGE (e:Evidence {id: $id})
                 SET e.kind = $kind, e.state = $state, e.at = $at, e.citation = $citation
                 MERGE (s)-[:HAS_EVIDENCE]->(e)
                 RETURN e.id AS id`,
                {
                  sessionId: service.id,
                  id: `${service.id}#${e.kind}`,
                  kind: e.kind,
                  state: e.state,
                  at: e.at ?? null,
                  citation: e.citation ?? null,
                },
              ),
            );
            evidenceCount += 1;
          }
        }

        for (const sig of riskSignals.filter((s) => s.claimId === claim.id)) {
          const sessionNodeId = sig.sessionId
            ? services.find(
                (s) => s.claimId === claim.id && s.sessionId === sig.sessionId,
              )?.id
            : undefined;
          if (!sessionNodeId) continue;

          await session.executeWrite((tx) =>
            tx.run(
              `MATCH (s:Session {id: $sessionId})
               MERGE (g:Signal {id: $id})
               SET g.code = $code, g.message = $message, g.severity = $severity,
                   g.claimId = $claimId
               MERGE (s)-[:SIGNAL]->(g)
               RETURN g.id AS id`,
              {
                sessionId: sessionNodeId,
                id: sig.id,
                code: sig.code,
                message: sig.message,
                severity: sig.severity,
                claimId: claim.id,
              },
            ),
          );
          signalsCount += 1;
        }
      } finally {
        await session.close();
      }
    }

    console.log("Seed Neo4j selesai:");
    console.log(`  claims   : ${claimsCount}`);
    console.log(`  sessions : ${sessionsCount}`);
    console.log(`  evidence : ${evidenceCount}`);
    console.log(`  signals  : ${signalsCount}`);
  } finally {
    await driver.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error("Seed gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

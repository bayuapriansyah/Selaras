import {
  auditEntries,
  claimView,
  passportRow,
  passportRows,
  queueRows,
  seedSource,
  servicesToday,
  getService,
} from "@/lib/app/selectors";
import { buildSeedGraph } from "@/lib/app/graph";
import { networkRiskRepositories } from "@/lib/app/repositories/network";
import type { Repositories } from "@/lib/app/repositories/types";

export const syntheticRepositories: Repositories = {
  claims: {
    queue: (statusOverride, src) => queueRows(statusOverride, src),
    view: (claimId, src) => claimView(claimId, src),
  },
  services: {
    today: (src) => servicesToday(src),
    byId: (serviceId, src) => getService(serviceId, src),
  },
  evidence: {
    passportRows: (src) => passportRows(src),
    passportRow: (serviceId, src) => passportRow(serviceId, src),
  },
  reviews: {
    history: (src) => src.reviews,
  },
  audit: {
    entries: (src) => auditEntries(src),
  },
  graphs: {
    graph: (claimId, src) => buildSeedGraph(claimId, src ?? seedSource),
  },
  ...networkRiskRepositories,
};

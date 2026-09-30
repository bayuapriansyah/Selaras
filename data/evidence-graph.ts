export type GraphNode = {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  meta: { key: string; value: string }[];
};

export type GraphEdge = {
  from: string;
  to: string;
  relation: string;
};

export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 56;

export const graphNodes: GraphNode[] = [
  {
    id: "patient",
    label: "Patient",
    type: "Entity",
    x: 40,
    y: 48,
    meta: [
      { key: "identifier", value: "P-1025" },
      { key: "source", value: "Registration" },
      { key: "episode", value: "1" },
    ],
  },
  {
    id: "episode",
    label: "Service Episode",
    type: "Aggregate",
    x: 312,
    y: 48,
    meta: [
      { key: "episode id", value: "EP-1025-08" },
      { key: "service", value: "Physiotherapy" },
      { key: "window", value: "14:03 · 14:41" },
    ],
  },
  {
    id: "provider",
    label: "Provider",
    type: "Entity",
    x: 40,
    y: 176,
    meta: [
      { key: "identifier", value: "T-031" },
      { key: "role", value: "Physiotherapist" },
      { key: "assignment", value: "14:04" },
    ],
  },
  {
    id: "treatment",
    label: "Treatment",
    type: "Event",
    x: 40,
    y: 304,
    meta: [
      { key: "event", value: "Treatment" },
      { key: "occurred at", value: "09:07" },
      { key: "status", value: "Missing on session 09" },
    ],
  },
  {
    id: "note",
    label: "Clinical Note",
    type: "Event",
    x: 40,
    y: 432,
    meta: [
      { key: "event", value: "Clinical note" },
      { key: "occurred at", value: "09:44" },
      { key: "status", value: "Recorded" },
    ],
  },
  {
    id: "passport",
    label: "Service Passport",
    type: "Evidence",
    x: 312,
    y: 304,
    meta: [
      { key: "passport", value: "SRV-1025-08" },
      { key: "coverage", value: "83%" },
      { key: "status", value: "Review" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    type: "Administrative",
    x: 584,
    y: 176,
    meta: [
      { key: "line items", value: "10 sessions" },
      { key: "generated at", value: "09:46" },
      { key: "status", value: "Submitted" },
    ],
  },
  {
    id: "claim",
    label: "Claim",
    type: "Administrative",
    x: 584,
    y: 432,
    meta: [
      { key: "claim", value: "CLM-2026-0417" },
      { key: "sessions", value: "10" },
      { key: "supported", value: "8" },
    ],
  },
];

export const graphEdges: GraphEdge[] = [
  { from: "patient", to: "episode", relation: "HAS_EPISODE" },
  { from: "episode", to: "provider", relation: "HAS_EVENT" },
  { from: "episode", to: "treatment", relation: "HAS_EVENT" },
  { from: "episode", to: "note", relation: "HAS_EVENT" },
  { from: "treatment", to: "passport", relation: "SUPPORTED_BY" },
  { from: "passport", to: "claim", relation: "REFERENCED_BY" },
  { from: "billing", to: "claim", relation: "CLAIMS" },
  { from: "passport", to: "billing", relation: "MAPS_TO" },
];

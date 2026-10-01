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
    label: "Pasien",
    type: "Entitas",
    x: 40,
    y: 48,
    meta: [
      { key: "pengenal", value: "P-1025" },
      { key: "sumber", value: "Pendaftaran" },
      { key: "episode", value: "1" },
    ],
  },
  {
    id: "episode",
    label: "Episode Layanan",
    type: "Agregat",
    x: 312,
    y: 48,
    meta: [
      { key: "id episode", value: "EP-1025-08" },
      { key: "layanan", value: "Fisioterapi" },
      { key: "window", value: "14:03 · 14:41" },
    ],
  },
  {
    id: "provider",
    label: "Provider",
    type: "Entitas",
    x: 40,
    y: 176,
    meta: [
      { key: "pengenal", value: "T-031" },
      { key: "peran", value: "Fisioterapis" },
      { key: "penugasan", value: "14:04" },
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
      { key: "terjadi pada", value: "09:07" },
      { key: "status", value: "Hilang pada sesi 09" },
    ],
  },
  {
    id: "note",
    label: "Catatan klinis",
    type: "Event",
    x: 40,
    y: 432,
    meta: [
      { key: "event", value: "Catatan klinis" },
      { key: "terjadi pada", value: "09:44" },
      { key: "status", value: "Tercatat" },
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
      { key: "cakupan", value: "83%" },
      { key: "status", value: "Tinjauan" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    type: "Administratif",
    x: 584,
    y: 176,
    meta: [
      { key: "rincian", value: "10 sesi" },
      { key: "dibuat pada", value: "09:46" },
      { key: "status", value: "Diajukan" },
    ],
  },
  {
    id: "claim",
    label: "Claim",
    type: "Administratif",
    x: 584,
    y: 432,
    meta: [
      { key: "claim", value: "CLM-2026-0417" },
      { key: "sesi", value: "10" },
      { key: "didukung", value: "8" },
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

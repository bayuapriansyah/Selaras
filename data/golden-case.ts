export type CheckState = "supported" | "gap";

export type GoldenSession = {
  id: number;
  status: "supported" | "review";
  coverage: number;
  checklist: { label: string; state: CheckState }[];
};

const SUPPORTED_CHECKLIST = [
  { label: "Arrival", state: "supported" as const },
  { label: "Provider", state: "supported" as const },
  { label: "Treatment", state: "supported" as const },
  { label: "Clinical Note", state: "supported" as const },
  { label: "Billing", state: "supported" as const },
  { label: "Claim", state: "supported" as const },
];

const baseSessions: GoldenSession[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  status: "supported",
  coverage: 100,
  checklist: SUPPORTED_CHECKLIST,
}));

export const goldenSessions: GoldenSession[] = baseSessions.map((session) => {
  if (session.id === 9) {
    return {
      ...session,
      status: "review",
      coverage: 83,
      checklist: [
        { label: "Arrival", state: "supported" },
        { label: "Provider", state: "supported" },
        { label: "Treatment", state: "gap" },
        { label: "Clinical Note", state: "supported" },
        { label: "Billing", state: "supported" },
        { label: "Claim", state: "supported" },
      ],
    };
  }

  if (session.id === 10) {
    return {
      ...session,
      status: "review",
      coverage: 83,
      checklist: [
        { label: "Arrival", state: "supported" },
        { label: "Provider", state: "supported" },
        { label: "Treatment", state: "supported" },
        { label: "Clinical Note", state: "gap" },
        { label: "Billing", state: "supported" },
        { label: "Claim", state: "supported" },
      ],
    };
  }

  return session;
});

export type ReplayEvent = {
  time: string;
  label: string;
  state: CheckState;
  detail?: string;
};

export const sessionNineReplay: ReplayEvent[] = [
  { time: "09:02", label: "Arrival", state: "supported", detail: "Pasien tiba" },
  {
    time: "09:05",
    label: "Provider",
    state: "supported",
    detail: "Terapis ditugaskan",
  },
  {
    time: "09:07",
    label: "Treatment",
    state: "gap",
    detail: "Event tidak ditemukan",
  },
  {
    time: "09:41",
    label: "Completion",
    state: "gap",
    detail: "Event tidak ditemukan",
  },
  {
    time: "09:44",
    label: "Clinical Note",
    state: "supported",
    detail: "Catatan klinis tercatat",
  },
  {
    time: "09:46",
    label: "Billing",
    state: "supported",
    detail: "Tagihan dibuat",
  },
  {
    time: "09:50",
    label: "Claim",
    state: "supported",
    detail: "Sesi masuk klaim",
  },
];

export type ReasonerBlock = {
  label: string;
  value?: string;
  items?: string[];
  tone?: "default" | "gap";
};

export const reasonerBlocks: ReasonerBlock[] = [
  {
    label: "What changed?",
    value: "Treatment evidence missing",
    tone: "gap",
  },
  {
    label: "When?",
    value: "09:07",
  },
  {
    label: "What supports it?",
    items: ["Patient arrival", "Provider assignment", "Clinical note"],
  },
  {
    label: "What is missing?",
    items: ["Treatment event", "Completion event"],
    tone: "gap",
  },
  {
    label: "Why review?",
    value:
      "Claim contains the service, but the evidence chain is incomplete.",
  },
];

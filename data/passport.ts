export type EvidenceState = "supported" | "gap" | "pending";

export type PassportStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETE"
  | "INCOMPLETE"
  | "REVIEW"
  | "VERIFIED"
  | "SUPPORTED";

export type EvidenceItem = {
  id: string;
  label: string;
  state: EvidenceState;
};

export type PassportData = {
  id: string;
  service: string;
  patient: string;
  provider: string;
  window: string;
  evidence: EvidenceItem[];
  coverage: number;
  status: PassportStatus;
};

export const heroPassport: PassportData = {
  id: "SRV-1025-08",
  service: "Fisioterapi",
  patient: "P-1025",
  provider: "T-031",
  window: "14:03 · 14:41",
  evidence: [
    { id: "identity", label: "Identitas", state: "supported" },
    { id: "provider", label: "Provider", state: "supported" },
    { id: "point", label: "Titik Layanan", state: "supported" },
    { id: "treatment", label: "Treatment", state: "supported" },
    { id: "note", label: "Catatan Klinis", state: "supported" },
    { id: "completion", label: "Penyelesaian", state: "supported" },
  ],
  coverage: 100,
  status: "SUPPORTED",
};

export const passportStates: {
  status: PassportStatus;
  title: string;
  description: string;
}[] = [
  {
    status: "DRAFT",
    title: "Draf",
    description:
      "Passport dibuat saat pelayanan dijadwalkan. Belum ada evidence yang tercatat.",
  },
  {
    status: "ACTIVE",
    title: "Aktif",
    description:
      "Pelayanan sedang berlangsung. Evidence mengalir masuk dari titik layanan.",
  },
  {
    status: "COMPLETE",
    title: "Lengkap",
    description:
      "Seluruh evidence wajib sudah terkumpul dan tercatat pada episode ini.",
  },
  {
    status: "INCOMPLETE",
    title: "Belum Lengkap",
    description:
      "Sebagian evidence belum terbentuk. Episode ditandai untuk diperiksa.",
  },
  {
    status: "REVIEW",
    title: "Tinjauan",
    description:
      "Ada inkonsistensi atau proof gap. Episode masuk antrean pemeriksaan reviewer.",
  },
  {
    status: "VERIFIED",
    title: "Terverifikasi",
    description:
      "Reviewer telah memastikan jejak pelayanan selaras dengan billing dan klaim.",
  },
];

export const passportFacets: {
  label: string;
  value: string;
  note: string;
}[] = [
  {
    label: "Identitas Layanan",
    value: "SRV-1025-08",
    note: "Episode, layanan, pasien, dan penyedia dalam satu identitas.",
  },
  {
    label: "Evidence",
    value: "6 entri",
    note: "Setiap entri membawa status, sumber, dan waktu observasi.",
  },
  {
    label: "Timeline",
    value: "14:03 · 14:41",
    note: "Urutan kejadian pelayanan direkam apa adanya.",
  },
  {
    label: "Coverage",
    value: "100%",
    note: "Porsi expected footprint yang benar-benar terbukti.",
  },
  {
    label: "Provenance",
    value: "Point of care",
    note: "Bukti berasal dari sistem dan aktor yang mencatatnya.",
  },
  {
    label: "Status",
    value: "Didukung",
    note: "Keadaan passport saat ini, selalu bisa ditelusuri.",
  },
];

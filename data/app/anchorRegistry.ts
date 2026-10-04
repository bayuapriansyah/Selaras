import type { Service } from "@/data/app/types";

export type AnchorEntry = {
  /** Kode anchor — dicetak pada QR titik layanan (context witness). */
  code: string;
  facilityId: string;
  servicePoint: string;
};

/**
 * Registry synthetic MVP — data lokal Next.js / localStorage.
 * Bukan backend IoMT: anchor hanya menautkan sesi layanan dengan
 * konteks titik layanan (facility + service point).
 */
export const ANCHOR_REGISTRY: readonly AnchorEntry[] = [
  { code: "PHYSIO-01", facilityId: "FAC-01", servicePoint: "Ruang Fisioterapi 1" },
  { code: "PHYSIO-02", facilityId: "FAC-01", servicePoint: "Ruang Fisioterapi 2" },
  { code: "DENTAL-01", facilityId: "FAC-01", servicePoint: "Poli Gigi 1" },
  { code: "GENERAL-01", facilityId: "FAC-01", servicePoint: "Poli Umum" },
  { code: "RADIOLOGY-01", facilityId: "FAC-01", servicePoint: "Rontgen 1" },
  { code: "LAB-01", facilityId: "FAC-02", servicePoint: "Laboratorium Lantai 1" },
  { code: "PHYSIO-04", facilityId: "FAC-03", servicePoint: "Fisioterapi Ruang Melati" },
  { code: "PHYSIO-05", facilityId: "FAC-03", servicePoint: "Fisioterapi Ruang Anggrek" },
  { code: "PHYSIO-06", facilityId: "FAC-04", servicePoint: "Fisioterapi Bersama" },
  { code: "GENERAL-04", facilityId: "FAC-04", servicePoint: "Poli Umum Bersama" },
  { code: "DENTAL-04", facilityId: "FAC-04", servicePoint: "Poli Gigi Bersama" },
  { code: "PHYSIO-07", facilityId: "FAC-05", servicePoint: "Fisioterapi Cendana" },
  { code: "GENERAL-05", facilityId: "FAC-05", servicePoint: "Poli Umum Cendana" },
  { code: "DENTAL-05", facilityId: "FAC-05", servicePoint: "Poli Gigi Cendana" },
  { code: "LAB-06", facilityId: "FAC-06", servicePoint: "Laboratorium Puspa" },
  { code: "GENERAL-06", facilityId: "FAC-06", servicePoint: "Poli Umum Puspa" },
  { code: "RADIOLOGY-02", facilityId: "FAC-06", servicePoint: "Radiologi Puspa" },
];

export function findAnchor(code: string): AnchorEntry | undefined {
  const normalized = code.trim().toUpperCase();
  return ANCHOR_REGISTRY.find((e) => e.code === normalized);
}

export function anchorsOfFacility(facilityId: string): AnchorEntry[] {
  return ANCHOR_REGISTRY.filter((e) => e.facilityId === facilityId);
}

export function anchorOfService(
  service: Pick<Service, "facilityId" | "servicePoint">,
): AnchorEntry | undefined {
  return ANCHOR_REGISTRY.find(
    (e) =>
      e.facilityId === service.facilityId &&
      e.servicePoint === service.servicePoint,
  );
}

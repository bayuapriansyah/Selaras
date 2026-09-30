import type { DataSource, PassportRow } from "@/lib/app/selectors";
import { seedSource } from "@/lib/app/selectors";
import { repositories } from "@/lib/app/repositories";
import type { Service } from "@/data/app/types";

export function passportRows(src: DataSource = seedSource): PassportRow[] {
  return repositories.evidence.passportRows(src);
}

export function passportRow(
  serviceId: string,
  src: DataSource = seedSource,
): PassportRow | undefined {
  return repositories.evidence.passportRow(serviceId, src);
}

export function servicesToday(src: DataSource = seedSource): Service[] {
  return repositories.services.today(src);
}

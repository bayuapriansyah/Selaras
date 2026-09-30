import type { DataSource } from "@/lib/app/selectors";
import { seedSource } from "@/lib/app/selectors";
import { repositories } from "@/lib/app/repositories";

export function entries(src: DataSource = seedSource) {
  return repositories.audit.entries(src);
}

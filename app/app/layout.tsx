import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: {
    default: "SELARAS — Evidence Intelligence",
    template: "%s · SELARAS",
  },
  description:
    "Sistem internal SELARAS: titik layanan, service passport, dan tinjauan klaim berbasis evidence.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

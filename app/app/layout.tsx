import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: {
    default: "SELARAS — Evidence Intelligence",
    template: "%s · SELARAS",
  },
  description:
    "Sistem internal SELARAS: point of care, service passport, dan review klaim berbasis evidence.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

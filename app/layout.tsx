import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "SELARAS | Bukti Pelayanan Sebelum Klaim",
  description:
    "SELARAS membentuk bukti pelayanan sejak titik layanan dan memastikan jejak pelayanan selaras dengan billing dan klaim.",
  keywords: [
    "healthcare service integrity",
    "claim verification",
    "JKN",
    "service evidence",
    "claim reconciliation",
    "healthcare risk",
    "Indonesia healthcare technology",
  ],
  applicationName: "SELARAS",
  authors: [{ name: "SELARAS" }],
  category: "health technology",
  openGraph: {
    title: "SELARAS | Bukti Pelayanan Sebelum Klaim",
    description:
      "SELARAS membentuk bukti pelayanan sejak titik layanan dan memastikan jejak pelayanan selaras dengan billing dan klaim.",
    locale: "id_ID",
    type: "website",
    siteName: "SELARAS",
  },
  twitter: {
    card: "summary_large_image",
    title: "SELARAS | Bukti Pelayanan Sebelum Klaim",
    description:
      "Evidence intelligence layer untuk integritas pelayanan kesehatan. Setiap pelayanan meninggalkan bukti sebelum menjadi klaim.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Lompat ke konten utama
        </a>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}

import { Logo } from "@/components/layout/Logo";
import { footerLinks } from "@/data/nav";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-900">
      <div className="mx-auto max-w-[88rem] px-5 py-14 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              SELARAS · Sistem Evaluasi Layanan &amp; Rekam Administrasi untuk Integritas Klaim Faskes BPJS Kesehatan.
            </p>
          </div>

          <nav aria-label="Tautan footer" className="flex flex-col gap-3">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="w-fit rounded-md text-sm text-slate-600 font-medium outline-none transition-colors hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] tracking-wider text-slate-500 uppercase font-medium">
            <span className="font-bold tracking-wider text-sky-700">
              Healthkathon BPJS Kesehatan 2026
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-slate-300" />
            <span>Service Integrity Layer Prototype</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-slate-500">
            Data demonstrasi pada prototype ini bersifat sintetis (synthetic illustration) untuk keperluan simulasi arsitektur sistem integritas klaim.
          </p>
        </div>
      </div>
    </footer>
  );
}

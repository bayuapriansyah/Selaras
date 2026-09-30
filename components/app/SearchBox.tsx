"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useApp } from "@/components/app/store";
import { queueRows } from "@/lib/app/selectors";
import { Input } from "@/components/ui/input";

type Result =
  | { type: "claim"; id: string; label: string; sub: string; href: string }
  | { type: "service"; id: string; label: string; sub: string; href: string }
  | { type: "page"; id: string; label: string; sub: string; href: string };

const PAGES: { label: string; sub: string; href: string }[] = [
  { label: "Ringkasan", sub: "Dashboard", href: "/app" },
  { label: "Pelayanan", sub: "Point of care", href: "/app/pelayanan" },
  { label: "Service Passport", sub: "Daftar passport", href: "/app/passport" },
  { label: "Klaim", sub: "Review queue", href: "/app/claims" },
  { label: "Analytics", sub: "Metrik", href: "/app/analytics" },
  { label: "Template Layanan", sub: "Evidence wajib", href: "/app/service-templates" },
  { label: "Log Audit", sub: "Riwayat aktivitas", href: "/app/audit-log" },
  { label: "Pengaturan", sub: "Role & demo", href: "/app/settings" },
];

export function SearchBox() {
  const router = useRouter();
  const { src } = useApp();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results: Result[] = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 1) return [];
    const out: Result[] = [];

    for (const row of queueRows(undefined, src)) {
      const hay = `${row.claim.id} ${row.patient?.display ?? ""} ${row.template.name}`.toLowerCase();
      if (hay.includes(query)) {
        out.push({
          type: "claim",
          id: row.claim.id,
          label: row.claim.id,
          sub: `${row.template.name} · ${row.evaluation.supported}/${row.evaluation.claimed} didukung`,
          href: `/app/claims/${row.claim.id}`,
        });
      }
    }

    for (const s of src.services) {
      const hay = `${s.id} ${s.servicePoint}`.toLowerCase();
      if (hay.includes(query)) {
        out.push({
          type: "service",
          id: s.id,
          label: s.id,
          sub: `${s.servicePoint} · ${s.date}`,
          href:
            s.claimId && s.sessionId
              ? `/app/claims/${s.claimId}`
              : `/app/passport/${s.id}`,
        });
      }
      if (out.length >= 8) break;
    }

    for (const p of PAGES) {
      if (`${p.label} ${p.sub}`.toLowerCase().includes(query)) {
        out.push({ type: "page", id: p.href, ...p });
      }
    }

    return out.slice(0, 8);
  }, [q, src]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
      />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari klaim, layanan…"
        aria-label="Pencarian"
        className="h-9 rounded-full border-slate-200 bg-slate-50 pl-8 focus-visible:border-sky-300 focus-visible:ring-sky-200"
      />
      {open && results.length > 0 ? (
        <div className="absolute top-11 left-0 z-50 w-full min-w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onClick={() => go(r.href)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {r.label}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {r.sub}
                </span>
              </span>
              <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
                {r.type === "claim" ? "klaim" : r.type === "service" ? "layanan" : "halaman"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {open && q.trim().length > 0 && results.length === 0 ? (
        <div className="absolute top-11 left-0 z-50 w-full min-w-72 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 shadow-xl shadow-slate-900/10">
          Tidak ada hasil untuk “{q.trim()}”.
        </div>
      ) : null}
    </div>
  );
}

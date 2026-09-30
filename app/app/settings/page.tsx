"use client";

import * as React from "react";
import {
  Braces,
  Database,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/app/actions";
import {
  can,
  PERMISSIONS,
  PERMISSION_LABEL,
  ROLES,
} from "@/lib/app/permissions";
import type { Role } from "@/data/app/types";

const ROLE_DESC: Record<Role, string> = {
  operator:
    "Mencatat pelayanan di point of care dan menambah evidence wajib.",
  provider:
    "Melengkapi evidence klinis serta merespons permintaan klarifikasi.",
  reviewer:
    "Meninjau klaim, membaca graf & replay, lalu mengambil keputusan.",
  admin: "Akses penuh: role, audit, dan konfigurasi sistem demo.",
};

const ENDPOINTS = [
  { method: "POST", path: "/api/ai/explain", desc: "Ringkasan AI klaim" },
  { method: "GET", path: "/api/graph/[claimId]", desc: "Proyeksi graf (Neo4j / seed)" },
  { method: "GET", path: "/api/claims/[claimId]/impact", desc: "Dampak finansial klaim" },
];

export default function SettingsPage() {
  const { user, role, setRole, state, resetDemo, src } = useApp();
  const [confirming, setConfirming] = React.useState(false);
  const canReset = can(role, "resetDemo");

  const roles: Role[] = ROLES;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Profil, role demo, dan status sistem internal SELARAS."
      />

      <section
        aria-label="Profil"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 items-center justify-center rounded-full bg-sky-600 text-base font-semibold text-white">
              {user.initials}
            </span>
            <div>
              <p className="text-base font-semibold text-slate-900">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full border border-sky-200 bg-sky-50 px-3 font-mono text-[11px] tracking-wider text-sky-700 sm:self-auto">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            {ROLE_LABEL[role]}
          </span>
        </div>
      </section>

      <section
        aria-label="Ganti role"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">Role (demo mock auth)</h2>
        <p className="text-xs text-slate-500">
          Pemilihan role mempengaruhi siapa yang boleh mengambil tindakan reviewer.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {roles.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-sky-400",
                  active
                    ? "border-sky-400 bg-sky-50 ring-1 ring-sky-300"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {ROLE_LABEL[r]}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-wider",
                      active ? "text-sky-600" : "text-slate-400",
                    )}
                  >
                    {active ? "AKTIF" : "pilih"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {ROLE_DESC[r]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Permission matrix"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          Permission matrix · role-based demo
        </h2>
        <p className="text-xs text-slate-500">
          Prototype RBAC (mock auth demo) — bukan production authorization.
          Tabel dibangun langsung dari modul permission yang sama dengan yang
          dipakai UI, sehingga tidak bisa berbeda. Akses lihat halaman terbuka
          untuk semua role.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 font-medium text-slate-600">Aksi</th>
                {roles.map((r) => (
                  <th
                    key={r}
                    className={
                      "px-3 py-2 text-center font-mono text-[10px] tracking-wider uppercase " +
                      (r === role ? "text-sky-700" : "text-slate-500")
                    }
                  >
                    {ROLE_LABEL[r] ?? r}
                    {r === role ? " ·" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-700">
                    {PERMISSION_LABEL[p]}
                  </td>
                  {roles.map((r) => (
                    <td
                      key={r}
                      className={
                        "px-3 py-2 text-center font-semibold " +
                        (can(r, p) ? "text-emerald-600" : "text-slate-300")
                      }
                      title={can(r, p) ? "Diizinkan" : "Tidak diizinkan"}
                    >
                      {can(r, p) ? "✓" : "–"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-3 text-slate-700">
                  Ganti role demo (mock auth)
                </td>
                {roles.map((r) => (
                  <td
                    key={r}
                    className="px-3 py-2 text-center font-semibold text-emerald-600"
                    title="Diizinkan"
                  >
                    ✓
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Data demo"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Data demo</h2>
          <p className="text-xs text-slate-500">
            State tersimpan di browser (localStorage key{" "}
            <span className="font-mono text-[10px]">selaras-app-v1</span>) — tidak ada
            server database untuk aksi UI.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Layanan", src.services.length],
              ["Klaim", new Set(src.services.map((s) => s.claimId).filter(Boolean)).size],
              ["Aksi tinjauan", state.reviews.length],
              ["Entri audit", src.audit.length],
            ].map(([k, v]) => (
              <div
                key={k as string}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center"
              >
                <dt className="text-[10px] tracking-wider text-slate-500 uppercase">
                  {k}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-800">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t border-slate-100 pt-4">
            {!confirming ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={!canReset}
                  title={
                    canReset
                      ? undefined
                      : `Peran ${ROLE_LABEL[role] ?? role} tidak berwenang mereset demo.`
                  }
                  onClick={() => setConfirming(true)}
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  Reset demo
                </Button>
                {!canReset ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Hanya Admin yang dapat reset demo — peran Anda saat ini:{" "}
                    <span className="font-medium text-slate-700">
                      {ROLE_LABEL[role] ?? role}
                    </span>
                    .
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600">
                  Hapus semua perubahan demo?
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setConfirming(false)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    resetDemo();
                    setConfirming(false);
                  }}
                >
                  Ya, reset
                </Button>
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Sistem & API"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Sistem & API</h2>
          <p className="text-xs text-slate-500">
            Layer backend Next.js Route Handlers. Neo4j aktif bila{" "}
            <span className="font-mono text-[10px]">NEO4J_URI</span> diisi, jika tidak
            otomatis memakai proyeksi seed.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {ENDPOINTS.map((e) => (
              <li
                key={e.path}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <span
                  className={
                    "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider " +
                    (e.method === "POST"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-emerald-100 text-emerald-700")
                  }
                >
                  {e.method}
                </span>
                <span className="font-mono text-[11px] text-slate-700">{e.path}</span>
                <span className="ml-auto text-[11px] text-slate-500">{e.desc}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <p className="flex items-center gap-2">
              <Database aria-hidden="true" className="size-3.5 text-slate-400" />
              Graf: mode seed lokal saat env Neo4j kosong (fallback identik).
            </p>
            <p className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-3.5 text-slate-400" />
              Penjelas: aturan deterministik, tanpa model eksternal (demo).
            </p>
            <p className="flex items-center gap-2">
              <KeyRound aria-hidden="true" className="size-3.5 text-slate-400" />
              Seed Neo4j: <span className="font-mono">npm run seed:neo4j</span>
            </p>
            <p className="flex items-center gap-2">
              <Braces aria-hidden="true" className="size-3.5 text-slate-400" />
              Pelayanan baru dibuat dengan ID <span className="font-mono">SVC-085NN-01</span>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

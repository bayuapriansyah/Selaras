import * as React from "react";
import { ArrowRight, Radio } from "lucide-react";
import { cn } from "cn";
import { MESH_FACILITIES, type RiskSignature } from "@/data/app/network";
import { getFacility } from "@/lib/app/selectors";

export function PropagationVisual({
  signature,
  active,
  matchCount,
}: {
  signature: RiskSignature | undefined;
  active: boolean;
  matchCount: number;
}) {
  if (!signature) return null;
  const origin = MESH_FACILITIES[0];
  const originInfo = getFacility(origin.id);
  const peers = MESH_FACILITIES.slice(1);

  return (
    <section
      aria-label="Visualisasi propagasi"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
            Propagasi
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {signature.id} — {signature.name}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider",
            active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500",
          )}
        >
          <Radio aria-hidden="true" className="size-3" />
          {active ? `${matchCount} MATCH AKTIF` : "BELUM AKTIF"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center rounded-xl border p-4 transition-colors duration-700",
            active
              ? "border-emerald-300 bg-emerald-50"
              : "border-amber-300 bg-amber-50",
          )}
        >
          <p className="font-mono text-[10px] tracking-wider text-slate-500">
            FASKES ASAL
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {origin.node} · {originInfo?.name ?? origin.id}
          </p>
          <p className="mt-1 text-xs text-slate-500">{originInfo?.city ?? ""}</p>
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              active ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {active
              ? "Pola tervalidasi, menyebar ke jaringan"
              : "Pola ditemukan, menunggu publikasi"}
          </p>
        </div>

        <div className="flex items-center justify-center lg:flex-col lg:gap-1">
          <span
            aria-hidden="true"
            className={cn(
              "hidden h-px w-full lg:block",
              active ? "bg-emerald-400" : "bg-slate-300",
            )}
          />
          <ArrowRight
            aria-hidden="true"
            className={cn(
              "size-4 motion-safe:animate-pulse lg:rotate-0",
              active ? "text-emerald-500" : "text-slate-400",
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "hidden h-px w-full lg:block",
              active ? "bg-emerald-400" : "bg-slate-300",
            )}
          />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
          {peers.map((f) => {
            const info = getFacility(f.id);
            return (
              <div
                key={f.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors duration-700",
                  active
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md font-mono text-[11px] font-bold",
                      active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {f.node}
                  </span>
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {info?.name ?? f.id}
                  </p>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {info?.city ?? ""}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-[11px] font-medium",
                    active ? "text-emerald-700" : "text-slate-400",
                  )}
                >
                  {active ? "Terlindungi — match aktif" : "Belum terlindungi"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        Simulasi 4 faskes (A–D). Saat signature aktif, faskes lain otomatis
        menerima pola yang sama untuk verifikasi adaptif — tanpa berbagi data
        pasien.
      </p>
    </section>
  );
}

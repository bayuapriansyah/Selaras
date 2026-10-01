import * as React from "react";
import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "cn";
import type { ImmunityView } from "@/lib/app/network";

function FacilityCard({
  node,
  name,
  city,
  state,
  tone,
}: {
  node: string;
  name: string;
  city: string;
  state: string;
  tone: "protected" | "unaware" | "found";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors duration-500",
        tone === "protected" &&
          "border-emerald-300 bg-emerald-50 text-emerald-900",
        tone === "found" && "border-amber-300 bg-amber-50 text-amber-900",
        tone === "unaware" && "border-slate-200 bg-white text-slate-500",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
          tone === "protected" && "bg-emerald-600 text-white",
          tone === "found" && "bg-amber-500 text-white",
          tone === "unaware" && "bg-slate-200 text-slate-500",
        )}
      >
        {node}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{name}</p>
        <p className="truncate text-[11px] opacity-70">{city}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium">
          {tone === "protected" ? (
            <ShieldCheck aria-hidden="true" className="size-3" />
          ) : (
            <ShieldQuestion aria-hidden="true" className="size-3" />
          )}
          {state}
        </p>
      </div>
    </div>
  );
}

export function ImmunityVisual({ view }: { view: ImmunityView }) {
  const inScopeCount = view.facilities.filter((f) => f.inScope).length;
  const live = view.isLive;

  return (
    <section
      aria-label="Network immunity"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
            Network Immunity
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {view.signature.id} — {view.signature.name}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider",
            live
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-sky-200 bg-sky-50 text-sky-700",
          )}
        >
          {live ? "SIGNATURE ACTIVE" : "MENUNGGU PUBLIKASI"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Sebelum publikasi
          </p>
          <div className="flex flex-col gap-2">
            {view.facilities.map((f) => (
              <FacilityCard
                key={f.facilityId}
                node={f.node}
                name={f.name}
                city={f.city}
                state={f.isOrigin ? "Pola ditemukan" : "Belum terlindungi"}
                tone={f.isOrigin ? "found" : "unaware"}
              />
            ))}
          </div>
        </div>
        <div className={cn(!live && "opacity-60")}>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Sesudah publikasi
          </p>
          <div className="flex flex-col gap-2">
            {view.facilities.map((f) => (
              <FacilityCard
                key={f.facilityId}
                node={f.node}
                name={f.name}
                city={f.city}
                state={
                  !live
                    ? "Menunggu publikasi…"
                    : f.inScope
                      ? "Terlindungi"
                      : "Di luar cakupan"
                }
                tone={live && f.inScope ? "protected" : "unaware"}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold tracking-wide text-emerald-800">
        ONE VALIDATED PATTERN → {inScopeCount} FACILITIES PROTECTED
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Cakupan dihitung dari signature aktif di 4 faskes simulasi — tanpa data
        pasien berpindah tangan.
      </p>
    </section>
  );
}

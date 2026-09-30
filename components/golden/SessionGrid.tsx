"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import { goldenSessions } from "@/data/golden-case";
import { cn } from "@/lib/utils";

export function SessionGrid({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
      {goldenSessions.map((session) => {
        const isSelected = session.id === selected;
        const review = session.status === "review";
        const number = String(session.id).padStart(2, "0");

        return (
          <button
            key={session.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`Sesi ${number}, ${
              review ? "perlu ditinjau" : "didukung bukti"
            }`}
            onClick={() => onSelect(session.id)}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-200 outline-none cursor-pointer",
              review
                ? "border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100"
                : "border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100",
              isSelected
                ? "border-sky-600 bg-sky-50 ring-2 ring-sky-500 shadow-md scale-105"
                : "opacity-85 hover:opacity-100",
            )}
          >
            <span className={cn(
              "font-mono text-sm font-bold",
              isSelected ? "text-sky-900" : "text-slate-800"
            )}>
              {number}
            </span>
            {review ? (
              <TriangleAlert aria-hidden="true" className="size-3.5 text-amber-600" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-3.5 text-emerald-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

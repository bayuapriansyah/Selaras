"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Network, Waypoints } from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  graphEdges,
  graphNodes,
} from "@/data/evidence-graph";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const VIEW_W = 800;
const VIEW_H = 520;
const FLAG: Record<string, string> = { treatment: "GAP" };

function centerOf(id: string) {
  const node = graphNodes.find((item) => item.id === id);
  if (!node) return { cx: 0, cy: 0 };
  return { cx: node.x + NODE_WIDTH / 2, cy: node.y + NODE_HEIGHT / 2 };
}

type Mode = "story" | "graph";

export function EvidenceGraph() {
  const [mode, setMode] = useState<Mode>("graph");
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("passport");
  const reduce = useReducedMotion();

  const focusId = active ?? selected;
  const node = graphNodes.find((item) => item.id === selected) ?? null;
  const relatedEdges = graphEdges.filter(
    (edge) => edge.from === focusId || edge.to === focusId,
  );

  const activate = (id: string) => setActive(id);
  const deactivate = () => setActive(null);

  return (
    <section
      id="graph"
      aria-labelledby="graph-title"
      className="border-y border-slate-200/80 bg-[#f8fafc] py-20 lg:py-28 text-slate-900 relative overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-[88rem] px-5 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-slate-400 uppercase">06 / Evidence Graph</span>
          <div className="h-px w-12 bg-slate-200" />
        </div>
        <SectionHeading
          id="graph-title"
          title={
            <>
              Dari peristiwa yang tersebar menuju{" "}
              <span className="text-sky-600">
                satu episode yang terhubung.
              </span>
            </>
          }
          lead="Evidence Graph menyatukan pasien, faskes, peristiwa pelayanan medis, Service Passport, billing, dan klaim dalam satu jaringan bukti deterministik yang dapat diaudit."
          size="md"
        />

        <Reveal className="mt-10" y={22}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm"
              role="group"
              aria-label="Mode tampilan Evidence Graph"
            >
              {(
                [
                  { id: "story", label: "Tampilan Cerita", icon: Waypoints },
                  { id: "graph", label: "Tampilan Graf", icon: Network },
                ] as const
              ).map((item) => {
                const isActive = mode === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setMode(item.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs sm:text-sm outline-none transition-all duration-200 cursor-pointer font-medium",
                      isActive
                        ? "bg-sky-600 text-white font-semibold shadow-sm shadow-sky-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <span className="font-mono text-[10.5px] tracking-wider text-slate-500 uppercase font-medium">
              ✦ Graf Demonstrasi Sintetis
            </span>
          </div>

          {mode === "graph" ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="overflow-x-auto rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <svg
                  viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                  className="h-auto w-full min-w-[46rem]"
                  role="img"
                  aria-label="Graph bukti pelayanan: delapan simpul terhubung melalui relasi bukti"
                >
                  <defs>
                    <filter id="glow-edge" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <g>
                    {graphEdges.map((edge) => {
                      const from = centerOf(edge.from);
                      const to = centerOf(edge.to);
                      const isActive =
                        focusId === edge.from || focusId === edge.to;
                      return (
                        <line
                          key={`${edge.from}-${edge.to}-${edge.relation}`}
                          x1={from.cx}
                          y1={from.cy}
                          x2={to.cx}
                          y2={to.cy}
                          className={cn(
                            "transition-all duration-300",
                            isActive
                              ? "stroke-sky-600"
                              : "stroke-slate-300",
                          )}
                          strokeWidth={isActive ? 2.5 : 1.2}
                          strokeDasharray={isActive ? undefined : "4 6"}
                        />
                      );
                    })}
                  </g>

                  <g>
                    {graphNodes.map((item) => {
                      const isActive = focusId === item.id;
                      const isRelated = relatedEdges.some(
                        (edge) => edge.from === item.id || edge.to === item.id,
                      );
                      const flag = FLAG[item.id];

                      return (
                        <g
                          key={item.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`${item.label}, tipe ${item.type}`}
                          onMouseEnter={() => activate(item.id)}
                          onMouseLeave={deactivate}
                          onFocus={() => activate(item.id)}
                          onBlur={deactivate}
                          onClick={() => setSelected(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelected(item.id);
                            }
                          }}
                          className={cn(
                            "cursor-pointer transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
                            active && !isActive && !isRelated && "opacity-35",
                          )}
                        >
                          <rect
                            x={item.x}
                            y={item.y}
                            width={NODE_WIDTH}
                            height={NODE_HEIGHT}
                            rx={14}
                            className={cn(
                              "transition-all duration-300",
                              isActive
                                ? "fill-sky-50 stroke-sky-600 shadow-sm"
                                : "fill-slate-50 stroke-slate-200 hover:stroke-sky-400 hover:fill-sky-50/40",
                            )}
                            strokeWidth={isActive ? 2 : 1.2}
                          />
                          <text
                            x={item.x + 16}
                            y={item.y + 25}
                            className={cn(
                              "pointer-events-none text-[13px] font-bold",
                              isActive ? "fill-sky-950" : "fill-slate-900",
                            )}
                          >
                            {item.label}
                          </text>
                          <text
                            x={item.x + 16}
                            y={item.y + 42}
                            className={cn(
                              "pointer-events-none font-mono text-[10.5px] tracking-wider uppercase font-semibold",
                              isActive ? "fill-sky-700" : "fill-slate-500",
                            )}
                          >
                            {item.type}
                          </text>
                          {flag ? (
                            <text
                              x={item.x + NODE_WIDTH - 16}
                              y={item.y + 25}
                              textAnchor="end"
                              className="pointer-events-none fill-amber-600 font-mono text-[11px] tracking-wider font-bold"
                            >
                              {flag}
                            </text>
                          ) : null}
                          {isActive ? (
                            <rect
                              x={item.x - 4}
                              y={item.y - 4}
                              width={NODE_WIDTH + 8}
                              height={NODE_HEIGHT + 8}
                              rx={18}
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth={1.5}
                              className="opacity-70 animate-pulse"
                            />
                          ) : null}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              <aside
                className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                aria-live="polite"
              >
                {node ? (
                  <div>
                    <span className="font-mono text-xs font-bold tracking-wider text-emerald-700 uppercase">
                      {node.type}
                    </span>
                    <p className="mt-1.5 text-xl font-bold text-slate-950">
                      {node.label}
                    </p>

                    <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                      {node.meta.map((entry) => (
                        <div
                          key={entry.key}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <dt className="font-mono text-xs text-slate-500 uppercase">
                            {entry.key}
                          </dt>
                          <dd className="text-right text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[12rem]">
                            {entry.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="font-mono text-xs font-bold tracking-wider text-sky-700 uppercase">
                        Koneksi Evidence
                      </p>
                      <ul className="mt-3 flex flex-col gap-2">
                        {relatedEdges.map((edge) => (
                          <li
                            key={`${edge.from}-${edge.to}`}
                            className="flex items-center gap-2 text-xs text-slate-700 rounded-xl border border-slate-200 bg-slate-50/70 p-2"
                          >
                            <span className="font-mono text-[10.5px] font-semibold text-emerald-700 uppercase">
                              {edge.relation}
                            </span>
                            <ArrowRight
                              aria-hidden="true"
                              className="size-3 text-sky-600"
                            />
                            <span className="text-slate-900 font-semibold truncate">
                              {edge.from === node.id
                                ? graphNodes.find((n) => n.id === edge.to)
                                    ?.label
                                : graphNodes.find((n) => n.id === edge.from)
                                    ?.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Pilih salah satu simpul pada graph untuk melihat metadata dan jejak relasinya.
                  </p>
                )}
              </aside>
            </div>
          ) : (
            <ol className="divide-y divide-slate-100 rounded-3xl border border-slate-200/90 bg-white overflow-hidden text-slate-900 shadow-sm">
              {graphNodes.map((item, index) => {
                const outgoing = graphEdges.filter(
                  (edge) => edge.from === item.id,
                );

                return (
                  <motion.li
                    key={item.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.4, ease: EASE, delay: index * 0.04 }}
                    className="grid gap-2 px-5 py-4 sm:grid-cols-[14rem_1fr] sm:gap-5"
                  >
                    <div>
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        {item.label}
                      </p>
                      <p className="font-mono text-xs text-emerald-700 uppercase font-semibold">
                        {item.type}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      {outgoing.length === 0 ? (
                        <span className="text-xs sm:text-sm text-slate-500">
                          Ujung episode: klaim siap diajukan dengan bukti lengkap.
                        </span>
                      ) : (
                        outgoing.map((edge) => (
                          <span
                            key={edge.relation + edge.to}
                            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-slate-800"
                          >
                            <span className="font-mono text-[10px] text-sky-700 uppercase font-semibold">
                              {edge.relation}
                            </span>
                            <ArrowRight aria-hidden="true" className="size-3 text-sky-600" />
                            <span className="text-slate-900 font-semibold">
                              {graphNodes.find((n) => n.id === edge.to)?.label}
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </Reveal>
      </div>
    </section>
  );
}

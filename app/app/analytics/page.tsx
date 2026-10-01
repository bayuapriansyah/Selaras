"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Banknote,
  CircleAlert,
  Gauge,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { MetricCard } from "@/components/app/MetricCard";
import {
  queue as queueRows,
  view as claimView,
} from "@/lib/app/services/claimService";
import { passportRows } from "@/lib/app/services/passportService";
import { getFacility } from "@/lib/app/selectors";
import { FOCUS_MODUS } from "@/lib/app/signals";
import { impactOf } from "@/lib/app/rules";
import { formatDate } from "@/lib/app/format";

const C = {
  sky: "#0284c7",
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#64748b",
};

const STATUS_COLOR: Record<string, string> = {
  SUPPORTED: C.emerald,
  "NEEDS REVIEW": C.amber,
  INCOMPLETE: C.slate,
  CONTRADICTED: C.red,
  "NEEDS CLARIFICATION": C.sky,
};

const STATUS_TEXT: Record<string, string> = {
  SUPPORTED: "Didukung",
  "NEEDS REVIEW": "Perlu\ntinjauan",
  INCOMPLETE: "Belum\nlengkap",
  CONTRADICTED: "Bertentangan",
  "NEEDS CLARIFICATION": "Perlu\nklarifikasi",
};

const PASSPORT_TEXT: Record<string, string> = {
  DRAFT: "Draf",
  ACTIVE: "Aktif",
  COMPLETE: "Lengkap",
};

const axisStyle = { fontSize: 11, fill: "#64748b" };

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const { src, state } = useApp();

  const data = React.useMemo(() => {
    const rows = queueRows(state.statusOverrides, src);
    const passports = passportRows(src);

    const statuses = [
      "SUPPORTED",
      "NEEDS REVIEW",
      "INCOMPLETE",
      "CONTRADICTED",
      "NEEDS CLARIFICATION",
    ];
    const statusData = statuses.map((s) => ({
      name: STATUS_TEXT[s] ?? s,
      full: s,
      count: rows.filter((r) => r.status === s).length,
      fill: STATUS_COLOR[s],
    }));

    const coverageData = rows
      .map((r) => ({
        name: r.claim.id.replace("CLM-", ""),
        coverage: r.evaluation.claimed
          ? Math.round(
              (r.evaluation.supported / r.evaluation.claimed) * 100,
            )
          : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const dailyMap = new Map<string, number>();
    for (const s of src.services) {
      dailyMap.set(s.date, (dailyMap.get(s.date) ?? 0) + 1);
    }
    const daily = [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({
        name: date.slice(8) + "/" + date.slice(5, 7),
        count,
      }));

    const passportData = ["DRAFT", "ACTIVE", "COMPLETE"].map((p) => ({
      name: PASSPORT_TEXT[p],
      value: passports.filter((r) => r.passport.status === p).length,
      fill: p === "COMPLETE" ? C.emerald : p === "ACTIVE" ? C.sky : C.slate,
    }));

    let sumRate = 0;
    let sumClaimed = 0;
    let sumSupported = 0;
    let sumReviewAmount = 0;
    for (const r of rows) {
      const imp = impactOf(
        r.template.rate,
        r.evaluation.claimed,
        r.evaluation.supported,
      );
      sumRate += imp.currentAmount;
      sumClaimed += imp.currentSessions;
      sumSupported += imp.supportedSessions;
      sumReviewAmount += imp.reviewAmount;
    }
    const avgCoverage = rows.length
      ? Math.round(
          rows.reduce(
            (a, r) =>
              a +
              (r.evaluation.claimed
                ? (r.evaluation.supported / r.evaluation.claimed) * 100
                : 0),
            0,
          ) / rows.length,
        )
      : 0;

    const views = rows
      .map((r) => claimView(r.claim.id, src))
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
    const allSignals = views.flatMap((v) => v.signals);
    const weightedRisk = Math.round(
      rows.reduce(
        (sum, r) =>
          sum + (r.template.rate * r.evaluation.claimed * r.score.score) / 100,
        0,
      ),
    );
    const highRiskClaims = rows.filter((r) => r.score.band === "TINGGI").length;
    const avgScore = rows.length
      ? Math.round(
          rows.reduce((a, r) => a + r.score.score, 0) / rows.length,
        )
      : 0;
    const bandData = (["RENDAH", "SEDANG", "TINGGI"] as const).map((b) => ({
      band: b,
      count: rows.filter((r) => r.score.band === b).length,
    }));

    const facilityOf = new Map(
      rows.map((r) => [r.claim.id, r.claim.facilityId] as const),
    );
    const outlierByFacility: Record<string, number> = {};
    for (const s of allSignals) {
      if (s.code !== "PEER_OUTLIER") continue;
      const fid = facilityOf.get(s.claimId);
      if (fid) outlierByFacility[fid] = (outlierByFacility[fid] ?? 0) + 1;
    }
    const grouped = new Map<
      string,
      { claims: number; scores: number[]; max: number; weighted: number }
    >();
    for (const r of rows) {
      const g = grouped.get(r.claim.facilityId) ?? {
        claims: 0,
        scores: [],
        max: 0,
        weighted: 0,
      };
      g.claims += 1;
      g.scores.push(r.score.score);
      g.max = Math.max(g.max, r.score.score);
      g.weighted +=
        (r.template.rate * r.evaluation.claimed * r.score.score) / 100;
      grouped.set(r.claim.facilityId, g);
    }
    const facilityRows = [...grouped.entries()]
      .map(([id, g]) => {
        const meta = getFacility(id);
        return {
          id,
          name: meta?.name ?? id,
          meta: `${meta?.kind ?? ""} · ${meta?.city ?? ""}`,
          claims: g.claims,
          avg: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
          max: g.max,
          outliers: outlierByFacility[id] ?? 0,
          weighted: Math.round(g.weighted),
        };
      })
      .sort((a, b) => b.avg - a.avg || b.max - a.max);

    const modusData = Object.values(FOCUS_MODUS).map((m) => ({
      ...m,
      count: allSignals.filter((s) =>
        (s.modus ?? []).some((x) => x.no === m.no),
      ).length,
    }));
    const modusMax = Math.max(1, ...modusData.map((m) => m.count));

    return {
      rows,
      statusData,
      coverageData,
      daily,
      passportData,
      totalValue: sumRate,
      totalClaimed: sumClaimed,
      totalSupported: sumSupported,
      reviewAmount: sumReviewAmount,
      avgCoverage,
      weightedRisk,
      highRiskClaims,
      totalSignals: allSignals.length,
      avgScore,
      bandData,
      facilityRows,
      modusData,
      modusMax,
    };
  }, [src, state.statusOverrides]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analitik"
            description="Metrik operasional evidence: status klaim, cakupan passport, dan distribusi pelayanan. Simulasi berbasis data sintetis."
        actions={
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] tracking-wider text-slate-600">
            {data.rows.length} klaim · {src.services.length} layanan
          </span>
        }
      />

      <section aria-label="KPI" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Nilai diajukan"
          value={`Rp ${data.totalValue.toLocaleString("id-ID")}`}
          hint={`${data.totalClaimed} sesi diklaim`}
          icon={Layers}
          tone="sky"
        />
        <MetricCard
          label="Cakupan rata-rata"
          value={`${data.avgCoverage}%`}
          hint={`${data.totalSupported} sesi didukung`}
          icon={Gauge}
          tone="emerald"
        />
        <MetricCard
          label="Antrean tinjauan"
          value={`Rp ${data.reviewAmount.toLocaleString("id-ID")}`}
          hint="nilai belum didukung evidence"
          icon={CircleAlert}
          tone={data.reviewAmount > 0 ? "amber" : "default"}
        />
        <MetricCard
          label="Pelayanan tercatat"
          value={src.services.length}
          hint={`per ${formatDate("2026-09-30")}`}
          icon={Activity}
          tone="slate"
        />
      </section>

      <section aria-label="KPI risiko" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Risiko finansial tertimbang"
          value={`Rp ${data.weightedRisk.toLocaleString("id-ID")}`}
          hint="nilai klaim × skor risiko"
          icon={Banknote}
          tone="amber"
        />
        <MetricCard
          label="Klaim berisiko tinggi"
          value={data.highRiskClaims}
          hint="skor ≥ 65 — klaim ditahan"
          icon={ShieldAlert}
          tone="slate"
        />
        <MetricCard
          label="Sinyal terdeteksi"
          value={data.totalSignals}
          hint={`rata-rata skor portofolio ${data.avgScore}`}
          icon={Activity}
          tone="sky"
        />
        <MetricCard
          label="Klaim berisiko sedang"
          value={data.rows.filter((r) => r.score.band === "SEDANG").length}
          hint={`rendah ${data.rows.filter((r) => r.score.band === "RENDAH").length} klaim`}
          icon={CircleAlert}
          tone="emerald"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Leaderboard risiko fasilitas"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Leaderboard risiko fasilitas
              </h2>
              <p className="text-xs text-slate-500">
                Rata-rata skor per fasilitas · PEER_OUTLIER sebagai konteks, bukan
                penanda modus.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.bandData.map((b) => (
                <span
                  key={b.band}
                  className={
                    "inline-flex h-6 items-center gap-1 rounded-full border px-2 font-mono text-[10px] font-semibold tracking-wider " +
                    (b.band === "TINGGI"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : b.band === "SEDANG"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700")
                  }
                >
                  {b.count} {b.band}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Fasilitas
                  </th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Klaim
                  </th>
                  <th className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Skor rata-rata
                  </th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Tertinggi
                  </th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Outlier
                  </th>
                  <th className="py-2 pl-2 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Rp tertimbang
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.facilityRows.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="py-2.5 pr-3">
                      <p className="text-sm font-medium text-slate-800">
                        {f.name}
                      </p>
                      <p className="text-[11px] text-slate-500">{f.meta}</p>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600">
                      {f.claims}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className={
                              "block h-full rounded-full " +
                              (f.avg >= 65
                                ? "bg-red-500"
                                : f.avg >= 35
                                  ? "bg-amber-500"
                                  : "bg-emerald-500")
                            }
                            style={{ width: `${f.avg}%` }}
                          />
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
                          {f.avg}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600">
                      {f.max}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {f.outliers > 0 ? (
                        <span className="inline-flex h-5 items-center rounded-full border border-amber-200 bg-amber-50 px-2 font-mono text-[10px] font-semibold text-amber-700">
                          {f.outliers} peer
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono text-xs tabular-nums text-slate-700">
                      Rp {f.weighted.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-label="Subkategori fokus"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Sinyal per subkategori fokus
          </h2>
          <p className="text-xs text-slate-500">
            Lima subkategori fraud kategori Fasilitas Kesehatan — dihitung dari
            chip modus pada seluruh sinyal.
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {data.modusData.map((m) => (
              <li
                key={m.no}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
              >
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-300/70 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  <span className="font-mono font-semibold">#{m.no}</span>
                  {m.label}
                </span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className="block h-full rounded-full bg-sky-600"
                    style={{ width: `${Math.round((m.count / data.modusMax) * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-slate-700">
                  {m.count}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Sinyal di luar lima fokus (konflik timestamp, outlier peer) tetap
            terdeteksi sebagai konteks integritas, tanpa chip subkategori.
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Status klaim"
          subtitle="Distribusi status antrean tinjauan saat ini."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.statusData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={axisStyle} interval={0} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
                formatter={(v, _n, item) => [
                  `${Number(v)} klaim`,
                  String((item?.payload as { name?: string })?.name ?? ""),
                ]}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {data.statusData.map((d) => (
                  <Cell key={d.full} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Cakupan evidence per klaim"
          subtitle="Persentase sesi yang didukung evidence."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.coverageData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={axisStyle} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisStyle}
                tickLine={false}
                width={52}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v)}%`, "Cakupan"]}
                labelFormatter={(l) => `CLM-${l}`}
              />
              <Bar dataKey="coverage" fill={C.sky} radius={[0, 8, 8, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Pelayanan per hari"
          subtitle="14 hari terakhir (jumlah episode pelayanan)."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.sky} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.sky} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={axisStyle} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v)} layanan`, "Pelayanan"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={C.sky}
                strokeWidth={2}
                fill="url(#gradSky)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Distribusi Service Passport"
          subtitle="Status paspor bukti seluruh layanan."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.passportData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.passportData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
                formatter={(v, n) => [`${Number(v)} passport`, String(n ?? "")]}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

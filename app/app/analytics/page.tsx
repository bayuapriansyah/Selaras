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
  CircleAlert,
  Gauge,
  Layers,
} from "lucide-react";
import { useApp } from "@/components/app/store";
import { PageHeader } from "@/components/app/PageHeader";
import { MetricCard } from "@/components/app/MetricCard";
import { queue as queueRows } from "@/lib/app/services/claimService";
import { passportRows } from "@/lib/app/services/passportService";
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
      name: s.replace("NEEDS ", "NEEDS\n"),
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
      name: p,
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
    };
  }, [src, state.statusOverrides]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Metrik operasional evidence: status klaim, cakupan passport, dan distribusi pelayanan."
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

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Status klaim"
          subtitle="Distribusi status review queue saat ini."
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
                  (item?.payload as { full?: string })?.full ?? "",
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

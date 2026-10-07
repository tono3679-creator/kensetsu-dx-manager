"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatMonth, formatMonthShort, formatPercent, formatYen } from "@/lib/format";
import { calcProfitRate } from "@/lib/money";

import { AXIS_TICK, GRID_STROKE, LegendItem, SERIES, TooltipCard, TooltipRow, axisYen } from "./chart-utils";
import type { MonthlyPoint } from "./monthly-revenue-chart";

const KEYS = [
  { key: "revenue", label: "売上", color: SERIES[1] },
  { key: "cost", label: "原価", color: SERIES[2] },
  { key: "profit", label: "粗利益", color: SERIES[3] },
] as const;

function FinanceTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MonthlyPoint;
  return (
    <TooltipCard title={formatMonth(point.month)}>
      {KEYS.map((k) => (
        <TooltipRow key={k.key} color={k.color} label={k.label} value={formatYen(point[k.key])} />
      ))}
      <TooltipRow label="粗利率" value={formatPercent(calcProfitRate(point.revenue, point.cost))} />
    </TooltipCard>
  );
}

/** 月別 売上・原価・粗利益（同一の金額軸で比較） */
export function FinanceComparisonChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4" aria-hidden>
        {KEYS.map((k) => (
          <LegendItem key={k.key} color={k.color} label={k.label} />
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="month" tickFormatter={formatMonthShort} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={4} />
            <YAxis tickFormatter={axisYen} tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} />
            <ReferenceLine y={0} stroke="oklch(0.8 0.01 255)" />
            <Tooltip content={<FinanceTooltip />} cursor={{ fill: "oklch(0.95 0.01 255 / 0.6)" }} />
            {KEYS.map((k) => (
              <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

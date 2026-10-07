"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatMonth, formatMonthShort, formatYen, formatYenCompact } from "@/lib/format";

import { AXIS_TICK, GRID_STROKE, SERIES, TooltipCard, TooltipRow, axisYen } from "./chart-utils";

export interface MonthlyPoint {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  projectCount: number;
}

function RevenueTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MonthlyPoint;
  return (
    <TooltipCard title={formatMonth(point.month)}>
      <TooltipRow color={SERIES[1]} label="売上" value={formatYen(point.revenue)} />
      <TooltipRow label="完工案件" value={`${point.projectCount}件`} />
    </TooltipCard>
  );
}

/** 月別売上推移（直近12ヶ月・完工基準） */
export function MonthlyRevenueChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue));
  const labeled = data.map((d, i) => ({
    ...d,
    // 最大の月と当月だけ値を表示（すべてに数値を付けない）
    label: d.revenue > 0 && (d.revenue === max || i === data.length - 1) ? formatYenCompact(d.revenue) : "",
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={labeled} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="month" tickFormatter={formatMonthShort} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={4} />
          <YAxis tickFormatter={axisYen} tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<RevenueTooltip />} cursor={{ fill: "oklch(0.95 0.01 255 / 0.6)" }} />
          <Bar dataKey="revenue" name="売上" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            <LabelList dataKey="label" position="top" style={{ fill: "oklch(0.35 0.02 264)", fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

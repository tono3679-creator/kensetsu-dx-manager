"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts";

import { CONSTRUCTION_TYPE_LABELS } from "@/lib/constants";
import { formatPercent, formatYen, formatYenCompact } from "@/lib/format";
import type { ConstructionType } from "@/types/domain";

import { SERIES, TooltipCard, TooltipRow } from "./chart-utils";

export interface TypeSlice {
  constructionType: ConstructionType;
  revenue: number;
  projectCount: number;
}

/** 工種ごとの色は固定（並び順が変わっても同じ工種は同じ色） */
const TYPE_COLORS: Record<ConstructionType, string> = {
  electrical: SERIES[1],
  hvac: SERIES[2],
  plumbing: SERIES[3],
  renovation: SERIES[4],
  painting: SERIES[5],
  roofing: SERIES[6],
  other: SERIES[7],
};

function SliceTooltip({ active, payload, total }: Partial<TooltipContentProps<number, string>> & { total: number }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as TypeSlice;
  return (
    <TooltipCard title={CONSTRUCTION_TYPE_LABELS[slice.constructionType]}>
      <TooltipRow color={TYPE_COLORS[slice.constructionType]} label="売上" value={formatYen(slice.revenue)} />
      <TooltipRow label="構成比" value={formatPercent((slice.revenue / total) * 100)} />
      <TooltipRow label="案件数" value={`${slice.projectCount}件`} />
    </TooltipCard>
  );
}

/** 工事種別別売上（ドーナツ + 値付き凡例） */
export function TypeDonutChart({ data }: { data: TypeSlice[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="constructionType"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={0}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.constructionType} fill={TYPE_COLORS[d.constructionType]} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">合計</span>
          <span className="text-sm font-bold">{formatYenCompact(total)}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.constructionType} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: TYPE_COLORS[d.constructionType] }} />
            <span className="flex-1 truncate">{CONSTRUCTION_TYPE_LABELS[d.constructionType]}</span>
            <span className="num w-14 text-right text-muted-foreground">{formatPercent(total ? (d.revenue / total) * 100 : 0)}</span>
            <span className="num w-24 text-right font-medium">{formatYenCompact(d.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { TrendingDownIcon } from "lucide-react";
import Link from "next/link";

import { ProfitRate, Yen, profitRateLevel } from "@/components/common/money";
import { PROFIT_RATE_THRESHOLDS } from "@/lib/constants";
import { formatPercent, formatYenCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectMargin, RepRanking } from "@/server/queries/dashboard";

/** 担当者別売上ランキング（直近12ヶ月） */
export function RepRankingList({ rows }: { rows: RepRanking[] }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">データがありません</p>;
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.employeeId} className="grid grid-cols-[1.75rem_1fr] items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "num row-span-3 flex size-7 items-center justify-center rounded-full text-xs font-bold",
              i === 0 ? "bg-amber-100 text-amber-800" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{r.name}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="text-xs text-muted-foreground">{r.projectCount}件</span>
              <Yen value={r.revenue} className="font-semibold" />
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(r.revenue / max) * 100}%`, background: "var(--chart-1)" }} />
          </div>
          <p className="text-xs text-muted-foreground">
            粗利 {formatYenCompact(r.profit)} ・ 粗利率 <span className="num">{formatPercent(r.profitRate)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * 案件別利益率（低い順）。0% を基準線に、赤字は左・利益は右へ伸びる横棒。
 * 赤字・低利益は色に加えてアイコンとラベルで示す。
 */
export function ProjectMarginBars({ rows, limit = 8 }: { rows: ProjectMargin[]; limit?: number }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">完工案件がありません</p>;
  const shown = rows.slice(0, limit);
  const min = Math.min(-10, ...shown.map((r) => r.profitRate));
  const max = Math.max(40, ...shown.map((r) => r.profitRate));
  const span = max - min;
  const zero = ((0 - min) / span) * 100;
  const lossCount = rows.filter((r) => r.profitRate < 0).length;
  const lowCount = rows.filter((r) => r.profitRate >= 0 && r.profitRate < PROFIT_RATE_THRESHOLDS.low).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        直近12ヶ月の完工 {rows.length}件中 ・ 赤字 <span className="num font-semibold text-red-600">{lossCount}件</span> ・ 利益率{PROFIT_RATE_THRESHOLDS.low}%未満{" "}
        <span className="num font-semibold text-amber-700">{lowCount}件</span>
      </p>
      <ul className="space-y-2.5">
        {shown.map((r) => {
          const level = profitRateLevel(r.profitRate);
          const left = r.profitRate < 0 ? ((r.profitRate - min) / span) * 100 : zero;
          const width = (Math.abs(r.profitRate) / span) * 100;
          const color = level === "loss" ? "var(--status-critical)" : level === "low" ? "var(--status-warning)" : "var(--chart-1)";
          return (
            <li key={r.id}>
              <Link href={`/projects/${r.id}?tab=materials`} className="group block space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1 truncate group-hover:text-primary">
                    {level === "loss" ? <TrendingDownIcon className="size-3.5 shrink-0 text-red-600" aria-label="赤字" /> : null}
                    <span className="truncate">{r.name}</span>
                  </span>
                  <ProfitRate rate={r.profitRate} className="shrink-0" />
                </div>
                <div className="relative h-2 rounded-full bg-muted" aria-hidden>
                  <span className="absolute inset-y-[-3px] w-px bg-foreground/30" style={{ left: `${zero}%` }} />
                  <span
                    className={cn("absolute inset-y-0", r.profitRate < 0 ? "rounded-l-full" : "rounded-r-full")}
                    style={{ left: `${left}%`, width: `${width}%`, background: color }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

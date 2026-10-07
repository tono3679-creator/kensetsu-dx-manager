import { TrendingDownIcon } from "lucide-react";

import { PROFIT_RATE_THRESHOLDS } from "@/lib/constants";
import { formatPercent, formatYen } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 金額表示（3桁カンマ + 円）。負の値は赤字として赤で表示 */
export function Yen({
  value,
  className,
  signed,
  colorize = true,
}: {
  value: number | null | undefined;
  className?: string;
  signed?: boolean;
  colorize?: boolean;
}) {
  const negative = colorize && typeof value === "number" && value < 0;
  return (
    <span className={cn("num whitespace-nowrap", negative && "text-red-600", className)}>
      {formatYen(value, { signed })}
    </span>
  );
}

/** 利益率の評価（色だけに頼らずアイコン・文言も添える） */
export function profitRateLevel(rate: number | null | undefined): "none" | "loss" | "low" | "normal" | "good" {
  if (rate === null || rate === undefined) return "none";
  if (rate < 0) return "loss";
  if (rate < PROFIT_RATE_THRESHOLDS.low) return "low";
  if (rate < PROFIT_RATE_THRESHOLDS.good) return "normal";
  return "good";
}

const RATE_CLASSES = {
  none: "text-muted-foreground",
  loss: "bg-red-50 text-red-700 ring-red-600/20",
  low: "bg-amber-50 text-amber-800 ring-amber-600/25",
  normal: "bg-slate-50 text-slate-700 ring-slate-500/15",
  good: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
} as const;

export function ProfitRate({ rate, className }: { rate: number | null | undefined; className?: string }) {
  const level = profitRateLevel(rate);
  if (level === "none") return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <span
      className={cn(
        "num inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        RATE_CLASSES[level],
        className,
      )}
      title={level === "loss" ? "赤字" : level === "low" ? "低利益" : undefined}
    >
      {level === "loss" ? <TrendingDownIcon className="size-3.5" aria-label="赤字" /> : null}
      {formatPercent(rate)}
    </span>
  );
}

import { AlertTriangleIcon, CheckCircle2Icon, OctagonAlertIcon } from "lucide-react";

import { formatPercent, formatYen } from "@/lib/format";
import { calcBudgetUsageRate } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BudgetLevel = "ok" | "warning" | "over";

export function budgetLevel(usageRate: number | null, alertPercent: number): BudgetLevel {
  if (usageRate === null) return "ok";
  if (usageRate > 100) return "over";
  if (usageRate >= alertPercent) return "warning";
  return "ok";
}

const LEVEL_STYLES: Record<BudgetLevel, { bar: string; text: string; label: string }> = {
  ok: { bar: "bg-primary", text: "text-emerald-700", label: "予算内" },
  warning: { bar: "bg-status-warning", text: "text-amber-700", label: "要注意" },
  over: { bar: "bg-status-critical", text: "text-red-700", label: "予算超過" },
};

const LEVEL_ICONS = { ok: CheckCircle2Icon, warning: AlertTriangleIcon, over: OctagonAlertIcon };

/**
 * 予算原価 vs 実績原価のメーター。
 * 100% と警告ライン（既定 90%）に目盛りを表示し、超過時は赤＋アイコン＋文言で示す。
 */
export function BudgetMeter({
  budget,
  actual,
  alertPercent = 90,
  compact = false,
  className,
}: {
  budget: number | null;
  actual: number;
  alertPercent?: number;
  compact?: boolean;
  className?: string;
}) {
  const rate = calcBudgetUsageRate(budget, actual);
  const level = budgetLevel(rate, alertPercent);
  const style = LEVEL_STYLES[level];
  const Icon = LEVEL_ICONS[level];
  // 表示上の最大は 120%
  const scale = 120;
  const width = rate === null ? 0 : Math.min(rate, scale) / scale;

  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact ? (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className={cn("inline-flex items-center gap-1 font-medium", style.text)}>
            <Icon className="size-4" aria-hidden />
            {style.label}
          </span>
          <span className="num text-muted-foreground">
            予算消化率 <span className="font-semibold text-foreground">{formatPercent(rate)}</span>
          </span>
        </div>
      ) : null}
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={rate ?? 0}
        aria-label={`予算消化率 ${formatPercent(rate)}`}
      >
        <div className={cn("h-full rounded-full transition-all", style.bar)} style={{ width: `${width * 100}%` }} />
        <span aria-hidden className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${(100 / scale) * 100}%` }} />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/20"
          style={{ left: `${(alertPercent / scale) * 100}%` }}
        />
      </div>
      {!compact ? (
        <div className="num flex justify-between text-xs text-muted-foreground">
          <span>実績 {formatYen(actual)}</span>
          <span>予算 {formatYen(budget)}</span>
        </div>
      ) : null}
    </div>
  );
}

import { CircleDollarSignIcon, PercentIcon, PiggyBankIcon, ReceiptJapaneseYenIcon, WalletIcon } from "lucide-react";

import { BudgetMeter, budgetLevel } from "@/components/common/budget-meter";
import { KpiCard } from "@/components/common/kpi-card";
import { ProfitRate, Yen, profitRateLevel } from "@/components/common/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHours, formatPercent, formatYen } from "@/lib/format";
import { profitView } from "@/lib/project-finance";
import { cn } from "@/lib/utils";
import type { ProjectDetail } from "@/server/queries/projects";

const CATEGORIES = [
  { key: "laborCost", label: "労務費", color: "var(--chart-1)", note: "勤怠 × 時間原価" },
  { key: "materialCost", label: "材料費", color: "var(--chart-2)", note: "数量 × 単価" },
  { key: "outsourcingCost", label: "外注費", color: "var(--chart-3)", note: "協力会社への支払" },
  { key: "expenseCost", label: "その他経費", color: "var(--chart-4)", note: "駐車場・燃料・処分費など" },
] as const;

/** 管理者向け: 案件の収支サマリーと予算原価 vs 実績原価 */
export function ProjectCostPanel({ project, alertPercent }: { project: ProjectDetail; alertPercent: number }) {
  const total = project.totalCost ?? 0;
  const hasContract = project.contractAmount !== null;
  const level = budgetLevel(project.budgetUsageRate, alertPercent);
  const view = profitView(project);
  const rateLevel = profitRateLevel(view?.rate ?? null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="受注金額" icon={ReceiptJapaneseYenIcon} value={<Yen value={project.contractAmount ?? project.estimateAmount} />} sub={hasContract ? "売上（税抜）" : "見積金額"} />
        <KpiCard label="予算原価" icon={WalletIcon} value={<Yen value={project.budgetCost} />} sub={`警告ライン ${alertPercent}%`} />
        <KpiCard
          label="実績原価"
          icon={CircleDollarSignIcon}
          emphasis={level === "over" ? "danger" : level === "warning" ? "warning" : "default"}
          value={<Yen value={total} />}
          sub={
            <span className={cn(level === "over" && "font-semibold text-red-600", level === "warning" && "font-semibold text-amber-700")}>
              予算比 {formatPercent(project.budgetUsageRate)}
            </span>
          }
        />
        <KpiCard
          label={view?.forecast ? "粗利益（見込）" : "粗利益"}
          icon={PiggyBankIcon}
          emphasis={(view?.profit ?? 0) < 0 ? "danger" : "default"}
          value={<Yen value={view?.profit ?? null} />}
          sub={view?.forecast ? `現時点 ${formatYen(project.grossProfit)}（実績原価ベース）` : "受注金額 − 実績原価"}
        />
        <KpiCard
          label={view?.forecast ? "利益率（見込）" : "利益率"}
          icon={PercentIcon}
          emphasis={rateLevel === "loss" ? "danger" : rateLevel === "low" ? "warning" : "default"}
          value={
            <span className={cn(rateLevel === "loss" && "text-red-600", rateLevel === "low" && "text-amber-700")}>
              {formatPercent(view?.rate ?? null)}
            </span>
          }
          sub={
            rateLevel === "loss"
              ? "赤字"
              : rateLevel === "low"
                ? "低利益（10%未満）"
                : view?.forecast
                  ? "見込原価 = 予算と実績の大きい方"
                  : "粗利益 ÷ 受注金額"
          }
          className="col-span-2 md:col-span-1"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>予算原価 vs 実績原価</CardTitle>
          <CardDescription>
            労務費は勤怠データ（実働 {formatHours(project.laborMinutes)}）から自動計上されます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <BudgetMeter budget={project.budgetCost} actual={total} alertPercent={alertPercent} />

          <div className="space-y-3">
            <p className="text-sm font-medium">原価の内訳</p>
            {total > 0 ? (
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="原価内訳の構成比">
                {CATEGORIES.map((c) => {
                  const value = project[c.key] ?? 0;
                  if (value <= 0) return null;
                  return (
                    <span
                      key={c.key}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(value / total) * 100}%`, background: c.color }}
                      title={`${c.label} ${formatYen(value)}`}
                    />
                  );
                })}
              </div>
            ) : null}
            <ul className="grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const value = project[c.key] ?? 0;
                return (
                  <li key={c.key} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.note}</p>
                    </div>
                    <div className="text-right">
                      <Yen value={value} className="text-sm font-semibold" />
                      <p className="num text-xs text-muted-foreground">{total > 0 ? formatPercent((value / total) * 100) : "—"}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {hasContract && view ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                受注 <Yen value={project.contractAmount} className="font-medium text-foreground" /> − {view.forecast ? "見込原価" : "原価"}{" "}
                <Yen value={view.cost} className="font-medium text-foreground" /> =
              </span>
              <span className="flex items-center gap-2">
                <Yen value={view.profit} className="text-base font-bold" />
                <ProfitRate rate={view.rate} />
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

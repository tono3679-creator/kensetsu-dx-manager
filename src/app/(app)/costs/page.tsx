import { HammerIcon, PackageIcon, PlusIcon, ReceiptIcon, ReceiptTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProjectStatusBadge } from "@/components/common/badges";
import { BudgetMeter, budgetLevel } from "@/components/common/budget-meter";
import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { ProfitRate, Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { CostEntryList } from "@/components/costs/cost-entry-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COST_TYPE_LABELS } from "@/lib/constants";
import { formatPercent, formatYenCompact } from "@/lib/format";
import { calcBudgetUsageRate } from "@/lib/money";
import { profitView } from "@/lib/project-finance";
import { enumParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { withUser } from "@/server/auth/session";
import { getSettings } from "@/server/queries/common";
import { listCostEntries, listProjectCostSummaries } from "@/server/queries/costs";
import { COST_TYPES } from "@/types/domain";

export const metadata: Metadata = { title: "原価管理" };

const QUICK_ACTIONS = [
  { type: "material", icon: PackageIcon, text: "数量 × 単価で自動計算" },
  { type: "outsourcing", icon: HammerIcon, text: "協力会社への支払い" },
  { type: "expense", icon: ReceiptIcon, text: "駐車場・燃料・処分費など" },
] as const;

export default async function CostsPage(props: PageProps<"/costs">) {
  const sp = await props.searchParams;
  const scope = enumParam(sp, "scope", ["active", "all"] as const) ?? "active";
  const entryType = enumParam(sp, "type", COST_TYPES);

  const data = await withUser(
    async (db, user) => ({
      user,
      settings: await getSettings(db),
      summaries: user.role === "admin" ? await listProjectCostSummaries(db, { scope }) : [],
      entries: await listCostEntries(db, { type: entryType, limit: user.role === "admin" ? 30 : 50 }),
    }),
    { roles: ["admin", "manager"] },
  );
  const { user, settings, summaries, entries } = data;
  const isAdmin = user.role === "admin";

  const active = summaries.filter((s) => ["preparing", "in_progress"].includes(s.status));
  const activeBudget = active.reduce((s, p) => s + (p.budgetCost ?? 0), 0);
  const activeCost = active.reduce((s, p) => s + p.totalCost, 0);
  const overCount = summaries.filter((s) => budgetLevel(s.budgetUsageRate, settings.costAlertPercent) === "over" && s.status !== "paid" && s.status !== "invoiced").length;
  const warnCount = summaries.filter((s) => budgetLevel(s.budgetUsageRate, settings.costAlertPercent) === "warning" && s.status !== "paid" && s.status !== "invoiced").length;

  const entrySection = (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{isAdmin ? "最近の原価明細" : "担当案件の登録履歴"}</h2>
        <div className="flex flex-wrap gap-1.5">
          {[undefined, ...COST_TYPES].map((t) => (
            <Link
              key={t ?? "all"}
              href={t ? `/costs?type=${t}${scope === "all" ? "&scope=all" : ""}` : `/costs${scope === "all" ? "?scope=all" : ""}`}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium",
                entryType === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {t ? COST_TYPE_LABELS[t] : "すべて"}
            </Link>
          ))}
        </div>
      </div>
      {entries.length ? (
        <CostEntryList entries={entries} />
      ) : (
        <EmptyState icon={ReceiptTextIcon} title="原価の明細はまだありません" compact />
      )}
    </section>
  );

  return (
    <>
      <PageHeader
        title={isAdmin ? "原価管理" : "材料費・経費の登録"}
        description={
          isAdmin
            ? "労務費（勤怠）・材料費・外注費・その他経費から案件ごとの実績原価と利益をリアルタイムに集計しています。"
            : "担当案件の材料費・外注費・経費を登録できます。"
        }
        actions={
          <Button asChild size="lg">
            <Link href="/costs/new">
              <PlusIcon aria-hidden />
              原価を登録
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map(({ type, icon: Icon, text }) => (
          <Link
            key={type}
            href={`/costs/new?type=${type}`}
            className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/8 transition hover:shadow-md hover:ring-primary/30 active:scale-[0.99]"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">{COST_TYPE_LABELS[type]}を登録</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </div>

      {isAdmin ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="工事中・着工前の予算原価" value={formatYenCompact(activeBudget)} sub={`${active.length}件の合計`} />
            <KpiCard label="同 実績原価" value={formatYenCompact(activeCost)} sub={`予算消化率 ${formatPercent(calcBudgetUsageRate(activeBudget, activeCost))}`} />
            <KpiCard label="予算超過の案件" value={`${overCount}件`} emphasis={overCount ? "danger" : "default"} sub="実績原価 > 予算原価" />
            <KpiCard label={`予算${settings.costAlertPercent}%超の案件`} value={`${warnCount}件`} emphasis={warnCount ? "warning" : "default"} sub="超過の手前で注意喚起" />
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>案件別 予算 vs 実績</CardTitle>
              <div className="flex gap-1.5 text-xs">
                <Link href="/costs" className={cn("rounded-full border px-3 py-1.5", scope === "active" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  進行中・未請求
                </Link>
                <Link href="/costs?scope=all" className={cn("rounded-full border px-3 py-1.5", scope === "all" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  すべて
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">案件</TableHead>
                      <TableHead className="text-right">受注金額</TableHead>
                      <TableHead className="text-right">予算原価</TableHead>
                      <TableHead className="w-56">実績原価 / 予算消化</TableHead>
                      <TableHead className="text-right">労務 / 材料 / 外注 / 経費</TableHead>
                      <TableHead className="text-right">粗利益</TableHead>
                      <TableHead className="pr-4 text-right">利益率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s) => (
                      <TableRow key={s.id} className="group relative">
                        <TableCell className="max-w-72 pl-4">
                          <Link href={`/projects/${s.id}?tab=materials`} className="block after:absolute after:inset-0">
                            <span className="block truncate font-medium group-hover:text-primary">{s.name}</span>
                          </Link>
                          <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <ProjectStatusBadge status={s.status} />
                            <span className="num">{s.projectCode}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Yen value={s.contractAmount} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Yen value={s.budgetCost} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                              <Yen value={s.totalCost} className="font-medium" />
                              <span
                                className={cn(
                                  "num text-xs",
                                  budgetLevel(s.budgetUsageRate, settings.costAlertPercent) === "over" && "font-semibold text-red-600",
                                  budgetLevel(s.budgetUsageRate, settings.costAlertPercent) === "warning" && "font-semibold text-amber-700",
                                )}
                              >
                                {formatPercent(s.budgetUsageRate)}
                              </span>
                            </div>
                            <BudgetMeter budget={s.budgetCost} actual={s.totalCost} alertPercent={settings.costAlertPercent} compact />
                          </div>
                        </TableCell>
                        <TableCell className="num text-right text-xs whitespace-nowrap text-muted-foreground">
                          {formatYenCompact(s.laborCost)} / {formatYenCompact(s.materialCost)} / {formatYenCompact(s.outsourcingCost)} / {formatYenCompact(s.expenseCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Yen value={profitView(s)?.profit ?? null} />
                          {profitView(s)?.forecast ? <span className="block text-[11px] text-muted-foreground">見込</span> : null}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <ProfitRate rate={profitView(s)?.rate ?? null} />
                          {profitView(s)?.forecast ? <span className="block text-[11px] text-muted-foreground">見込</span> : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {entrySection}
        </div>
      ) : (
        entrySection
      )}
    </>
  );
}

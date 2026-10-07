import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  FileWarningIcon,
  HardHatIcon,
  PercentIcon,
  PiggyBankIcon,
  ReceiptJapaneseYenIcon,
  TableIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FinanceComparisonChart } from "@/components/charts/finance-comparison-chart";
import { MonthlyRevenueChart } from "@/components/charts/monthly-revenue-chart";
import { TypeDonutChart } from "@/components/charts/type-donut-chart";
import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonth, formatPercent, formatYen } from "@/lib/format";
import { calcProfitRate } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AlertItem, KpiSummary, MonthlyFinance, ProjectMargin, RepRanking, TypeRevenue } from "@/server/queries/dashboard";

import { AlertPanel } from "./alert-panel";
import { ImpactSimulation } from "./impact-simulation";
import { ProjectMarginBars, RepRankingList } from "./rankings";

function ChartCard({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span>前月 実績なし</span>;
  const rate = ((current - previous) / previous) * 100;
  const up = rate >= 0;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-emerald-700" : "text-red-600")}>
      <Icon className="size-3.5" aria-hidden />
      前月比 {up ? "+" : ""}
      {rate.toFixed(1)}%
    </span>
  );
}

export interface ManagementDashboardData {
  today: string;
  kpi: KpiSummary;
  monthly: MonthlyFinance[];
  byType: TypeRevenue[];
  byRep: RepRanking[];
  margins: ProjectMargin[];
  alerts: AlertItem[];
}

export function ManagementDashboard({ data }: { data: ManagementDashboardData }) {
  const { kpi, monthly, byType, byRep, margins, alerts, today } = data;
  const yearRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const yearCost = monthly.reduce((s, m) => s + m.cost, 0);
  const monthLabel = formatMonth(today.slice(0, 7));

  return (
    <div className="space-y-6">
      <section aria-label="今月の主要指標" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="今月売上"
          icon={ReceiptJapaneseYenIcon}
          value={formatYen(kpi.monthRevenue)}
          sub={
            <span className="flex flex-col gap-0.5">
              <span>{kpi.monthCompletedCount}件完工</span>
              <Delta current={kpi.monthRevenue} previous={kpi.prevMonthRevenue} />
            </span>
          }
        />
        <KpiCard
          label="今月粗利益"
          icon={PiggyBankIcon}
          value={formatYen(kpi.monthProfit)}
          emphasis={kpi.monthProfit < 0 ? "danger" : "default"}
          sub={`粗利率 ${formatPercent(calcProfitRate(kpi.monthRevenue, kpi.monthCost))}（売上 − 原価）`}
        />
        <KpiCard
          label="平均利益率"
          icon={PercentIcon}
          value={formatPercent(kpi.monthAverageRate ?? kpi.yearAverageRate)}
          sub={kpi.monthAverageRate === null ? "直近12ヶ月の完工案件" : `今月完工分 ・ 直近12ヶ月 ${formatPercent(kpi.yearAverageRate)}`}
        />
        <KpiCard label="稼働中案件" icon={HardHatIcon} value={`${kpi.inProgressCount}件`} sub="ステータス「工事中」" href="/projects?status=in_progress" />
        <KpiCard
          label="今月完工予定"
          icon={CalendarCheckIcon}
          value={`${kpi.dueThisMonthCount}件`}
          sub={`うち完工済 ${kpi.dueThisMonthCompleted}件`}
          href="/projects?sort=end"
        />
        <KpiCard
          label="未請求金額"
          icon={FileWarningIcon}
          value={formatYen(kpi.unbilledAmount)}
          emphasis={kpi.unbilledCount ? "warning" : "default"}
          sub={`完工済・未請求 ${kpi.unbilledCount}件`}
          href="/projects?status=completed"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="要確認" description="対応が必要な案件・勤怠・日報" className="xl:row-span-2">
          <AlertPanel alerts={alerts} visible={8} />
        </ChartCard>
        <ChartCard
          title="月別売上推移"
          description={`直近12ヶ月 ・ 完工基準 ・ 合計 ${formatYen(yearRevenue)}`}
          className="xl:col-span-2"
          action={
            <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <TableIcon className="size-3.5" aria-hidden />
              表で見る
            </Link>
          }
        >
          <MonthlyRevenueChart data={monthly} />
        </ChartCard>
        <ChartCard
          title="売上・原価・粗利益"
          description={`直近12ヶ月の粗利率 ${formatPercent(calcProfitRate(yearRevenue, yearCost))}`}
          className="xl:col-span-2"
        >
          <FinanceComparisonChart data={monthly} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="工事種別別売上" description="直近12ヶ月">
          {byType.length ? <TypeDonutChart data={byType} /> : <p className="py-6 text-center text-sm text-muted-foreground">データがありません</p>}
        </ChartCard>
        <ChartCard title="担当者別売上ランキング" description="直近12ヶ月 ・ 完工基準">
          <RepRankingList rows={byRep} />
        </ChartCard>
        <ChartCard title="案件別利益率" description="利益率が低い順 ・ 直近12ヶ月の完工案件" className="lg:col-span-2 xl:col-span-1">
          <ProjectMarginBars rows={margins} />
        </ChartCard>
      </div>

      <ChartCard title="導入効果（シミュレーション）" description={`${monthLabel}時点 ・ 集計・転記作業の削減時間`}>
        <ImpactSimulation variant="compact" />
      </ChartCard>
    </div>
  );
}

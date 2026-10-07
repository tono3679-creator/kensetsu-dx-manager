import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ImpactSimulation } from "@/components/dashboard/impact-simulation";
import { ProfitRate, Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CONSTRUCTION_TYPE_LABELS } from "@/lib/constants";
import { todayJst } from "@/lib/date";
import { formatDate, formatMonth, formatPercent } from "@/lib/format";
import { calcProfitRate } from "@/lib/money";
import { withUser } from "@/server/auth/session";
import { getMonthlyFinance, getProjectMargins, getRevenueByRep, getRevenueByType } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "レポート" };

function Section({ id, title, description, action, children }: { id?: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

function CsvLink({ kind, label }: { kind: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`/api/reports/${kind}`} download>
        <DownloadIcon aria-hidden />
        {label}
      </a>
    </Button>
  );
}

export default async function ReportsPage() {
  const today = todayJst();
  const { monthly, byType, byRep, margins } = await withUser(
    async (db) => ({
      monthly: await getMonthlyFinance(db, today),
      byType: await getRevenueByType(db, today),
      byRep: await getRevenueByRep(db, today),
      margins: await getProjectMargins(db, today),
    }),
    { roles: ["admin"] },
  );
  const total = {
    count: monthly.reduce((s, m) => s + m.projectCount, 0),
    revenue: monthly.reduce((s, m) => s + m.revenue, 0),
    cost: monthly.reduce((s, m) => s + m.cost, 0),
  };
  const typeTotal = byType.reduce((s, t) => s + t.revenue, 0);

  return (
    <>
      <PageHeader
        title="レポート"
        description={`${formatMonth(monthly[0].month)}〜${formatMonth(monthly[monthly.length - 1].month)} の実績（完工基準）。CSV でダウンロードして Excel でも利用できます。`}
        actions={
          <Button asChild variant="outline" size="lg">
            <Link href="#impact">導入効果を見る</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <Section title="月次損益" description="完工月に売上・原価を計上" action={<CsvLink kind="monthly" label="CSV" />}>
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">月</TableHead>
                  <TableHead className="text-right">完工件数</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-right">原価</TableHead>
                  <TableHead className="text-right">粗利益</TableHead>
                  <TableHead className="pr-6 text-right">粗利率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="num pl-6">{formatMonth(m.month)}</TableCell>
                    <TableCell className="num text-right">{m.projectCount}件</TableCell>
                    <TableCell className="text-right"><Yen value={m.revenue} /></TableCell>
                    <TableCell className="text-right"><Yen value={m.cost} /></TableCell>
                    <TableCell className="text-right font-medium"><Yen value={m.profit} /></TableCell>
                    <TableCell className="pr-6 text-right"><ProfitRate rate={m.revenue ? calcProfitRate(m.revenue, m.cost) : null} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-6">合計</TableCell>
                  <TableCell className="num text-right">{total.count}件</TableCell>
                  <TableCell className="text-right"><Yen value={total.revenue} className="font-bold" /></TableCell>
                  <TableCell className="text-right"><Yen value={total.cost} className="font-bold" /></TableCell>
                  <TableCell className="text-right"><Yen value={total.revenue - total.cost} className="font-bold" /></TableCell>
                  <TableCell className="pr-6 text-right"><ProfitRate rate={calcProfitRate(total.revenue, total.cost)} /></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </Section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="工事種別別 売上" description="直近12ヶ月">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">工事種別</TableHead>
                  <TableHead className="text-right">件数</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="pr-6 text-right">構成比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byType.map((t) => (
                  <TableRow key={t.constructionType}>
                    <TableCell className="pl-6">{CONSTRUCTION_TYPE_LABELS[t.constructionType]}</TableCell>
                    <TableCell className="num text-right">{t.projectCount}件</TableCell>
                    <TableCell className="text-right"><Yen value={t.revenue} /></TableCell>
                    <TableCell className="num pr-6 text-right">{formatPercent(typeTotal ? (t.revenue / typeTotal) * 100 : 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
          <Section title="担当者別 売上" description="直近12ヶ月">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">担当者</TableHead>
                  <TableHead className="text-right">件数</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-right">粗利益</TableHead>
                  <TableHead className="pr-6 text-right">粗利率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byRep.map((r) => (
                  <TableRow key={r.employeeId}>
                    <TableCell className="pl-6">{r.name}</TableCell>
                    <TableCell className="num text-right">{r.projectCount}件</TableCell>
                    <TableCell className="text-right"><Yen value={r.revenue} /></TableCell>
                    <TableCell className="text-right"><Yen value={r.profit} /></TableCell>
                    <TableCell className="pr-6 text-right"><ProfitRate rate={r.profitRate} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </div>

        <Section title="案件別 利益率" description="直近12ヶ月の完工案件 ・ 利益率が低い順" action={<CsvLink kind="projects" label="全案件CSV" />}>
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">案件</TableHead>
                  <TableHead>完工日</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-right">原価</TableHead>
                  <TableHead className="text-right">粗利益</TableHead>
                  <TableHead className="pr-6 text-right">利益率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {margins.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="max-w-96 pl-6">
                      <Link href={`/projects/${m.id}`} className="block truncate font-medium hover:text-primary">
                        {m.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{m.customerName}</span>
                    </TableCell>
                    <TableCell className="num">{formatDate(m.actualEndDate)}</TableCell>
                    <TableCell className="text-right"><Yen value={m.contractAmount} /></TableCell>
                    <TableCell className="text-right"><Yen value={m.totalCost} /></TableCell>
                    <TableCell className="text-right"><Yen value={m.grossProfit} /></TableCell>
                    <TableCell className="pr-6 text-right"><ProfitRate rate={m.profitRate} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Card id="impact" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-base">導入効果（Before / After）</CardTitle>
            <CardDescription>集計・転記にかかっていた事務作業時間の比較</CardDescription>
          </CardHeader>
          <CardContent>
            <ImpactSimulation />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

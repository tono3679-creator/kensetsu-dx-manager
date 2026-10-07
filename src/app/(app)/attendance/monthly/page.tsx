import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RoleBadge } from "@/components/common/badges";
import { MonthSwitcher } from "@/components/common/month-switcher";
import { Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { monthKey, todayJst } from "@/lib/date";
import { formatHours, formatMinutes } from "@/lib/format";
import { monthParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { withUser } from "@/server/auth/session";
import { getMonthlySummary } from "@/server/queries/attendance";

export const metadata: Metadata = { title: "月次勤怠" };

export default async function MonthlyAttendancePage(props: PageProps<"/attendance/monthly">) {
  const sp = await props.searchParams;
  const today = todayJst();
  const currentMonth = monthKey(today);
  const requested = monthParam(sp, "month");
  const month = requested && requested <= currentMonth ? requested : currentMonth;

  const rows = await withUser((db) => getMonthlySummary(db, month, today), { roles: ["admin"] });
  const total = {
    days: rows.reduce((s, r) => s + r.workDays, 0),
    minutes: rows.reduce((s, r) => s + r.totalMinutes, 0),
    overtime: rows.reduce((s, r) => s + r.overtimeMinutes, 0),
    labor: rows.reduce((s, r) => s + r.laborCost, 0),
  };

  return (
    <>
      <PageHeader
        backHref="/attendance"
        backLabel="勤怠管理"
        title="月次勤怠（従業員別）"
        description="出勤日数・総労働時間・残業時間・案件別作業時間を従業員ごとに集計しています。"
        actions={<MonthSwitcher month={month} basePath="/attendance/monthly" maxMonth={currentMonth} />}
      />

      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/8">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">従業員</TableHead>
              <TableHead className="text-right">出勤日数</TableHead>
              <TableHead className="text-right">総労働時間</TableHead>
              <TableHead className="text-right">残業時間</TableHead>
              <TableHead className="text-right">労務費</TableHead>
              <TableHead>案件別作業時間</TableHead>
              <TableHead className="w-8 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.employeeId} className="group relative">
                <TableCell className="pl-4">
                  <Link href={`/attendance/monthly/${r.employeeId}?month=${month}`} className="after:absolute after:inset-0">
                    <span className="font-medium group-hover:text-primary">{r.name}</span>
                  </Link>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RoleBadge role={r.role} />
                    {r.departmentName}
                  </span>
                </TableCell>
                <TableCell className="num text-right">
                  {r.workDays}日
                  {r.missingClockOut ? <span className="block text-xs text-amber-700">打刻漏れ {r.missingClockOut}</span> : null}
                </TableCell>
                <TableCell className="num text-right font-medium">{formatMinutes(r.totalMinutes)}</TableCell>
                <TableCell className={cn("num text-right", r.overtimeMinutes >= 45 * 60 && "font-semibold text-amber-700")}>
                  {formatMinutes(r.overtimeMinutes)}
                </TableCell>
                <TableCell className="text-right">
                  <Yen value={r.laborCost} />
                </TableCell>
                <TableCell>
                  <div className="flex max-w-md flex-wrap gap-1">
                    {r.projects.slice(0, 3).map((p) => (
                      <span key={p.projectId ?? "none"} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                        <span className="max-w-40 truncate align-bottom">{p.projectName ?? "社内作業"}</span>{" "}
                        <span className="num font-medium">{formatHours(p.minutes)}</span>
                      </span>
                    ))}
                    {r.projects.length > 3 ? <span className="text-xs text-muted-foreground">他{r.projects.length - 3}件</span> : null}
                    {r.projects.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                  </div>
                </TableCell>
                <TableCell className="pr-4">
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="pl-4">合計（{rows.length}名）</TableCell>
              <TableCell className="num text-right">{total.days}日</TableCell>
              <TableCell className="num text-right">{formatMinutes(total.minutes)}</TableCell>
              <TableCell className="num text-right">{formatMinutes(total.overtime)}</TableCell>
              <TableCell className="text-right">
                <Yen value={total.labor} className="font-bold" />
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        残業時間は所定労働時間を超えた分を日ごとに集計しています。月45時間以上はオレンジで表示します。労務費 = 実働時間 × 時間原価。
      </p>
    </>
  );
}

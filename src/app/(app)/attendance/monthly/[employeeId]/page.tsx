import { CalendarDaysIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AttendanceEditDialog } from "@/components/attendance/attendance-edit-dialog";
import { AttendanceRecords, AttendanceTotalsCards } from "@/components/attendance/attendance-records";
import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { EmptyState } from "@/components/common/empty-state";
import { MonthSwitcher } from "@/components/common/month-switcher";
import { Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monthKey, todayJst } from "@/lib/date";
import { formatHours, formatPercent } from "@/lib/format";
import { isUuid, monthParam } from "@/lib/search-params";
import { deleteAttendanceAction } from "@/server/actions/attendance";
import { withUser } from "@/server/auth/session";
import { listEmployeeAttendance, summarize } from "@/server/queries/attendance";
import { listProjectOptions } from "@/server/queries/common";
import { getEmployee } from "@/server/queries/employees";

export const metadata: Metadata = { title: "従業員の勤怠" };

export default async function EmployeeAttendancePage(props: PageProps<"/attendance/monthly/[employeeId]">) {
  const { employeeId } = await props.params;
  if (!isUuid(employeeId)) notFound();
  const sp = await props.searchParams;
  const today = todayJst();
  const currentMonth = monthKey(today);
  const requested = monthParam(sp, "month");
  const month = requested && requested <= currentMonth ? requested : currentMonth;

  const data = await withUser(
    async (db) => {
      const employee = await getEmployee(db, employeeId);
      if (!employee) return null;
      return {
        employee,
        records: await listEmployeeAttendance(db, employeeId, month),
        projects: await listProjectOptions(db),
      };
    },
    { roles: ["admin"] },
  );
  if (!data) notFound();
  const { employee, records, projects } = data;
  const totals = summarize(records, today);
  const laborCost = records.reduce((s, r) => s + (r.laborCost ?? 0), 0);

  const byProject = new Map<string, { name: string; minutes: number; cost: number }>();
  for (const r of records) {
    const key = r.projectId ?? "none";
    const entry = byProject.get(key) ?? { name: r.projectName ?? "社内作業", minutes: 0, cost: 0 };
    entry.minutes += r.workMinutes ?? 0;
    entry.cost += r.laborCost ?? 0;
    byProject.set(key, entry);
  }
  const projectRows = [...byProject.values()].sort((a, b) => b.minutes - a.minutes);

  return (
    <>
      <PageHeader
        backHref={`/attendance/monthly?month=${month}`}
        backLabel="月次勤怠"
        title={`${employee.name} の勤怠`}
        description={`${employee.departmentName ?? ""} ${employee.position ?? ""} ・ 時間原価 ${employee.hourlyCost?.toLocaleString("ja-JP") ?? "—"}円`}
        actions={
          <>
            <MonthSwitcher month={month} basePath={`/attendance/monthly/${employeeId}`} maxMonth={currentMonth} />
            <AttendanceEditDialog record={null} employeeId={employeeId} defaultDate={today} projects={projects} />
          </>
        }
      />

      <div className="space-y-5">
        <AttendanceTotalsCards
          totals={totals}
          extra={
            <div className="col-span-2 rounded-xl bg-card p-3 ring-1 ring-foreground/8 md:col-span-4 md:p-4">
              <p className="text-xs text-muted-foreground">労務費（案件に計上される社内原価）</p>
              <p className="mt-1 text-xl font-bold md:text-2xl">
                <Yen value={laborCost} />
              </p>
            </div>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>案件別作業時間</CardTitle>
          </CardHeader>
          <CardContent>
            {projectRows.length ? (
              <ul className="space-y-3">
                {projectRows.map((p) => (
                  <li key={p.name} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="num shrink-0 text-muted-foreground">
                        <span className="font-semibold text-foreground">{formatHours(p.minutes)}</span>（
                        {formatPercent(totals.totalMinutes ? (p.minutes / totals.totalMinutes) * 100 : 0)}） ・ <Yen value={p.cost} />
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${totals.totalMinutes ? (p.minutes / totals.totalMinutes) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">この月の作業記録はありません。</p>
            )}
          </CardContent>
        </Card>

        {records.length ? (
          <AttendanceRecords
            records={records}
            actions={(r) => (
              <span className="inline-flex items-center">
                <AttendanceEditDialog record={r} employeeId={employeeId} defaultDate={r.workDate} projects={projects} />
                <ConfirmActionButton
                  iconOnly
                  action={deleteAttendanceAction.bind(null, r.id)}
                  title="この勤怠記録を削除しますか？"
                  description="労務費の計上も取り消されます。"
                />
              </span>
            )}
          />
        ) : (
          <EmptyState icon={CalendarDaysIcon} title="この月の勤怠記録はありません" compact />
        )}
      </div>
    </>
  );
}

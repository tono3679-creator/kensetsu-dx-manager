import { CalendarDaysIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AttendanceRecords, AttendanceTotalsCards } from "@/components/attendance/attendance-records";
import { ClockCard } from "@/components/attendance/clock-card";
import { EmptyState } from "@/components/common/empty-state";
import { MonthSwitcher } from "@/components/common/month-switcher";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { monthKey, todayJst } from "@/lib/date";
import { monthParam } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { getClockStatus, listEmployeeAttendance, summarize } from "@/server/queries/attendance";
import { getSettings, listProjectOptions } from "@/server/queries/common";

export const metadata: Metadata = { title: "勤怠管理" };

export default async function AttendancePage(props: PageProps<"/attendance">) {
  const sp = await props.searchParams;
  const today = todayJst();
  const currentMonth = monthKey(today);
  const requested = monthParam(sp, "month");
  const month = requested && requested <= currentMonth ? requested : currentMonth;

  const data = await withUser(async (db, user) => ({
    user,
    status: await getClockStatus(db, user.employeeId, today),
    records: await listEmployeeAttendance(db, user.employeeId, month),
    projects: await listProjectOptions(db, { activeOnly: true }),
    settings: await getSettings(db),
  }));
  const { user, status, records, projects, settings } = data;
  const totals = summarize(records, today);

  return (
    <>
      <PageHeader
        title={user.role === "staff" ? "勤怠・打刻" : "勤怠管理"}
        description="出勤・退勤ボタンで打刻すると、実働時間と残業時間が自動で計算されます。"
        actions={
          user.role === "admin" ? (
            <Button asChild size="lg" variant="outline">
              <Link href="/attendance/monthly">
                <UsersIcon aria-hidden />
                月次勤怠（従業員別）
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ClockCard
            today={today}
            record={status.today}
            yesterdayOpen={status.yesterdayOpen}
            projects={projects.filter((p) => p.status !== "completed")}
            standardWorkMinutes={settings.standardWorkMinutes}
            defaultBreakMinutes={settings.defaultBreakMinutes}
          />
        </div>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">自分の勤務履歴</h2>
            <MonthSwitcher month={month} basePath="/attendance" maxMonth={currentMonth} />
          </div>
          <AttendanceTotalsCards totals={totals} />
          {records.length ? (
            <AttendanceRecords records={records} />
          ) : (
            <EmptyState icon={CalendarDaysIcon} title="この月の勤怠記録はありません" compact />
          )}
        </section>
      </div>
    </>
  );
}

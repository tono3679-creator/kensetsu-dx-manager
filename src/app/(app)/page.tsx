import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FieldHome } from "@/components/dashboard/field-home";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { todayJst, toJstTimeString } from "@/lib/date";
import { formatDateWithWeekday } from "@/lib/format";
import { withUser } from "@/server/auth/session";
import { getClockStatus } from "@/server/queries/attendance";
import { getSettings, listProjectOptions } from "@/server/queries/common";
import {
  getAlerts,
  getKpiSummary,
  getMonthlyFinance,
  getProjectMargins,
  getRevenueByRep,
  getRevenueByType,
  listMyActiveProjects,
  listTodayCrew,
} from "@/server/queries/dashboard";
import { listDailyReports } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "ダッシュボード" };

export default async function DashboardPage() {
  const today = todayJst();
  const result = await withUser(async (db, user) => {
    const settings = await getSettings(db);
    if (user.role === "admin") {
      return {
        kind: "admin" as const,
        settings,
        data: {
          today,
          kpi: await getKpiSummary(db, today),
          monthly: await getMonthlyFinance(db, today),
          byType: await getRevenueByType(db, today),
          byRep: await getRevenueByRep(db, today),
          margins: await getProjectMargins(db, today),
          alerts: await getAlerts(db, today, { costAlertPercent: settings.costAlertPercent, includeFinancial: true, includeAttendance: true }),
        },
      };
    }
    const isManager = user.role === "manager";
    const clockProjects = await listProjectOptions(db, { activeOnly: true });
    return {
      kind: "field" as const,
      data: {
        user,
        today,
        settings,
        clock: await getClockStatus(db, user.employeeId, today),
        clockProjects: clockProjects.filter((p) => p.status !== "completed"),
        myProjects: await listMyActiveProjects(db),
        // RLS により現場責任者は担当案件、スタッフは自分が作成・参加した日報のみ
        recentReports: await listDailyReports(db, {}, 3),
        alerts: isManager
          ? await getAlerts(db, today, { costAlertPercent: settings.costAlertPercent, includeFinancial: false, includeAttendance: false, employeeId: user.employeeId })
          : [],
        crew: isManager ? await listTodayCrew(db, today) : [],
      },
    };
  });

  if (result.kind === "field") {
    const hour = Number(toJstTimeString(new Date()).slice(0, 2));
    return <FieldHome data={result.data} hour={hour} />;
  }

  return (
    <>
      <PageHeader
        title="経営ダッシュボード"
        description={`${formatDateWithWeekday(today)} 現在 ・ ${result.settings.companyName}`}
        actions={
          <Button asChild size="lg">
            <Link href="/projects/new">
              <PlusIcon aria-hidden />
              案件を登録
            </Link>
          </Button>
        }
      />
      <ManagementDashboard data={result.data} />
    </>
  );
}

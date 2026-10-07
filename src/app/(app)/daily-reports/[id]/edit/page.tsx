import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { DailyReportForm } from "@/components/daily-reports/daily-report-form";
import { todayJst } from "@/lib/date";
import { isUuid } from "@/lib/search-params";
import { updateDailyReportAction } from "@/server/actions/daily-reports";
import { withUser } from "@/server/auth/session";
import { listProjectOptions } from "@/server/queries/common";
import { getDailyReport, listProjectWorkerMap } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "日報の編集" };

export default async function EditDailyReportPage(props: PageProps<"/daily-reports/[id]/edit">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const data = await withUser(async (db, user) => {
    const report = await getDailyReport(db, id);
    if (!report) return null;
    const projects = await listProjectOptions(db, { activeOnly: true });
    // 完工・請求済みなど対象外ステータスの案件でも、編集中の日報の案件は選べるようにする
    if (!projects.some((p) => p.id === report.projectId)) {
      const all = await listProjectOptions(db);
      const current = all.find((p) => p.id === report.projectId);
      if (current) projects.unshift(current);
    }
    return { user, report, projects, workerMap: await listProjectWorkerMap(db, projects.map((p) => p.id)) };
  });
  if (!data) notFound();
  if (data.user.role !== "admin" && data.report.authorId !== data.user.employeeId) redirect("/forbidden");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader backHref={`/daily-reports/${id}`} backLabel="日報詳細" title="日報の編集" />
      <DailyReportForm
        action={updateDailyReportAction.bind(null, id)}
        projects={data.projects}
        workerMap={data.workerMap}
        currentEmployeeId={data.user.employeeId}
        today={todayJst()}
        initial={data.report}
        submitLabel="変更を保存"
        cancelHref={`/daily-reports/${id}`}
      />
    </div>
  );
}

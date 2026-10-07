import { Building2Icon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DailyReportForm } from "@/components/daily-reports/daily-report-form";
import { todayJst } from "@/lib/date";
import { dateParam, uuidParam } from "@/lib/search-params";
import { createDailyReportAction } from "@/server/actions/daily-reports";
import { withUser } from "@/server/auth/session";
import { listProjectOptions } from "@/server/queries/common";
import { listProjectWorkerMap } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "日報を書く" };

export default async function NewDailyReportPage(props: PageProps<"/daily-reports/new">) {
  const sp = await props.searchParams;
  const today = todayJst();
  const { user, projects, workerMap } = await withUser(async (db, user) => {
    const projects = await listProjectOptions(db, { activeOnly: true });
    return { user, projects, workerMap: await listProjectWorkerMap(db, projects.map((p) => p.id)) };
  });
  const requestedProject = uuidParam(sp, "projectId");
  const defaultProjectId = projects.some((p) => p.id === requestedProject) ? requestedProject : undefined;
  const requestedDate = dateParam(sp, "date");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader backHref="/daily-reports" backLabel="日報一覧" title="日報を書く" description="現場での作業内容を記録します。写真も一緒に登録できます。" />
      {projects.length === 0 ? (
        <EmptyState icon={Building2Icon} title="日報を書ける案件がありません" description="担当の案件が割り当てられると、日報を登録できるようになります。" />
      ) : (
        <DailyReportForm
          action={createDailyReportAction}
          projects={projects}
          workerMap={workerMap}
          currentEmployeeId={user.employeeId}
          today={today}
          defaultProjectId={defaultProjectId}
          defaultDate={requestedDate && requestedDate <= today ? requestedDate : undefined}
          submitLabel="日報を提出"
          cancelHref="/daily-reports"
        />
      )}
    </div>
  );
}

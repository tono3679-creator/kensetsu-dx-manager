import { ClipboardListIcon, PencilIcon, PlusIcon, ReceiptIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConstructionTypeLabel, ProjectStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs, type TabItem } from "@/components/common/url-tabs";
import { ExpenseTable, MaterialTable, OutsourcingTable } from "@/components/costs/cost-entry-tables";
import { ReportCard } from "@/components/daily-reports/report-card";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import { ProjectAttendanceTable } from "@/components/projects/project-attendance-table";
import { ProjectCostPanel } from "@/components/projects/project-cost-panel";
import { ProjectInfoCard } from "@/components/projects/project-info-card";
import { Button } from "@/components/ui/button";
import { todayJst } from "@/lib/date";
import { isUuid, param } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { getSettings } from "@/server/queries/common";
import { listProjectReports } from "@/server/queries/daily-reports";
import {
  getProject,
  listProjectAttendance,
  listProjectCostEntries,
  listProjectMembers,
  listProjectPhotos,
} from "@/server/queries/projects";

export const metadata: Metadata = { title: "案件詳細" };

export default async function ProjectDetailPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!isUuid(id)) notFound();

  const data = await withUser(async (db, user) => {
    const project = await getProject(db, user, id);
    if (!project) return null;
    const canSeeCosts = user.role !== "staff";
    return {
      user,
      project,
      settings: await getSettings(db),
      members: await listProjectMembers(db, id),
      reports: await listProjectReports(db, id),
      photos: await listProjectPhotos(db, id),
      attendance: canSeeCosts ? await listProjectAttendance(db, id) : [],
      costs: canSeeCosts ? await listProjectCostEntries(db, id) : null,
    };
  });
  if (!data) notFound();

  const { user, project, settings, members, reports, photos, attendance, costs } = data;
  const isAdmin = user.role === "admin";
  const today = todayJst();
  const canWriteReport = ["ordered", "preparing", "in_progress", "completed"].includes(project.status);

  const tabs: TabItem[] = [
    {
      value: "reports",
      label: "日報",
      count: reports.length,
      content: reports.length ? (
        <ol className="relative space-y-4 border-l-2 border-dashed border-border pl-4 md:pl-6">
          {reports.map((r) => (
            <li key={r.id} className="relative">
              <span aria-hidden className="absolute top-5 -left-[23px] size-3 rounded-full border-2 border-background bg-primary md:-left-[31px]" />
              <ReportCard report={r} showProject={false} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={ClipboardListIcon}
          title="日報はまだありません"
          description="現場の作業内容・進捗・写真を記録しましょう。"
          action={
            canWriteReport ? (
              <Button asChild>
                <Link href={`/daily-reports/new?projectId=${project.id}`}>日報を書く</Link>
              </Button>
            ) : null
          }
        />
      ),
    },
  ];

  if (user.role !== "staff" && costs) {
    tabs.push(
      { value: "attendance", label: "勤怠", count: attendance.length, content: <ProjectAttendanceTable rows={attendance} showCost={isAdmin} /> },
      { value: "materials", label: "材料費", count: costs.materials.length, content: <MaterialTable rows={costs.materials} user={user} projectId={project.id} /> },
      { value: "outsourcing", label: "外注費", count: costs.outsourcing.length, content: <OutsourcingTable rows={costs.outsourcing} user={user} projectId={project.id} /> },
      { value: "expenses", label: "経費", count: costs.expenses.length, content: <ExpenseTable rows={costs.expenses} user={user} projectId={project.id} /> },
    );
  }
  tabs.push({ value: "photos", label: "写真", count: photos.length, content: <PhotoGallery photos={photos} user={user} projectId={project.id} /> });

  const requestedTab = param(sp, "tab");
  const defaultTab = tabs.some((t) => t.value === requestedTab) ? requestedTab! : "reports";

  return (
    <>
      <PageHeader
        backHref="/projects"
        backLabel={user.role === "staff" ? "担当現場" : "案件一覧"}
        title={project.name}
        actions={
          <>
            {canWriteReport ? (
              <Button asChild size="lg">
                <Link href={`/daily-reports/new?projectId=${project.id}`}>
                  <ClipboardListIcon aria-hidden />
                  日報を書く
                </Link>
              </Button>
            ) : null}
            {user.role !== "staff" && canWriteReport ? (
              <Button asChild size="lg" variant="outline">
                <Link href={`/costs/new?projectId=${project.id}`}>
                  <ReceiptIcon aria-hidden />
                  原価を登録
                </Link>
              </Button>
            ) : null}
            {isAdmin ? (
              <Button asChild size="lg" variant="outline">
                <Link href={`/projects/${project.id}/edit`}>
                  <PencilIcon aria-hidden />
                  編集
                </Link>
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
          <ProjectStatusBadge status={project.status} />
          <span className="num text-muted-foreground">{project.projectCode}</span>
          <ConstructionTypeLabel type={project.constructionType} />
          <span className="text-muted-foreground">{project.customerName}</span>
        </div>
      </PageHeader>

      {isAdmin && project.status !== "estimating" && project.status !== "lost" ? (
        <div className="mb-6">
          <ProjectCostPanel project={project} alertPercent={settings.costAlertPercent} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 min-w-0 lg:order-1">
          <UrlTabs tabs={tabs} defaultValue={defaultTab} />
        </div>
        <aside className="order-1 space-y-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <ProjectInfoCard project={project} members={members} today={today} linkCustomer={isAdmin} />
          {isAdmin && (project.status === "estimating" || project.status === "lost") ? (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/projects/${project.id}/edit`}>
                <PlusIcon aria-hidden />
                受注登録・ステータス変更
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </>
  );
}

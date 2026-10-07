import { Building2Icon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { PageHeader } from "@/components/common/page-header";
import { ReportCard } from "@/components/daily-reports/report-card";
import { PhotoThumb } from "@/components/photos/photo-thumb";
import { Button } from "@/components/ui/button";
import { formatDateWithWeekday } from "@/lib/format";
import { isUuid } from "@/lib/search-params";
import { deleteDailyReportAction } from "@/server/actions/daily-reports";
import { withUser } from "@/server/auth/session";
import { getDailyReport } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "日報詳細" };

export default async function DailyReportDetailPage(props: PageProps<"/daily-reports/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const { user, report } = await withUser(async (db, user) => ({ user, report: await getDailyReport(db, id) }));
  if (!report) notFound();
  const canEdit = user.role === "admin" || report.authorId === user.employeeId;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        backHref="/daily-reports"
        backLabel="日報一覧"
        title={`${formatDateWithWeekday(report.reportDate)} の日報`}
        description={report.projectName}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={`/projects/${report.projectId}`}>
                <Building2Icon aria-hidden />
                案件を見る
              </Link>
            </Button>
            {canEdit ? (
              <>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/daily-reports/${report.id}/edit`}>
                    <PencilIcon aria-hidden />
                    編集
                  </Link>
                </Button>
                <ConfirmActionButton
                  action={deleteDailyReportAction.bind(null, report.id)}
                  title="この日報を削除しますか？"
                  description="日報に添付した写真は案件の写真として残ります。"
                />
              </>
            ) : null}
          </>
        }
      />
      <ReportCard report={{ ...report, photos: [] }} showProject={false} />
      {report.photos.length ? (
        <section className="mt-5 space-y-2">
          <h2 className="text-sm font-semibold">写真（{report.photos.length}）</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.photos.map((p) => (
              <PhotoThumb key={p.id} photo={p} />
            ))}
          </div>
        </section>
      ) : null}
      <p className="num mt-6 text-xs text-muted-foreground">
        作成: {report.authorName}
      </p>
    </div>
  );
}

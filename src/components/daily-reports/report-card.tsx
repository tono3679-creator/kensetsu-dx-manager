import { AlertTriangleIcon, CalendarClockIcon, ClockIcon, PackageIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { PhotoThumb } from "@/components/photos/photo-thumb";
import { Progress } from "@/components/ui/progress";
import { formatDateWithWeekday, formatNumber, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DailyReport } from "@/server/queries/daily-reports";

/** 日報カード（一覧・案件詳細のタイムラインで共通利用） */
export function ReportCard({
  report,
  showProject = true,
  className,
}: {
  report: DailyReport;
  showProject?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("rounded-xl bg-card p-4 ring-1 ring-foreground/8 md:p-5", className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/daily-reports/${report.id}`} className="group">
            <p className="num text-sm font-semibold group-hover:text-primary">{formatDateWithWeekday(report.reportDate)}</p>
            {showProject ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground group-hover:text-primary">{report.projectName}</p>
            ) : null}
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" aria-hidden />
            <span className="num">
              {formatTime(report.startTime)}〜{formatTime(report.endTime)}
            </span>
          </span>
          <span>記入: {report.authorName}</span>
        </div>
      </header>

      <div className="mt-3 flex items-center gap-3">
        <Progress value={report.progress} className="h-2 flex-1" aria-label="作業進捗" />
        <span className="num w-12 text-right text-sm font-semibold">{report.progress}%</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{report.workContent}</p>

      {report.issues ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="text-xs font-semibold">問題・トラブル</p>
            <p className="whitespace-pre-line">{report.issues}</p>
          </div>
        </div>
      ) : null}

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {report.workers.length ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground">
              <UsersIcon className="size-4" aria-label="作業者" />
            </dt>
            <dd className="flex flex-wrap gap-1">
              {report.workers.map((w) => (
                <span key={w.employeeId} className="rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap">
                  {w.name}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {report.tomorrowPlan ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground">
              <CalendarClockIcon className="size-4" aria-label="明日の予定" />
            </dt>
            <dd className="text-muted-foreground">
              <span className="text-xs">明日：</span>
              {report.tomorrowPlan}
            </dd>
          </div>
        ) : null}
        {report.materials.length ? (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="shrink-0 text-muted-foreground">
              <PackageIcon className="size-4" aria-label="使用材料" />
            </dt>
            <dd className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              {report.materials.map((m) => (
                <span key={m.id} className="text-xs">
                  {m.name} <span className="num">{formatNumber(m.quantity)}</span>
                  {m.unit}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      {report.photos.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {report.photos.map((p) => (
            <PhotoThumb key={p.id} photo={p} size="sm" />
          ))}
        </div>
      ) : null}

      {report.notes ? <p className="mt-3 text-xs text-muted-foreground">備考：{report.notes}</p> : null}
    </article>
  );
}

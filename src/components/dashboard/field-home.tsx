import { ClipboardListIcon, MapPinIcon, PhoneIcon, ReceiptIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { ClockCard } from "@/components/attendance/clock-card";
import { ProjectStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { ReportCard } from "@/components/daily-reports/report-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { diffDays } from "@/lib/date";
import { formatDate, formatTime } from "@/lib/format";
import type { CurrentUser } from "@/server/auth/session";
import type { AttendanceRecord } from "@/server/queries/attendance";
import type { ProjectOption, Settings } from "@/server/queries/common";
import type { AlertItem, CrewAttendance, MyProject } from "@/server/queries/dashboard";
import type { DailyReport } from "@/server/queries/daily-reports";

import { AlertPanel } from "./alert-panel";

export interface FieldHomeData {
  user: CurrentUser;
  today: string;
  clock: { today: AttendanceRecord | null; yesterdayOpen: AttendanceRecord | null };
  clockProjects: ProjectOption[];
  settings: Settings;
  myProjects: MyProject[];
  recentReports: DailyReport[];
  alerts: AlertItem[];
  crew: CrewAttendance[];
}

function SiteCard({ project, today, employeeId }: { project: MyProject; today: string; employeeId: string }) {
  const overdue = project.plannedEndDate && project.plannedEndDate < today ? diffDays(today, project.plannedEndDate) : 0;
  return (
    <li className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/8">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/projects/${project.id}`} className="min-w-0 hover:text-primary">
          <p className="font-semibold leading-snug">{project.name}</p>
          <p className="text-sm text-muted-foreground">{project.customerName}</p>
        </Link>
        <ProjectStatusBadge status={project.status} />
      </div>
      {project.siteAddress ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.siteAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-1.5 text-sm text-primary"
        >
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {project.siteAddress}
        </a>
      ) : null}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="num">
            工期 {formatDate(project.actualStartDate ?? project.plannedStartDate)} 〜 {formatDate(project.plannedEndDate)}
          </span>
          {overdue > 0 ? <span className="font-semibold text-red-600">{overdue}日超過</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <Progress value={project.latestProgress ?? 0} className="h-2 flex-1" aria-label="進捗" />
          <span className="num w-10 text-right text-sm font-semibold">{project.latestProgress ?? 0}%</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="lg" className="flex-1">
          <Link href={`/daily-reports/new?projectId=${project.id}`}>
            <ClipboardListIcon aria-hidden />
            日報を書く
          </Link>
        </Button>
        {project.siteManagerPhone && project.siteManagerId !== employeeId ? (
          <Button asChild size="lg" variant="outline">
            <a href={`tel:${project.siteManagerPhone}`} aria-label={`現場責任者 ${project.siteManagerName} に電話`}>
              <PhoneIcon aria-hidden />
              {project.siteManagerName}
            </a>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function greeting(hour: number) {
  if (hour >= 5 && hour < 10) return "おはようございます";
  if (hour >= 10 && hour < 17) return "こんにちは";
  return "お疲れさまです";
}

export function FieldHome({ data, hour }: { data: FieldHomeData; hour: number }) {
  const { user, today, clock, clockProjects, settings, myProjects, recentReports, alerts, crew } = data;
  const isManager = user.role === "manager";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">
          {greeting(hour)}、{user.lastName}さん
        </h1>
        <p className="text-sm text-muted-foreground">今日もご安全に。打刻と日報はこの画面からすぐに登録できます。</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          <ClockCard
            today={today}
            record={clock.today}
            yesterdayOpen={clock.yesterdayOpen}
            projects={clockProjects}
            standardWorkMinutes={settings.standardWorkMinutes}
            defaultBreakMinutes={settings.defaultBreakMinutes}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button asChild size="xl" className="h-16 rounded-xl">
              <Link href="/daily-reports/new">
                <ClipboardListIcon aria-hidden />
                日報を書く
              </Link>
            </Button>
            {isManager ? (
              <Button asChild size="xl" variant="outline" className="h-16 rounded-xl">
                <Link href="/costs/new?type=expense">
                  <ReceiptIcon aria-hidden />
                  経費を登録
                </Link>
              </Button>
            ) : (
              <Button asChild size="xl" variant="outline" className="h-16 rounded-xl">
                <Link href="/attendance">勤務履歴</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {isManager ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>要確認（担当案件）</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertPanel alerts={alerts} visible={5} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="size-4" aria-hidden />
                    本日の作業員
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {crew.length ? (
                    <ul className="divide-y">
                      {crew.map((c) => (
                        <li key={c.employeeId} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="font-medium">{c.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{c.projectName ?? "社内作業"}</span>
                          </span>
                          <span className="num shrink-0 text-xs text-muted-foreground">
                            {formatTime(c.clockIn)} 〜 {c.clockOut ? formatTime(c.clockOut) : <span className="font-medium text-emerald-700">作業中</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">本日の出勤記録はまだありません</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-bold">担当現場</h2>
            {myProjects.length ? (
              <ul className="grid gap-3 xl:grid-cols-2">
                {myProjects.map((p) => (
                  <SiteCard key={p.id} project={p} today={today} employeeId={user.employeeId} />
                ))}
              </ul>
            ) : (
              <EmptyState title="担当中の現場はありません" description="案件が割り当てられるとここに表示されます。" compact />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">最近の日報</h2>
              <Link href="/daily-reports" className="text-sm font-medium text-primary hover:underline">
                すべて見る
              </Link>
            </div>
            {recentReports.length ? (
              <div className="grid gap-3">
                {recentReports.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            ) : (
              <EmptyState icon={ClipboardListIcon} title="日報はまだありません" compact />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

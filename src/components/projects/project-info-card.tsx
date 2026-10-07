import { ExternalLinkIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { diffDays } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectDetail, ProjectMember } from "@/server/queries/projects";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function ProjectInfoCard({
  project,
  members,
  today,
  linkCustomer,
}: {
  project: ProjectDetail;
  members: ProjectMember[];
  today: string;
  linkCustomer: boolean;
}) {
  const active = ["ordered", "preparing", "in_progress"].includes(project.status);
  const overdueDays = active && project.plannedEndDate && project.plannedEndDate < today ? diffDays(today, project.plannedEndDate) : 0;
  const mapUrl = project.siteAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.siteAddress)}`
    : null;
  const workers = members.filter((m) => !m.isSiteManager);

  return (
    <Card>
      <CardHeader>
        <CardTitle>案件情報</CardTitle>
      </CardHeader>
      <CardContent>
        {project.latestProgress !== null ? (
          <div className="mb-3 rounded-lg bg-muted/50 p-3">
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">作業進捗（最新日報）</span>
              <span className="num font-semibold">{project.latestProgress}%</span>
            </div>
            <Progress value={project.latestProgress} className="h-2" aria-label="作業進捗" />
          </div>
        ) : null}
        <dl className="divide-y">
          <Row label="顧客">
            {linkCustomer ? (
              <Link href={`/customers/${project.customerId}`} className="font-medium text-primary hover:underline">
                {project.customerName}
              </Link>
            ) : (
              <span className="font-medium">{project.customerName}</span>
            )}
            {project.customerContactPerson ? (
              <span className="block text-xs text-muted-foreground">担当: {project.customerContactPerson}</span>
            ) : null}
          </Row>
          <Row label="現場住所">
            {project.siteAddress ? (
              <a
                href={mapUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1 text-primary hover:underline"
              >
                <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{project.siteAddress}</span>
                <ExternalLinkIcon className="mt-0.5 size-3 shrink-0" aria-label="地図を開く" />
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="予定工期">
            <span className="num">
              {formatDate(project.plannedStartDate)} 〜 {formatDate(project.plannedEndDate)}
            </span>
            {overdueDays > 0 ? (
              <span className="mt-0.5 block text-xs font-semibold text-red-600">完工予定日を{overdueDays}日超過</span>
            ) : null}
          </Row>
          <Row label="実績工期">
            <span className={cn("num", !project.actualStartDate && "text-muted-foreground")}>
              {project.actualStartDate
                ? `${formatDate(project.actualStartDate)} 〜 ${project.actualEndDate ? formatDate(project.actualEndDate) : "施工中"}`
                : "未着工"}
            </span>
          </Row>
          <Row label="契約日">
            <span className="num">{formatDate(project.contractDate)}</span>
          </Row>
          <Row label="担当者">{project.salesRepName ?? "—"}</Row>
          <Row label="現場責任者">
            <span>{project.siteManagerName ?? "—"}</span>
            {project.siteManagerPhone ? (
              <a href={`tel:${project.siteManagerPhone}`} className="num mt-0.5 flex items-center gap-1 text-xs text-primary">
                <PhoneIcon className="size-3" aria-hidden />
                {project.siteManagerPhone}
              </a>
            ) : null}
          </Row>
          <Row label="作業員">
            {workers.length ? (
              <span className="flex flex-wrap gap-1">
                {workers.map((m) => (
                  <span key={m.employeeId} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                    {m.name}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Row>
        </dl>
        {project.memo ? (
          <div className="mt-3 rounded-lg border border-dashed p-3 text-sm whitespace-pre-line text-muted-foreground">
            {project.memo}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

import { CalendarIcon, ChevronRightIcon, MapPinIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { ConstructionTypeLabel, ProjectStatusBadge } from "@/components/common/badges";
import { ProfitRate, Yen } from "@/components/common/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { profitView } from "@/lib/project-finance";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/server/queries/projects";

function isOverdue(project: ProjectListItem, today: string) {
  return (
    ["ordered", "preparing", "in_progress"].includes(project.status) &&
    !!project.plannedEndDate &&
    project.plannedEndDate < today
  );
}

function ProjectDates({ project, today }: { project: ProjectListItem; today: string }) {
  const overdue = isOverdue(project, today);
  return (
    <span className={cn("num", overdue && "font-semibold text-red-600")}>
      {formatDate(project.plannedEndDate)}
      {overdue ? <span className="ml-1 text-xs">（遅延）</span> : null}
    </span>
  );
}

/** 粗利益・利益率（完工前は見込原価ベースで「見込」と表示） */
function ProfitCells({ project }: { project: ProjectListItem }) {
  const view = profitView(project);
  return (
    <>
      <TableCell className="text-right">
        <Yen value={view?.profit ?? null} />
        {view?.forecast ? <span className="block text-[11px] text-muted-foreground">見込</span> : null}
      </TableCell>
      <TableCell className="text-right">
        <ProfitRate rate={view?.rate ?? null} />
        {view?.forecast ? <span className="block text-[11px] text-muted-foreground">見込</span> : null}
      </TableCell>
    </>
  );
}

/** 案件一覧: PC はテーブル、スマートフォンはカード */
export function ProjectList({
  projects,
  showMoney,
  today,
}: {
  projects: ProjectListItem[];
  showMoney: boolean;
  today: string;
}) {
  return (
    <>
      {/* PC / タブレット */}
      <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[32%] pl-4">案件 / 顧客</TableHead>
              <TableHead>工事種別</TableHead>
              <TableHead>担当者</TableHead>
              {showMoney ? (
                <>
                  <TableHead className="text-right">受注金額</TableHead>
                  <TableHead className="text-right">原価</TableHead>
                  <TableHead className="text-right">粗利益</TableHead>
                  <TableHead className="text-right">利益率</TableHead>
                </>
              ) : null}
              <TableHead>着工日</TableHead>
              <TableHead>完工予定日</TableHead>
              <TableHead className="pr-4">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id} className="group relative">
                <TableCell className="max-w-0 pl-4">
                  <Link href={`/projects/${p.id}`} className="block min-w-0 after:absolute after:inset-0">
                    <span className="block truncate font-medium text-foreground group-hover:text-primary">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="num">{p.projectCode}</span> ・ {p.customerName}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <ConstructionTypeLabel type={p.constructionType} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{p.salesRepName ?? "—"}</TableCell>
                {showMoney ? (
                  <>
                    <TableCell className="text-right">
                      <Yen value={p.contractAmount ?? p.estimateAmount} className={cn(p.contractAmount === null && "text-muted-foreground")} />
                      {p.contractAmount === null && p.estimateAmount !== null ? (
                        <span className="block text-[11px] text-muted-foreground">見積</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Yen value={p.totalCost || null} />
                    </TableCell>
                    <ProfitCells project={p} />
                  </>
                ) : null}
                <TableCell className="num whitespace-nowrap">{formatDate(p.actualStartDate ?? p.plannedStartDate)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <ProjectDates project={p} today={today} />
                </TableCell>
                <TableCell className="pr-4">
                  <ProjectStatusBadge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* スマートフォン */}
      <ul className="grid gap-3 lg:hidden">
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="block rounded-xl bg-card p-4 ring-1 ring-foreground/8 transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    <span className="num">{p.projectCode}</span> ・ <ConstructionTypeLabel type={p.constructionType} />
                  </p>
                  <p className="mt-0.5 font-semibold leading-snug">{p.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.customerName}</p>
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>

              {showMoney ? (
                <dl className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-2.5 text-center">
                  <div>
                    <dt className="text-[11px] text-muted-foreground">{p.contractAmount === null && p.estimateAmount !== null ? "見積" : "売上"}</dt>
                    <dd className="text-xs font-semibold">
                      <Yen value={p.contractAmount ?? p.estimateAmount} className="text-xs" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">原価</dt>
                    <dd className="text-xs font-semibold">
                      <Yen value={p.totalCost || null} className="text-xs" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">{profitView(p)?.forecast ? "見込利益" : "利益"}</dt>
                    <dd className="text-xs font-semibold">
                      <Yen value={profitView(p)?.profit ?? null} className="text-xs" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">{profitView(p)?.forecast ? "見込率" : "利益率"}</dt>
                    <dd>
                      <ProfitRate rate={profitView(p)?.rate ?? null} className="h-5 px-1.5 text-[11px]" />
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  <span className="num">{formatDate(p.actualStartDate ?? p.plannedStartDate)}</span> 〜{" "}
                  <ProjectDates project={p} today={today} />
                </span>
                {p.salesRepName ? (
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="size-3.5" aria-hidden />
                    {p.salesRepName}
                  </span>
                ) : null}
                {!showMoney && p.siteAddress ? (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{p.siteAddress}</span>
                  </span>
                ) : null}
                <ChevronRightIcon className="ml-auto size-4" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

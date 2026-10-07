import { ClipboardListIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField } from "@/components/common/filter-bar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { ReportCard } from "@/components/daily-reports/report-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateWithWeekday } from "@/lib/format";
import { dateParam, param, textParam, uuidParam } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { listEmployeeOptions, listProjectOptions } from "@/server/queries/common";
import { countDailyReports, listDailyReports, type DailyReport } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "現場日報" };

const PAGE_SIZE = 30;

export default async function DailyReportsPage(props: PageProps<"/daily-reports">) {
  const sp = await props.searchParams;
  const filters = {
    projectId: uuidParam(sp, "projectId"),
    authorId: uuidParam(sp, "authorId"),
    from: dateParam(sp, "from"),
    to: dateParam(sp, "to"),
    q: textParam(sp, "q"),
  };

  const page = Math.max(1, Math.min(1000, Number(param(sp, "page")) || 1));

  const { user, reports, total, projects, employees } = await withUser(async (db, user) => ({
    user,
    reports: await listDailyReports(db, filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    total: await countDailyReports(db, filters),
    projects: await listProjectOptions(db),
    employees: user.role === "staff" ? [] : await listEmployeeOptions(db),
  }));
  const activeCount = [filters.projectId, filters.authorId, filters.from, filters.to].filter(Boolean).length;

  const groups = new Map<string, DailyReport[]>();
  for (const report of reports) groups.set(report.reportDate, [...(groups.get(report.reportDate) ?? []), report]);

  return (
    <>
      <PageHeader
        title="現場日報"
        description={user.role === "staff" ? "あなたが作成・参加した日報です。" : "現場から提出された日報を時系列で確認できます。"}
        actions={
          <Button asChild size="lg" className="max-md:h-12 max-md:w-full max-md:text-base">
            <Link href="/daily-reports/new">
              <PlusIcon aria-hidden />
              日報を書く
            </Link>
          </Button>
        }
      />

      <FilterBar action="/daily-reports" q={filters.q} placeholder="作業内容・トラブル・案件名で検索" activeCount={activeCount}>
        <FilterField label="案件" htmlFor="f-project">
          <NativeSelect id="f-project" name="projectId" defaultValue={filters.projectId ?? ""}>
            <option value="">すべて</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        {user.role !== "staff" ? (
          <FilterField label="記入者" htmlFor="f-author">
            <NativeSelect id="f-author" name="authorId" defaultValue={filters.authorId ?? ""}>
              <option value="">すべて</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
        ) : null}
        <FilterField label="期間（開始）" htmlFor="f-from">
          <Input id="f-from" type="date" name="from" defaultValue={filters.from} />
        </FilterField>
        <FilterField label="期間（終了）" htmlFor="f-to">
          <Input id="f-to" type="date" name="to" defaultValue={filters.to} />
        </FilterField>
      </FilterBar>

      <p className="mt-5 mb-3 text-sm text-muted-foreground">
        <span className="num text-base font-semibold text-foreground">{total}</span> 件
        {total > PAGE_SIZE ? `（${(page - 1) * PAGE_SIZE + 1}〜${(page - 1) * PAGE_SIZE + reports.length}件目を表示）` : null}
      </p>

      {reports.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={activeCount || filters.q ? "条件に一致する日報がありません" : "日報はまだありません"}
          description="現場での作業内容・進捗・写真をスマートフォンから記録できます。"
          action={
            <Button asChild>
              <Link href="/daily-reports/new">日報を書く</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([date, items]) => (
            <section key={date} className="space-y-3">
              <h2 className="num sticky top-14 z-10 -mx-1 bg-background/90 px-1 py-1 text-sm font-semibold text-muted-foreground backdrop-blur md:top-16">
                {formatDateWithWeekday(date)}
                <span className="ml-2 font-normal">{items.length}件</span>
              </h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            </section>
          ))}
          <Pagination basePath="/daily-reports" params={sp} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
        </div>
      )}
    </>
  );
}

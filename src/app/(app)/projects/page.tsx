import { Building2Icon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField } from "@/components/common/filter-bar";
import { Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { ProjectList } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CONSTRUCTION_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { todayJst } from "@/lib/date";
import { formatPercent } from "@/lib/format";
import { calcProfitRate } from "@/lib/money";
import { profitView } from "@/lib/project-finance";
import { dateParam, enumParam, textParam, uuidParam } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { listEmployeeOptions } from "@/server/queries/common";
import { PROJECT_SORTS, listProjects, type ProjectSort } from "@/server/queries/projects";
import { CONSTRUCTION_TYPES, PROJECT_STATUSES } from "@/types/domain";

export const metadata: Metadata = { title: "案件管理" };

const SORT_KEYS = Object.keys(PROJECT_SORTS) as ProjectSort[];

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const sp = await props.searchParams;
  const filters = {
    q: textParam(sp, "q"),
    status: enumParam(sp, "status", PROJECT_STATUSES),
    salesRepId: uuidParam(sp, "rep"),
    type: enumParam(sp, "type", CONSTRUCTION_TYPES),
    from: dateParam(sp, "from"),
    to: dateParam(sp, "to"),
    sort: enumParam(sp, "sort", SORT_KEYS),
  };

  const { user, projects, employees } = await withUser(async (db, user) => ({
    user,
    projects: await listProjects(db, user, filters),
    employees: await listEmployeeOptions(db),
  }));
  const isAdmin = user.role === "admin";
  const activeCount = [filters.status, filters.salesRepId, filters.type, filters.from, filters.to, filters.sort].filter(Boolean).length;

  const ordered = projects.filter((p) => p.contractAmount !== null);
  const views = ordered.map((p) => ({ project: p, view: profitView(p) }));
  const totals = {
    revenue: ordered.reduce((s, p) => s + (p.contractAmount ?? 0), 0),
    cost: ordered.reduce((s, p) => s + (p.totalCost ?? 0), 0),
    forecastRevenue: views.reduce((s, v) => s + (v.view ? (v.project.contractAmount ?? 0) : 0), 0),
    forecastCost: views.reduce((s, v) => s + (v.view?.cost ?? 0), 0),
  };

  return (
    <>
      <PageHeader
        title={user.role === "staff" ? "担当現場" : "案件管理"}
        description={
          isAdmin
            ? "工事案件の受注金額・原価・利益をまとめて確認できます。"
            : "あなたが担当している現場の一覧です。"
        }
        actions={
          isAdmin ? (
            <Button asChild size="lg">
              <Link href="/projects/new">
                <PlusIcon aria-hidden />
                案件を登録
              </Link>
            </Button>
          ) : null
        }
      />

      <FilterBar action="/projects" q={filters.q} placeholder="案件名・顧客名・案件ID・住所で検索" activeCount={activeCount}>
        <FilterField label="ステータス" htmlFor="f-status">
          <NativeSelect id="f-status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">すべて</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="担当者" htmlFor="f-rep">
          <NativeSelect id="f-rep" name="rep" defaultValue={filters.salesRepId ?? ""}>
            <option value="">すべて</option>
            {employees
              .filter((e) => e.role !== "staff")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="工事種別" htmlFor="f-type">
          <NativeSelect id="f-type" name="type" defaultValue={filters.type ?? ""}>
            <option value="">すべて</option>
            {CONSTRUCTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONSTRUCTION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="並び順" htmlFor="f-sort">
          <NativeSelect id="f-sort" name="sort" defaultValue={filters.sort ?? "newest"}>
            {SORT_KEYS.filter((k) => isAdmin || k !== "profit").map((k) => (
              <option key={k} value={k}>
                {PROJECT_SORTS[k].label}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="期間（開始）" htmlFor="f-from">
          <Input id="f-from" type="date" name="from" defaultValue={filters.from} />
        </FilterField>
        <FilterField label="期間（終了）" htmlFor="f-to">
          <Input id="f-to" type="date" name="to" defaultValue={filters.to} />
        </FilterField>
      </FilterBar>

      <div className="mt-5 mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="num text-base font-semibold text-foreground">{projects.length}</span> 件
        </p>
        {isAdmin && ordered.length > 0 ? (
          <p className="num flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              受注合計 <Yen value={totals.revenue} className="font-semibold text-foreground" />
            </span>
            <span>
              実績原価 <Yen value={totals.cost} className="font-semibold text-foreground" />
            </span>
            <span title="完工前の案件は 見込原価 = max(予算原価, 実績原価) で計算">
              粗利（見込含む） <Yen value={totals.forecastRevenue - totals.forecastCost} className="font-semibold text-foreground" />（
              {formatPercent(calcProfitRate(totals.forecastRevenue, totals.forecastCost))}）
            </span>
          </p>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={Building2Icon}
          title={activeCount || filters.q ? "条件に一致する案件がありません" : "案件がまだありません"}
          description={
            activeCount || filters.q
              ? "検索条件を変更してお試しください。"
              : isAdmin
                ? "最初の案件を登録すると、日報・勤怠・原価をこの案件に紐づけて管理できます。"
                : "担当の案件が割り当てられるとここに表示されます。"
          }
          action={
            isAdmin && !activeCount && !filters.q ? (
              <Button asChild>
                <Link href="/projects/new">
                  <PlusIcon aria-hidden />
                  案件を登録
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ProjectList projects={projects} showMoney={isAdmin} today={todayJst()} />
      )}
    </>
  );
}

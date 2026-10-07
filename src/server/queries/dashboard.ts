import "server-only";

import { addDays, addMonths, endOfMonth, previousWeekday, recentMonthKeys, startOfMonth } from "@/lib/date";
import type { ConstructionType, ProjectStatus } from "@/types/domain";

import { sql, type Db, type SqlFragment } from "../db";

/** 売上計上（完工基準）の対象となる案件 */
const REVENUE = sql`p.status in ('completed', 'invoiced', 'paid') and p.actual_end_date is not null`;

export interface MonthlyFinance {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  projectCount: number;
}

/** 直近 n ヶ月の月別 売上・原価・粗利益（完工月に計上） */
export async function getMonthlyFinance(db: Db, today: string, months = 12): Promise<MonthlyFinance[]> {
  const keys = recentMonthKeys(today, months);
  const from = `${keys[0]}-01`;
  const to = endOfMonth(today);
  const rows = await db.many<MonthlyFinance>(sql`
    select to_char(p.actual_end_date, 'YYYY-MM') as month,
           coalesce(sum(p.contract_amount), 0) as revenue,
           coalesce(sum(pc.total_cost), 0) as cost,
           coalesce(sum(p.contract_amount - pc.total_cost), 0) as profit,
           count(*)::int as project_count
    from public.projects p
    join public.v_project_costs pc on pc.project_id = p.id
    where ${REVENUE} and p.actual_end_date between ${from} and ${to}
    group by 1
  `);
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return keys.map((month) => byMonth.get(month) ?? { month, revenue: 0, cost: 0, profit: 0, projectCount: 0 });
}

export interface KpiSummary {
  monthRevenue: number;
  monthCost: number;
  monthProfit: number;
  monthCompletedCount: number;
  monthAverageRate: number | null;
  prevMonthRevenue: number;
  yearAverageRate: number | null;
  inProgressCount: number;
  dueThisMonthCount: number;
  dueThisMonthCompleted: number;
  unbilledAmount: number;
  unbilledCount: number;
}

export async function getKpiSummary(db: Db, today: string): Promise<KpiSummary> {
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const prevStart = addMonths(monthStart, -1);
  const prevEnd = endOfMonth(prevStart);
  const yearStart = addMonths(monthStart, -11);

  return db.one<KpiSummary>(sql`
    with revenue as (
      select p.actual_end_date, p.contract_amount, pc.total_cost, pc.profit_rate
      from public.projects p join public.v_project_costs pc on pc.project_id = p.id
      where ${REVENUE}
    )
    select
      (select coalesce(sum(contract_amount), 0) from revenue where actual_end_date between ${monthStart} and ${monthEnd}) as month_revenue,
      (select coalesce(sum(total_cost), 0) from revenue where actual_end_date between ${monthStart} and ${monthEnd}) as month_cost,
      (select coalesce(sum(contract_amount - total_cost), 0) from revenue where actual_end_date between ${monthStart} and ${monthEnd}) as month_profit,
      (select count(*)::int from revenue where actual_end_date between ${monthStart} and ${monthEnd}) as month_completed_count,
      (select round(avg(profit_rate), 1) from revenue where actual_end_date between ${monthStart} and ${monthEnd}) as month_average_rate,
      (select coalesce(sum(contract_amount), 0) from revenue where actual_end_date between ${prevStart} and ${prevEnd}) as prev_month_revenue,
      (select round(avg(profit_rate), 1) from revenue where actual_end_date between ${yearStart} and ${monthEnd}) as year_average_rate,
      (select count(*)::int from public.projects where status = 'in_progress') as in_progress_count,
      (select count(*)::int from public.projects
        where planned_end_date between ${monthStart} and ${monthEnd} and status not in ('estimating', 'lost')) as due_this_month_count,
      (select count(*)::int from public.projects
        where planned_end_date between ${monthStart} and ${monthEnd} and status in ('completed', 'invoiced', 'paid')) as due_this_month_completed,
      (select coalesce(sum(contract_amount), 0) from public.projects where status = 'completed') as unbilled_amount,
      (select count(*)::int from public.projects where status = 'completed') as unbilled_count
  `);
}

export interface TypeRevenue {
  constructionType: ConstructionType;
  revenue: number;
  projectCount: number;
}

export async function getRevenueByType(db: Db, today: string): Promise<TypeRevenue[]> {
  const from = addMonths(startOfMonth(today), -11);
  return db.many<TypeRevenue>(sql`
    select p.construction_type, sum(p.contract_amount) as revenue, count(*)::int as project_count
    from public.projects p
    where ${REVENUE} and p.actual_end_date between ${from} and ${endOfMonth(today)}
    group by p.construction_type
    order by revenue desc
  `);
}

export interface RepRanking {
  employeeId: string;
  name: string;
  revenue: number;
  profit: number;
  projectCount: number;
  profitRate: number | null;
}

export async function getRevenueByRep(db: Db, today: string): Promise<RepRanking[]> {
  const from = addMonths(startOfMonth(today), -11);
  return db.many<RepRanking>(sql`
    select e.id as employee_id, e.last_name || ' ' || e.first_name as name,
           sum(p.contract_amount) as revenue,
           sum(p.contract_amount - pc.total_cost) as profit,
           count(*)::int as project_count,
           round(sum(p.contract_amount - pc.total_cost) * 100.0 / nullif(sum(p.contract_amount), 0), 1) as profit_rate
    from public.projects p
    join public.v_project_costs pc on pc.project_id = p.id
    join public.employees e on e.id = p.sales_rep_id
    where ${REVENUE} and p.actual_end_date between ${from} and ${endOfMonth(today)}
    group by e.id, e.last_name, e.first_name
    order by revenue desc
  `);
}

export interface ProjectMargin {
  id: string;
  projectCode: string;
  name: string;
  customerName: string | null;
  status: ProjectStatus;
  contractAmount: number;
  totalCost: number;
  grossProfit: number;
  profitRate: number;
  actualEndDate: string;
}

/** 直近12ヶ月に完工した案件の利益率（低い順） */
export async function getProjectMargins(db: Db, today: string): Promise<ProjectMargin[]> {
  const from = addMonths(startOfMonth(today), -11);
  return db.many<ProjectMargin>(sql`
    select p.id, p.project_code, p.name, c.name as customer_name, p.status, p.contract_amount,
           pc.total_cost, pc.gross_profit, pc.profit_rate, p.actual_end_date
    from public.projects p
    join public.v_project_costs pc on pc.project_id = p.id
    left join public.customers c on c.id = p.customer_id
    where ${REVENUE} and p.actual_end_date between ${from} and ${endOfMonth(today)} and pc.profit_rate is not null
    order by pc.profit_rate asc
  `);
}

// ---------------------------------------------------------------------------
// 要確認アラート
// ---------------------------------------------------------------------------

export type AlertKind =
  | "overdue"
  | "cost_over"
  | "cost_warning"
  | "unbilled"
  | "attendance_missing"
  | "clock_out_missing"
  | "report_missing";

export interface AlertItem {
  kind: AlertKind;
  title: string;
  detail: string;
  href: string;
  /** 並び替え用（大きいほど重要） */
  weight: number;
}

interface ProjectAlertRow {
  id: string;
  name: string;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  budgetUsageRate: number | null;
  daysOverdue: number;
}

/**
 * 要確認アラートを収集する。projectScope を渡すと対象案件を絞り込む（現場責任者のホーム用）。
 * 金額に関するアラート（原価・未請求）は includeFinancial=true のときのみ。
 */
export async function getAlerts(
  db: Db,
  today: string,
  options: { costAlertPercent: number; includeFinancial: boolean; includeAttendance: boolean; employeeId?: string },
): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  const scope: SqlFragment = options.employeeId
    ? sql`and (p.site_manager_id = ${options.employeeId} or p.sales_rep_id = ${options.employeeId}
              or exists (select 1 from public.project_members m where m.project_id = p.id and m.employee_id = ${options.employeeId}))`
    : sql.empty;

  // 工期超過
  const overdue = await db.many<ProjectAlertRow>(sql`
    select p.id, p.name, p.planned_end_date, p.actual_end_date, null as budget_usage_rate,
           (${today}::date - p.planned_end_date) as days_overdue
    from public.projects p
    where p.status in ('ordered', 'preparing', 'in_progress') and p.planned_end_date < ${today} ${scope}
    order by p.planned_end_date
  `);
  for (const p of overdue) {
    alerts.push({
      kind: "overdue",
      title: p.name,
      detail: `完工予定日を${p.daysOverdue}日超過しています`,
      href: `/projects/${p.id}`,
      weight: 80 + Math.min(p.daysOverdue, 15),
    });
  }

  if (options.includeFinancial) {
    const costs = await db.many<ProjectAlertRow>(sql`
      select p.id, p.name, p.planned_end_date, p.actual_end_date, pc.budget_usage_rate, 0 as days_overdue
      from public.projects p join public.v_project_costs pc on pc.project_id = p.id
      where p.status in ('preparing', 'in_progress', 'completed') and pc.budget_usage_rate >= ${options.costAlertPercent} ${scope}
      order by pc.budget_usage_rate desc
    `);
    for (const p of costs) {
      const over = (p.budgetUsageRate ?? 0) > 100;
      alerts.push({
        kind: over ? "cost_over" : "cost_warning",
        title: p.name,
        detail: over
          ? `原価が予算を超過しています（予算比 ${p.budgetUsageRate?.toFixed(1)}%）`
          : `原価が予算の${options.costAlertPercent}%を超えました（予算比 ${p.budgetUsageRate?.toFixed(1)}%）`,
        href: `/projects/${p.id}?tab=costs`,
        weight: over ? 100 : 70,
      });
    }

    const unbilled = await db.many<ProjectAlertRow>(sql`
      select p.id, p.name, p.planned_end_date, p.actual_end_date, null as budget_usage_rate,
             (${today}::date - p.actual_end_date) as days_overdue
      from public.projects p
      where p.status = 'completed' ${scope}
      order by p.actual_end_date
    `);
    for (const p of unbilled) {
      alerts.push({
        kind: "unbilled",
        title: p.name,
        detail: `完工から${p.daysOverdue}日経過・未請求です`,
        href: `/projects/${p.id}`,
        weight: 60 + Math.min(p.daysOverdue, 30),
      });
    }
  }

  if (options.includeAttendance) {
    const targetDate = previousWeekday(today);
    // 勤怠対象者 = 在籍中で直近30日に勤怠記録がある従業員
    const missing = await db.many<{ id: string; name: string }>(sql`
      select e.id, e.last_name || ' ' || e.first_name as name
      from public.employees e
      where e.employment_status = 'active'
        and exists (select 1 from public.attendance a where a.employee_id = e.id and a.work_date >= ${addDays(today, -30)})
        and not exists (select 1 from public.attendance a where a.employee_id = e.id and a.work_date = ${targetDate})
      order by e.employee_code
    `);
    for (const e of missing) {
      alerts.push({
        kind: "attendance_missing",
        title: e.name,
        detail: `${targetDate.slice(5).replace("-", "/")} の勤怠が未入力です`,
        href: `/attendance/monthly/${e.id}`,
        weight: 40,
      });
    }

    const openRecords = await db.many<{ employeeId: string; name: string; workDate: string }>(sql`
      select a.employee_id, e.last_name || ' ' || e.first_name as name, a.work_date
      from public.attendance a join public.employees e on e.id = a.employee_id
      where a.clock_out is null and a.work_date < ${today} and a.work_date >= ${addDays(today, -14)}
      order by a.work_date desc
    `);
    for (const r of openRecords) {
      alerts.push({
        kind: "clock_out_missing",
        title: r.name,
        detail: `${r.workDate.slice(5).replace("-", "/")} の退勤打刻がありません`,
        href: `/attendance/monthly/${r.employeeId}`,
        weight: 45,
      });
    }
  }

  // 日報未提出: 直近7日で勤怠（現場作業）があるのに日報がない案件×日
  const reportMissing = await db.many<{ projectId: string; name: string; workDate: string; workers: number }>(sql`
    select a.project_id, p.name, a.work_date, count(*)::int as workers
    from public.attendance a
    join public.projects p on p.id = a.project_id
    where a.work_date >= ${addDays(today, -7)} and a.work_date < ${today} ${scope}
      and not exists (
        select 1 from public.daily_reports r where r.project_id = a.project_id and r.report_date = a.work_date
      )
    group by a.project_id, p.name, a.work_date
    order by a.work_date desc
  `);
  for (const r of reportMissing) {
    alerts.push({
      kind: "report_missing",
      title: r.name,
      detail: `${r.workDate.slice(5).replace("-", "/")} の日報が未提出です（作業員${r.workers}名）`,
      href: `/daily-reports/new?projectId=${r.projectId}&date=${r.workDate}`,
      weight: 50,
    });
  }

  return alerts.sort((a, b) => b.weight - a.weight);
}

export interface MyProject {
  id: string;
  projectCode: string;
  name: string;
  customerName: string | null;
  siteAddress: string | null;
  status: ProjectStatus;
  constructionType: ConstructionType;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  siteManagerId: string | null;
  siteManagerName: string | null;
  siteManagerPhone: string | null;
  latestProgress: number | null;
  lastReportDate: string | null;
}

/** 現場スタッフ・現場責任者のホーム用: 担当中の案件 */
export async function listMyActiveProjects(db: Db): Promise<MyProject[]> {
  return db.many<MyProject>(sql`
    select p.id, p.project_code, p.name, c.name as customer_name, p.site_address, p.status, p.construction_type,
           p.planned_start_date, p.planned_end_date, p.actual_start_date, p.site_manager_id,
           sm.last_name || ' ' || sm.first_name as site_manager_name, sm.phone as site_manager_phone,
           lr.progress as latest_progress, lr.report_date as last_report_date
    from public.projects p
    left join public.customers c on c.id = p.customer_id
    left join public.employees sm on sm.id = p.site_manager_id
    left join lateral (
      select r.progress, r.report_date from public.daily_reports r
      where r.project_id = p.id order by r.report_date desc, r.created_at desc limit 1
    ) lr on true
    where p.status in ('ordered', 'preparing', 'in_progress')
    order by case p.status when 'in_progress' then 0 when 'preparing' then 1 else 2 end, p.planned_end_date
  `);
}

export interface CrewAttendance {
  employeeId: string;
  name: string;
  projectName: string | null;
  clockIn: string;
  clockOut: string | null;
}

/** 現場責任者向け: 担当案件の作業員の本日の出勤状況（RLS で担当案件分のみ） */
export async function listTodayCrew(db: Db, today: string): Promise<CrewAttendance[]> {
  return db.many<CrewAttendance>(sql`
    select a.employee_id, e.last_name || ' ' || e.first_name as name, p.name as project_name, a.clock_in, a.clock_out
    from public.attendance a
    join public.employees e on e.id = a.employee_id
    left join public.projects p on p.id = a.project_id
    where a.work_date = ${today}
    order by a.clock_in
  `);
}

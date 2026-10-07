import "server-only";

import type { ConstructionType, CostType, ExpenseCategory, ProjectStatus } from "@/types/domain";

import { sql, type Db, type SqlFragment } from "../db";

export interface ProjectCostSummary {
  id: string;
  projectCode: string;
  name: string;
  customerName: string | null;
  constructionType: ConstructionType;
  status: ProjectStatus;
  contractAmount: number | null;
  budgetCost: number | null;
  laborCost: number;
  materialCost: number;
  outsourcingCost: number;
  expenseCost: number;
  totalCost: number;
  grossProfit: number | null;
  profitRate: number | null;
  budgetUsageRate: number | null;
}

/** 案件別原価一覧（受注済み案件） */
export async function listProjectCostSummaries(
  db: Db,
  filters: { status?: ProjectStatus; scope?: "active" | "all" } = {},
): Promise<ProjectCostSummary[]> {
  const conditions: SqlFragment[] = [sql`p.status not in ('estimating', 'lost')`];
  if (filters.status) conditions.push(sql`p.status = ${filters.status}`);
  if (filters.scope === "active") conditions.push(sql`p.status in ('ordered', 'preparing', 'in_progress', 'completed')`);
  return db.many<ProjectCostSummary>(sql`
    select p.id, p.project_code, p.name, c.name as customer_name, p.construction_type, p.status,
           p.contract_amount, p.budget_cost,
           pc.labor_cost, pc.material_cost, pc.outsourcing_cost, pc.expense_cost, pc.total_cost,
           pc.gross_profit, pc.profit_rate, pc.budget_usage_rate
    from public.projects p
    left join public.customers c on c.id = p.customer_id
    join public.v_project_costs pc on pc.project_id = p.id
    ${sql.where(conditions)}
    order by
      case p.status when 'in_progress' then 0 when 'preparing' then 1 when 'ordered' then 2 when 'completed' then 3 else 4 end,
      pc.budget_usage_rate desc nulls last
  `);
}

export interface CostEntry {
  id: string;
  type: CostType;
  date: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  /** 材料名 / 外注先（経費は null → 費目名を表示） */
  title: string | null;
  /** 仕入先 / 作業内容 / メモ */
  detail: string | null;
  category: ExpenseCategory | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

/** 材料費・外注費・経費を共通の形で新しい順に取得 */
export async function listCostEntries(
  db: Db,
  filters: { type?: CostType; projectId?: string; from?: string; to?: string; limit?: number } = {},
): Promise<CostEntry[]> {
  const parts: SqlFragment[] = [];
  const projectFilter = (column: SqlFragment) =>
    filters.projectId ? sql`and ${column} = ${filters.projectId}` : sql.empty;
  const dateFilter = (column: SqlFragment) =>
    sql`${filters.from ? sql`and ${column} >= ${filters.from}` : sql.empty} ${filters.to ? sql`and ${column} <= ${filters.to}` : sql.empty}`;

  if (!filters.type || filters.type === "material") {
    parts.push(sql`
      select m.id, 'material' as type, m.purchase_date as date, m.project_id, m.name as title, m.supplier as detail,
             null::public.expense_category as category, m.quantity, m.unit, m.unit_price,
             m.amount, m.created_by, m.created_at
      from public.materials m where true ${projectFilter(sql`m.project_id`)} ${dateFilter(sql`m.purchase_date`)}
    `);
  }
  if (!filters.type || filters.type === "outsourcing") {
    parts.push(sql`
      select o.id, 'outsourcing', o.cost_date, o.project_id, o.vendor_name, o.description,
             null, null, null, null, o.amount, o.created_by, o.created_at
      from public.outsourcing_costs o where true ${projectFilter(sql`o.project_id`)} ${dateFilter(sql`o.cost_date`)}
    `);
  }
  if (!filters.type || filters.type === "expense") {
    parts.push(sql`
      select x.id, 'expense', x.expense_date, x.project_id, null, x.memo,
             x.category, null, null, null, x.amount, x.created_by, x.created_at
      from public.expenses x where true ${projectFilter(sql`x.project_id`)} ${dateFilter(sql`x.expense_date`)}
    `);
  }

  return db.many<CostEntry>(sql`
    select u.*, p.project_code, p.name as project_name, e.last_name || ' ' || e.first_name as created_by_name
    from (${sql.join(parts, " union all ")}) u
    join public.projects p on p.id = u.project_id
    left join public.employees e on e.id = u.created_by
    order by u.date desc, u.created_at desc
    limit ${filters.limit ?? 100}
  `);
}

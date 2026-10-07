import "server-only";

import type { ConstructionType, ExpenseCategory, PhotoPhase, ProjectStatus } from "@/types/domain";

import type { CurrentUser } from "../auth/session";
import { sql, type Db } from "../db";

export const PROJECT_SORTS = {
  newest: { label: "登録が新しい順", order: sql`p.created_at desc` },
  start: { label: "着工日が新しい順", order: sql`coalesce(p.actual_start_date, p.planned_start_date) desc nulls last` },
  end: { label: "完工予定が近い順", order: sql`p.planned_end_date asc nulls last` },
  amount: { label: "受注金額が大きい順", order: sql`coalesce(p.contract_amount, p.estimate_amount) desc nulls last` },
  profit: { label: "利益率が低い順", order: sql`pc.profit_rate asc nulls last` },
} as const;
export type ProjectSort = keyof typeof PROJECT_SORTS;

export interface ProjectFilters {
  q?: string;
  status?: ProjectStatus;
  salesRepId?: string;
  type?: ConstructionType;
  from?: string;
  to?: string;
  customerId?: string;
  sort?: ProjectSort;
}

export interface ProjectMoney {
  contractAmount: number | null;
  estimateAmount: number | null;
  budgetCost: number | null;
  totalCost: number | null;
  grossProfit: number | null;
  profitRate: number | null;
  budgetUsageRate: number | null;
}

export interface ProjectListItem extends ProjectMoney {
  id: string;
  projectCode: string;
  name: string;
  customerId: string;
  customerName: string | null;
  siteAddress: string | null;
  constructionType: ConstructionType;
  status: ProjectStatus;
  salesRepName: string | null;
  siteManagerName: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
}

const PROJECT_COLUMNS = sql`
  p.id, p.project_code, p.name, p.customer_id, c.name as customer_name, p.site_address,
  p.construction_type, p.status,
  sr.last_name || ' ' || sr.first_name as sales_rep_name,
  sm.last_name || ' ' || sm.first_name as site_manager_name,
  p.contract_amount, p.estimate_amount, p.budget_cost,
  p.planned_start_date, p.planned_end_date, p.actual_start_date, p.actual_end_date,
  pc.total_cost, pc.gross_profit, pc.profit_rate, pc.budget_usage_rate
`;

const PROJECT_JOINS = sql`
  from public.projects p
  left join public.customers c on c.id = p.customer_id
  left join public.employees sr on sr.id = p.sales_rep_id
  left join public.employees sm on sm.id = p.site_manager_id
  left join public.v_project_costs pc on pc.project_id = p.id
`;

/** 管理者以外には金額情報を渡さない（画面に出さないだけでなくデータとしても除外） */
export function maskMoney<T extends ProjectMoney>(row: T, user: CurrentUser): T {
  if (user.role === "admin") return row;
  return {
    ...row,
    contractAmount: null,
    estimateAmount: null,
    budgetCost: null,
    totalCost: null,
    grossProfit: null,
    profitRate: null,
    budgetUsageRate: null,
  };
}

export async function listProjects(db: Db, user: CurrentUser, filters: ProjectFilters): Promise<ProjectListItem[]> {
  const conditions = [];
  if (filters.q) {
    const like = sql.likeEscape(filters.q);
    conditions.push(sql`(p.name ilike ${like} or c.name ilike ${like} or p.project_code ilike ${like} or p.site_address ilike ${like})`);
  }
  if (filters.status) conditions.push(sql`p.status = ${filters.status}`);
  if (filters.salesRepId) conditions.push(sql`p.sales_rep_id = ${filters.salesRepId}`);
  if (filters.type) conditions.push(sql`p.construction_type = ${filters.type}`);
  if (filters.customerId) conditions.push(sql`p.customer_id = ${filters.customerId}`);
  if (filters.from) conditions.push(sql`coalesce(p.actual_end_date, p.planned_end_date, p.planned_start_date) >= ${filters.from}`);
  if (filters.to) conditions.push(sql`coalesce(p.actual_start_date, p.planned_start_date, p.planned_end_date) <= ${filters.to}`);
  const order = PROJECT_SORTS[filters.sort ?? "newest"].order;

  const rows = await db.many<ProjectListItem>(sql`
    select ${PROJECT_COLUMNS}
    ${PROJECT_JOINS}
    ${sql.where(conditions)}
    order by ${order}, p.project_code desc
  `);
  return rows.map((row) => maskMoney(row, user));
}

export interface ProjectDetail extends ProjectListItem {
  customerCorporateName: string | null;
  customerPhone: string | null;
  customerContactPerson: string | null;
  salesRepId: string | null;
  siteManagerId: string | null;
  siteManagerPhone: string | null;
  contractDate: string | null;
  memo: string | null;
  laborCost: number | null;
  laborMinutes: number;
  materialCost: number | null;
  outsourcingCost: number | null;
  expenseCost: number | null;
  latestProgress: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function getProject(db: Db, user: CurrentUser, id: string): Promise<ProjectDetail | null> {
  const row = await db.maybeOne<ProjectDetail>(sql`
    select ${PROJECT_COLUMNS},
      c.corporate_name as customer_corporate_name, c.phone as customer_phone, c.contact_person as customer_contact_person,
      p.sales_rep_id, p.site_manager_id, sm.phone as site_manager_phone,
      p.contract_date, p.memo, p.created_at, p.updated_at,
      pc.labor_cost, pc.labor_minutes, pc.material_cost, pc.outsourcing_cost, pc.expense_cost,
      (select r.progress from public.daily_reports r where r.project_id = p.id
        order by r.report_date desc, r.created_at desc limit 1) as latest_progress
    ${PROJECT_JOINS}
    where p.id = ${id}
  `);
  if (!row) return null;
  if (user.role === "admin") return row;
  return { ...maskMoney(row, user), laborCost: null, materialCost: null, outsourcingCost: null, expenseCost: null };
}

export interface ProjectMember {
  employeeId: string;
  name: string;
  position: string | null;
  phone: string | null;
  isSiteManager: boolean;
}

export async function listProjectMembers(db: Db, projectId: string): Promise<ProjectMember[]> {
  return db.many<ProjectMember>(sql`
    select e.id as employee_id, e.last_name || ' ' || e.first_name as name, e.position, e.phone,
           (e.id = p.site_manager_id) as is_site_manager
    from public.projects p
    join public.employees e
      on e.id = p.site_manager_id
      or e.id in (select m.employee_id from public.project_members m where m.project_id = p.id)
    where p.id = ${projectId}
    order by (e.id = p.site_manager_id) desc, e.employee_code
  `);
}

export interface ProjectAttendanceRow {
  id: string;
  workDate: string;
  employeeName: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  workMinutes: number | null;
  overtimeMinutes: number | null;
  laborCost: number | null;
}

export async function listProjectAttendance(db: Db, projectId: string): Promise<ProjectAttendanceRow[]> {
  return db.many<ProjectAttendanceRow>(sql`
    select a.id, a.work_date, e.last_name || ' ' || e.first_name as employee_name,
           a.clock_in, a.clock_out, a.break_minutes, a.work_minutes, a.overtime_minutes, a.labor_cost
    from public.v_attendance a
    join public.employees e on e.id = a.employee_id
    where a.project_id = ${projectId}
    order by a.work_date desc, e.employee_code
  `);
}

export interface MaterialRow {
  id: string;
  projectId: string;
  purchaseDate: string;
  name: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;
  supplier: string | null;
  memo: string | null;
  createdBy: string | null;
  createdByName: string | null;
}

export interface OutsourcingRow {
  id: string;
  projectId: string;
  costDate: string;
  vendorName: string;
  description: string;
  amount: number;
  memo: string | null;
  createdBy: string | null;
  createdByName: string | null;
}

export interface ExpenseRow {
  id: string;
  projectId: string;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  memo: string | null;
  createdBy: string | null;
  createdByName: string | null;
}

export async function listProjectCostEntries(db: Db, projectId: string) {
  const [materials, outsourcing, expenses] = [
    await db.many<MaterialRow>(sql`
      select m.id, m.project_id, m.purchase_date, m.name, m.quantity, m.unit, m.unit_price, m.amount, m.supplier, m.memo,
             m.created_by, e.last_name || ' ' || e.first_name as created_by_name
      from public.materials m left join public.employees e on e.id = m.created_by
      where m.project_id = ${projectId}
      order by m.purchase_date desc, m.created_at desc
    `),
    await db.many<OutsourcingRow>(sql`
      select o.id, o.project_id, o.cost_date, o.vendor_name, o.description, o.amount, o.memo,
             o.created_by, e.last_name || ' ' || e.first_name as created_by_name
      from public.outsourcing_costs o left join public.employees e on e.id = o.created_by
      where o.project_id = ${projectId}
      order by o.cost_date desc, o.created_at desc
    `),
    await db.many<ExpenseRow>(sql`
      select x.id, x.project_id, x.expense_date, x.category, x.amount, x.memo,
             x.created_by, e.last_name || ' ' || e.first_name as created_by_name
      from public.expenses x left join public.employees e on e.id = x.created_by
      where x.project_id = ${projectId}
      order by x.expense_date desc, x.created_at desc
    `),
  ];
  return { materials, outsourcing, expenses };
}

export interface PhotoRow {
  id: string;
  projectId: string;
  dailyReportId: string | null;
  phase: PhotoPhase;
  caption: string | null;
  fileName: string | null;
  createdAt: string;
  uploadedBy: string | null;
  uploadedByName: string | null;
}

export async function listProjectPhotos(db: Db, projectId: string): Promise<PhotoRow[]> {
  return db.many<PhotoRow>(sql`
    select ph.id, ph.project_id, ph.daily_report_id, ph.phase, ph.caption, ph.file_name, ph.created_at,
           ph.uploaded_by, e.last_name || ' ' || e.first_name as uploaded_by_name
    from public.project_photos ph
    left join public.employees e on e.id = ph.uploaded_by
    where ph.project_id = ${projectId}
    order by case ph.phase when 'before' then 0 when 'during' then 1 else 2 end, ph.created_at
  `);
}

/** 案件フォーム（編集）用の生データ */
export interface ProjectFormValues {
  id: string;
  projectCode: string;
  name: string;
  customerId: string;
  siteAddress: string | null;
  constructionType: ConstructionType;
  salesRepId: string | null;
  siteManagerId: string | null;
  contractAmount: number | null;
  estimateAmount: number | null;
  budgetCost: number | null;
  contractDate: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  status: ProjectStatus;
  memo: string | null;
  memberIds: string[];
}

export async function getProjectFormValues(db: Db, id: string): Promise<ProjectFormValues | null> {
  const row = await db.maybeOne<Omit<ProjectFormValues, "memberIds">>(sql`
    select id, project_code, name, customer_id, site_address, construction_type, sales_rep_id, site_manager_id,
           contract_amount, estimate_amount, budget_cost, contract_date, planned_start_date, planned_end_date,
           actual_start_date, actual_end_date, status, memo
    from public.projects where id = ${id}
  `);
  if (!row) return null;
  const members = await db.many<{ employeeId: string }>(sql`
    select employee_id from public.project_members where project_id = ${id}
  `);
  return { ...row, memberIds: members.map((m) => m.employeeId) };
}

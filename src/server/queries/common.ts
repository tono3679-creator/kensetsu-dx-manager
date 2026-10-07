import "server-only";

import type { AppRole, ConstructionType, ProjectStatus } from "@/types/domain";

import { sql, type Db } from "../db";

export interface Settings {
  companyName: string;
  standardWorkMinutes: number;
  defaultBreakMinutes: number;
  costAlertPercent: number;
}

export async function getSettings(db: Db): Promise<Settings> {
  const row = await db.maybeOne<Settings>(sql`
    select company_name, standard_work_minutes, default_break_minutes, cost_alert_percent
    from public.settings where id = 1
  `);
  return (
    row ?? { companyName: "（会社名未設定）", standardWorkMinutes: 480, defaultBreakMinutes: 60, costAlertPercent: 90 }
  );
}

export interface EmployeeOption {
  id: string;
  name: string;
  role: AppRole;
  departmentName: string | null;
}

/** 選択肢用の在籍従業員一覧 */
export async function listEmployeeOptions(db: Db, options: { includeInactive?: boolean } = {}): Promise<EmployeeOption[]> {
  return db.many<EmployeeOption>(sql`
    select e.id, e.last_name || ' ' || e.first_name as name, e.role, d.name as department_name
    from public.employees e
    left join public.departments d on d.id = e.department_id
    ${options.includeInactive ? sql.empty : sql`where e.employment_status = 'active'`}
    order by d.sort_order nulls last, e.employee_code
  `);
}

export interface ProjectOption {
  id: string;
  projectCode: string;
  name: string;
  status: ProjectStatus;
  constructionType: ConstructionType;
  customerName: string | null;
}

/**
 * 選択肢用の案件一覧（RLS によりアクセス可能な案件のみ）。
 * activeOnly の場合は着工前〜完工（日報・勤怠・原価の登録対象）に限定する。
 */
export async function listProjectOptions(db: Db, options: { activeOnly?: boolean } = {}): Promise<ProjectOption[]> {
  return db.many<ProjectOption>(sql`
    select p.id, p.project_code, p.name, p.status, p.construction_type, c.name as customer_name
    from public.projects p
    left join public.customers c on c.id = p.customer_id
    ${options.activeOnly ? sql`where p.status in ('ordered', 'preparing', 'in_progress', 'completed')` : sql.empty}
    order by
      case p.status when 'in_progress' then 0 when 'preparing' then 1 when 'ordered' then 2 when 'completed' then 3 else 4 end,
      p.project_code desc
  `);
}

export interface CustomerOption {
  id: string;
  name: string;
}

export async function listCustomerOptions(db: Db): Promise<CustomerOption[]> {
  return db.many<CustomerOption>(sql`select id, name from public.customers order by customer_code`);
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export async function listDepartments(db: Db): Promise<DepartmentOption[]> {
  return db.many<DepartmentOption>(sql`select id, name from public.departments order by sort_order, name`);
}

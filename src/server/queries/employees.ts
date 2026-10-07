import "server-only";

import { monthRange } from "@/lib/date";
import type { AppRole, EmploymentStatus, ProjectStatus } from "@/types/domain";

import { sql, type Db } from "../db";

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  name: string;
  kana: string | null;
  email: string;
  phone: string | null;
  departmentName: string | null;
  position: string | null;
  role: AppRole;
  hourlyCost: number | null;
  hireDate: string | null;
  employmentStatus: EmploymentStatus;
  monthMinutes: number;
  hasLogin: boolean;
}

/** 従業員一覧（時間原価は RLS により管理者のみ値が入る） */
export async function listEmployees(
  db: Db,
  options: { month: string; q?: string; status?: EmploymentStatus },
): Promise<EmployeeListItem[]> {
  const { start, end } = monthRange(options.month);
  const conditions = [];
  if (options.status) conditions.push(sql`e.employment_status = ${options.status}`);
  if (options.q) {
    const like = sql.likeEscape(options.q);
    conditions.push(
      sql`(e.last_name || e.first_name ilike ${like} or coalesce(e.last_name_kana, '') || coalesce(e.first_name_kana, '') ilike ${like} or e.email ilike ${like} or e.employee_code ilike ${like})`,
    );
  }
  return db.many<EmployeeListItem>(sql`
    select e.id, e.employee_code, e.last_name || ' ' || e.first_name as name,
           nullif(concat_ws(' ', e.last_name_kana, e.first_name_kana), '') as kana,
           e.email, e.phone, d.name as department_name, e.position, e.role, r.hourly_cost,
           e.hire_date, e.employment_status,
           coalesce((select sum(a.work_minutes) from public.attendance a
                     where a.employee_id = e.id and a.work_date between ${start} and ${end}), 0)::int as month_minutes,
           exists (select 1 from public.users u where u.employee_id = e.id) as has_login
    from public.employees e
    left join public.departments d on d.id = e.department_id
    left join public.employee_cost_rates r on r.employee_id = e.id
    ${sql.where(conditions)}
    order by case e.employment_status when 'active' then 0 when 'on_leave' then 1 else 2 end,
             d.sort_order nulls last, e.employee_code
  `);
}

export interface EmployeeDetail extends EmployeeListItem {
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  departmentId: string | null;
}

export async function getEmployee(db: Db, id: string): Promise<EmployeeDetail | null> {
  return db.maybeOne<EmployeeDetail>(sql`
    select e.id, e.employee_code, e.last_name, e.first_name, e.last_name_kana, e.first_name_kana,
           e.last_name || ' ' || e.first_name as name,
           nullif(concat_ws(' ', e.last_name_kana, e.first_name_kana), '') as kana,
           e.email, e.phone, e.department_id, d.name as department_name, e.position, e.role, r.hourly_cost,
           e.hire_date, e.employment_status, 0 as month_minutes,
           exists (select 1 from public.users u where u.employee_id = e.id) as has_login
    from public.employees e
    left join public.departments d on d.id = e.department_id
    left join public.employee_cost_rates r on r.employee_id = e.id
    where e.id = ${id}
  `);
}

export interface EmployeeProject {
  id: string;
  projectCode: string;
  name: string;
  status: ProjectStatus;
  roleInProject: "site_manager" | "sales_rep" | "member";
  plannedEndDate: string | null;
}

export async function listEmployeeProjects(db: Db, employeeId: string): Promise<EmployeeProject[]> {
  return db.many<EmployeeProject>(sql`
    select p.id, p.project_code, p.name, p.status, p.planned_end_date,
           case when p.site_manager_id = ${employeeId} then 'site_manager'
                when p.sales_rep_id = ${employeeId} then 'sales_rep'
                else 'member' end as role_in_project
    from public.projects p
    where p.site_manager_id = ${employeeId} or p.sales_rep_id = ${employeeId}
       or exists (select 1 from public.project_members m where m.project_id = p.id and m.employee_id = ${employeeId})
    order by case p.status when 'in_progress' then 0 when 'preparing' then 1 when 'ordered' then 2 else 3 end,
             coalesce(p.actual_end_date, p.planned_end_date) desc nulls last
    limit 30
  `);
}

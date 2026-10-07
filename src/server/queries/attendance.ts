import "server-only";

import { addDays, monthRange } from "@/lib/date";
import type { AppRole } from "@/types/domain";

import { sql, type Db } from "../db";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  workDate: string;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  workMinutes: number | null;
  overtimeMinutes: number | null;
  laborCost: number | null;
  note: string | null;
}

const RECORD_COLUMNS = sql`
  a.id, a.employee_id, a.work_date, a.project_id, p.name as project_name, p.project_code,
  a.clock_in, a.clock_out, a.break_minutes, a.work_minutes, a.overtime_minutes, a.labor_cost, a.note
`;

/** 打刻画面用: 今日の記録と、前日の退勤漏れ */
export async function getClockStatus(db: Db, employeeId: string, today: string) {
  const rows = await db.many<AttendanceRecord>(sql`
    select ${RECORD_COLUMNS}
    from public.v_attendance a left join public.projects p on p.id = a.project_id
    where a.employee_id = ${employeeId} and a.work_date between ${addDays(today, -1)} and ${today}
    order by a.work_date desc
  `);
  const todayRecord = rows.find((r) => r.workDate === today) ?? null;
  const yesterdayOpen = rows.find((r) => r.workDate !== today && r.clockOut === null) ?? null;
  return { today: todayRecord, yesterdayOpen };
}

export async function listEmployeeAttendance(db: Db, employeeId: string, month: string): Promise<AttendanceRecord[]> {
  const { start, end } = monthRange(month);
  return db.many<AttendanceRecord>(sql`
    select ${RECORD_COLUMNS}
    from public.v_attendance a left join public.projects p on p.id = a.project_id
    where a.employee_id = ${employeeId} and a.work_date between ${start} and ${end}
    order by a.work_date desc
  `);
}

export interface AttendanceTotals {
  workDays: number;
  totalMinutes: number;
  overtimeMinutes: number;
  missingClockOut: number;
}

/** 勤怠の集計。退勤打刻漏れは前日以前の未退勤のみ（当日の勤務中は含めない） */
export function summarize(records: AttendanceRecord[], today: string): AttendanceTotals {
  return {
    workDays: records.length,
    totalMinutes: records.reduce((s, r) => s + (r.workMinutes ?? 0), 0),
    overtimeMinutes: records.reduce((s, r) => s + (r.overtimeMinutes ?? 0), 0),
    missingClockOut: records.filter((r) => r.clockOut === null && r.workDate < today).length,
  };
}

export interface MonthlySummaryRow extends AttendanceTotals {
  employeeId: string;
  employeeCode: string;
  name: string;
  role: AppRole;
  departmentName: string | null;
  laborCost: number;
  projects: Array<{ projectId: string | null; projectName: string | null; minutes: number }>;
}

/** 月次勤怠: 従業員ごとの出勤日数・総労働時間・残業時間・案件別作業時間 */
export async function getMonthlySummary(db: Db, month: string, today: string): Promise<MonthlySummaryRow[]> {
  const { start, end } = monthRange(month);
  const rows = await db.many<Omit<MonthlySummaryRow, "projects">>(sql`
    select e.id as employee_id, e.employee_code, e.last_name || ' ' || e.first_name as name, e.role,
           d.name as department_name,
           count(a.id)::int as work_days,
           coalesce(sum(a.work_minutes), 0)::int as total_minutes,
           coalesce(sum(a.overtime_minutes), 0)::int as overtime_minutes,
           count(a.id) filter (where a.clock_out is null and a.work_date < ${today})::int as missing_clock_out,
           coalesce(sum(a.labor_cost), 0) as labor_cost
    from public.employees e
    left join public.departments d on d.id = e.department_id
    left join public.v_attendance a on a.employee_id = e.id and a.work_date between ${start} and ${end}
    where e.employment_status = 'active' or a.id is not null
    group by e.id, e.employee_code, e.last_name, e.first_name, e.role, d.name, d.sort_order
    order by d.sort_order nulls last, e.employee_code
  `);
  const breakdown = await db.many<{ employeeId: string; projectId: string | null; projectName: string | null; minutes: number }>(sql`
    select a.employee_id, a.project_id, p.name as project_name, sum(a.work_minutes)::int as minutes
    from public.v_attendance a left join public.projects p on p.id = a.project_id
    where a.work_date between ${start} and ${end} and a.work_minutes is not null
    group by a.employee_id, a.project_id, p.name
    order by minutes desc
  `);
  return rows.map((row) => ({
    ...row,
    projects: breakdown
      .filter((b) => b.employeeId === row.employeeId)
      .map(({ projectId, projectName, minutes }) => ({ projectId, projectName, minutes })),
  }));
}

export interface AttendanceEditValues {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  projectId: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  note: string | null;
}

export async function getAttendanceRecord(db: Db, id: string): Promise<AttendanceEditValues | null> {
  return db.maybeOne<AttendanceEditValues>(sql`
    select a.id, a.employee_id, e.last_name || ' ' || e.first_name as employee_name, a.work_date, a.project_id,
           a.clock_in, a.clock_out, a.break_minutes, a.note
    from public.attendance a join public.employees e on e.id = a.employee_id
    where a.id = ${id}
  `);
}

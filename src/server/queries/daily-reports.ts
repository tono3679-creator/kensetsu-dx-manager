import "server-only";

import type { PhotoPhase } from "@/types/domain";

import { sql, type Db, type SqlFragment } from "../db";

export interface DailyReportWorker {
  employeeId: string;
  name: string;
}

export interface DailyReportMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
}

export interface DailyReportPhoto {
  id: string;
  phase: PhotoPhase;
  caption: string | null;
}

export interface DailyReport {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  reportDate: string;
  authorId: string;
  authorName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workContent: string;
  progress: number;
  issues: string | null;
  tomorrowPlan: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workers: DailyReportWorker[];
  materials: DailyReportMaterial[];
  photos: DailyReportPhoto[];
}

type DailyReportBase = Omit<DailyReport, "workers" | "materials" | "photos">;

async function loadReports(db: Db, where: SqlFragment, limit: number | null, offset = 0): Promise<DailyReport[]> {
  const base = await db.many<DailyReportBase>(sql`
    select r.id, r.project_id, p.project_code, p.name as project_name, r.report_date, r.author_id,
           a.last_name || ' ' || a.first_name as author_name, r.start_time, r.end_time, r.break_minutes,
           r.work_content, r.progress, r.issues, r.tomorrow_plan, r.notes, r.created_at, r.updated_at
    from public.daily_reports r
    join public.projects p on p.id = r.project_id
    join public.employees a on a.id = r.author_id
    ${where}
    order by r.report_date desc, r.created_at desc
    ${limit ? sql`limit ${limit} offset ${offset}` : sql.empty}
  `);
  if (base.length === 0) return [];

  const ids = base.map((r) => r.id);
  const [workers, materials, photos] = [
    await db.many<DailyReportWorker & { dailyReportId: string }>(sql`
      select w.daily_report_id, e.id as employee_id, e.last_name || ' ' || e.first_name as name
      from public.daily_report_workers w join public.employees e on e.id = w.employee_id
      where ${sql.inList(sql`w.daily_report_id`, ids)}
      order by e.employee_code
    `),
    await db.many<DailyReportMaterial & { dailyReportId: string }>(sql`
      select m.daily_report_id, m.id, m.name, m.quantity, m.unit
      from public.daily_report_materials m
      where ${sql.inList(sql`m.daily_report_id`, ids)}
      order by m.sort_order
    `),
    await db.many<DailyReportPhoto & { dailyReportId: string }>(sql`
      select ph.daily_report_id, ph.id, ph.phase, ph.caption
      from public.project_photos ph
      where ${sql.inList(sql`ph.daily_report_id`, ids)}
      order by case ph.phase when 'before' then 0 when 'during' then 1 else 2 end, ph.created_at
    `),
  ];

  const group = <T extends { dailyReportId: string }>(rows: T[]) => {
    const map = new Map<string, Omit<T, "dailyReportId">[]>();
    for (const { dailyReportId, ...rest } of rows) {
      map.set(dailyReportId, [...(map.get(dailyReportId) ?? []), rest]);
    }
    return map;
  };
  const workersBy = group(workers);
  const materialsBy = group(materials);
  const photosBy = group(photos);

  return base.map((r) => ({
    ...r,
    workers: workersBy.get(r.id) ?? [],
    materials: materialsBy.get(r.id) ?? [],
    photos: photosBy.get(r.id) ?? [],
  }));
}

export interface DailyReportFilters {
  projectId?: string;
  authorId?: string;
  from?: string;
  to?: string;
  q?: string;
}

function reportConditions(filters: DailyReportFilters): SqlFragment[] {
  const conditions: SqlFragment[] = [];
  if (filters.projectId) conditions.push(sql`r.project_id = ${filters.projectId}`);
  if (filters.authorId) conditions.push(sql`r.author_id = ${filters.authorId}`);
  if (filters.from) conditions.push(sql`r.report_date >= ${filters.from}`);
  if (filters.to) conditions.push(sql`r.report_date <= ${filters.to}`);
  if (filters.q) {
    const like = sql.likeEscape(filters.q);
    conditions.push(sql`(r.work_content ilike ${like} or r.issues ilike ${like} or p.name ilike ${like})`);
  }
  return conditions;
}

export async function listDailyReports(db: Db, filters: DailyReportFilters, limit = 100, offset = 0): Promise<DailyReport[]> {
  return loadReports(db, sql.where(reportConditions(filters)), limit, offset);
}

export async function listProjectReports(db: Db, projectId: string): Promise<DailyReport[]> {
  return loadReports(db, sql`where r.project_id = ${projectId}`, null);
}

export async function getDailyReport(db: Db, id: string): Promise<DailyReport | null> {
  const [report] = await loadReports(db, sql`where r.id = ${id}`, 1);
  return report ?? null;
}

export async function countDailyReports(db: Db, filters: DailyReportFilters): Promise<number> {
  const row = await db.one<{ count: number }>(sql`
    select count(*)::int as count
    from public.daily_reports r join public.projects p on p.id = r.project_id
    ${sql.where(reportConditions(filters))}
  `);
  return row.count;
}

/** 日報フォームで案件を選んだときに作業者候補を出すための、案件 → メンバー一覧 */
export async function listProjectWorkerMap(db: Db, projectIds: string[]): Promise<Record<string, DailyReportWorker[]>> {
  const rows = await db.many<DailyReportWorker & { projectId: string }>(sql`
    select p.id as project_id, e.id as employee_id, e.last_name || ' ' || e.first_name as name
    from public.projects p
    join public.employees e
      on e.id = p.site_manager_id
      or e.id in (select m.employee_id from public.project_members m where m.project_id = p.id)
    where ${sql.inList(sql`p.id`, projectIds)} and e.employment_status = 'active'
    order by e.employee_code
  `);
  const map: Record<string, DailyReportWorker[]> = {};
  for (const { projectId, ...worker } of rows) (map[projectId] ??= []).push(worker);
  return map;
}

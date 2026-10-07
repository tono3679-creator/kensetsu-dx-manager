/**
 * 開発用: デモDB（PGlite）を起動し、マイグレーション・RLS・Seed の整合性を確認する。
 *   npm run demo:check
 */
import { DEMO_AUTH_USER_IDS } from "../src/server/seed/master-data";
import { seedDemoDatabase } from "../src/server/db";
import { createPgliteDatabase } from "../src/server/db/pglite";
import { sql } from "../src/server/db/sql";

async function main() {
  const t0 = Date.now();
  const database = await createPgliteDatabase({ onInitialize: seedDemoDatabase });
  console.log(`起動 + Seed: ${Date.now() - t0}ms`);

  const counts = await database.asSystem((db) =>
    db.many<{ table: string; count: number }>(sql`
      select 'projects' as table, count(*)::int as count from public.projects
      union all select 'employees', count(*)::int from public.employees
      union all select 'customers', count(*)::int from public.customers
      union all select 'attendance', count(*)::int from public.attendance
      union all select 'daily_reports', count(*)::int from public.daily_reports
      union all select 'materials', count(*)::int from public.materials
      union all select 'outsourcing_costs', count(*)::int from public.outsourcing_costs
      union all select 'expenses', count(*)::int from public.expenses
      union all select 'project_photos', count(*)::int from public.project_photos
    `),
  );
  console.table(counts);

  const active = await database.asUser(DEMO_AUTH_USER_IDS.admin, (db) =>
    db.many<{ name: string; reports: number; attendance: number; lastReport: string | null; progress: number | null; usage: number | null }>(sql`
      select p.name,
        (select count(*)::int from public.daily_reports r where r.project_id = p.id) as reports,
        (select count(*)::int from public.attendance a where a.project_id = p.id) as attendance,
        (select max(report_date)::text from public.daily_reports r where r.project_id = p.id) as last_report,
        (select r.progress from public.daily_reports r where r.project_id = p.id order by r.report_date desc limit 1) as progress,
        c.budget_usage_rate as usage
      from public.projects p join public.v_project_costs c on c.project_id = p.id
      where p.status = 'in_progress'
    `),
  );
  console.table(active.map((a) => ({ ...a, name: a.name.slice(0, 20) })));

  for (const role of ["admin", "manager", "staff"] as const) {
    const visible = await database.asUser(DEMO_AUTH_USER_IDS[role], (db) =>
      db.one<{ projects: number; attendance: number; reports: number; rates: number; materials: number }>(sql`
        select
          (select count(*)::int from public.projects) as projects,
          (select count(*)::int from public.attendance) as attendance,
          (select count(*)::int from public.daily_reports) as reports,
          (select count(*)::int from public.employee_cost_rates) as rates,
          (select count(*)::int from public.materials) as materials
      `),
    );
    console.log(role.padEnd(8), visible);
  }
  await database.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

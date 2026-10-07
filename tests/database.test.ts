/**
 * 実際の PostgreSQL（PGlite）にマイグレーション・RLS・Seed を適用して検証する統合テスト。
 * 本番（Supabase）と同じ SQL・ポリシーがそのまま使われる。
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { calcWorkMinutes } from "@/lib/attendance";
import { addDays, todayJst } from "@/lib/date";
import { calcLaborCost, calcMaterialAmount, calcProfitRate } from "@/lib/money";
import type { Database } from "@/server/db/db";
import { createPgliteDatabase } from "@/server/db/pglite";
import { sql } from "@/server/db/sql";
import { applySeed } from "@/server/seed/apply";
import { generateSeedData, type SeedDataset } from "@/server/seed/generate";
import { DEMO_AUTH_USER_IDS } from "@/server/seed/master-data";
import { PROJECT_SPECS } from "@/server/seed/project-specs";

const TODAY = todayJst();
let database: Database;
let data: SeedDataset;

beforeAll(async () => {
  data = generateSeedData({ today: TODAY, now: new Date(`${TODAY}T01:00:00Z`) });
  database = await createPgliteDatabase({
    onInitialize: (db) =>
      db.asSystem((tx) =>
        applySeed(tx, data, { localAuthUsers: data.authUsers.map((u) => ({ id: u.id, email: u.email, passwordHash: "x" })) }),
      ),
  });
});

afterAll(async () => {
  await database?.close();
});

const asAdmin = <T>(fn: Parameters<Database["asUser"]>[1]) => database.asUser(DEMO_AUTH_USER_IDS.admin, fn) as Promise<T>;

describe("デモデータ（Seed）", () => {
  it("要件の件数を満たす", () => {
    expect(data.employees.length).toBeGreaterThanOrEqual(10);
    expect(data.customers.length).toBeGreaterThanOrEqual(15);
    expect(data.projects.length).toBeGreaterThanOrEqual(20);
    expect(data.dailyReports.length).toBeGreaterThanOrEqual(30);
    const days = new Set(data.attendance.map((a) => a.work_date));
    expect(days.size).toBeGreaterThanOrEqual(20); // 1ヶ月分以上
  });

  it("完工案件の実績原価はシナリオで狙った金額と一致する（さくら内科 空調: 原価 4,060,000円・利益率 30.0%）", async () => {
    const rows = await asAdmin<Array<{ projectCode: string; name: string; totalCost: number; profitRate: number }>>((db) =>
      db.many(sql`
        select p.project_code, p.name, c.total_cost, c.profit_rate
        from public.projects p join public.v_project_costs c on c.project_id = p.id
        where p.status in ('completed', 'invoiced', 'paid')
      `),
    );
    for (const spec of PROJECT_SPECS.filter((s) => s.timing.kind === "done")) {
      const row = rows.find((r) => r.name === spec.name)!;
      expect(row.totalCost, spec.name).toBe(data.targetCosts[spec.key]);
    }
    const sakura = rows.find((r) => r.name === "さくら内科クリニック 空調設備更新工事")!;
    expect(sakura.totalCost).toBe(4_060_000);
    expect(sakura.profitRate).toBe(30);
  });
});

describe("原価計算（SQL ビューと TypeScript の計算が一致する）", () => {
  it("材料費の生成列 = 数量 × 単価（円未満四捨五入）", async () => {
    const rows = await asAdmin<Array<{ quantity: number; unitPrice: number; amount: number }>>((db) =>
      db.many(sql`select quantity, unit_price, amount from public.materials`),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.amount).toBe(calcMaterialAmount(String(r.quantity), String(r.unitPrice)));
  });

  it("勤怠の実働時間（生成列）= 退勤 - 出勤 - 休憩", async () => {
    const rows = await asAdmin<Array<{ clockIn: string; clockOut: string | null; breakMinutes: number; workMinutes: number | null }>>(
      (db) => db.many(sql`select clock_in, clock_out, break_minutes, work_minutes from public.attendance`),
    );
    for (const r of rows) expect(r.workMinutes).toBe(calcWorkMinutes(r.clockIn, r.clockOut, r.breakMinutes));
  });

  it("案件別の総原価・粗利益・利益率を独立に再計算して一致する", async () => {
    const result = await asAdmin<{
      projects: Array<{ id: string; contractAmount: number | null; totalCost: number; laborCost: number; grossProfit: number | null; profitRate: number | null }>;
      attendance: Array<{ projectId: string | null; employeeId: string; workMinutes: number | null }>;
      rates: Array<{ employeeId: string; hourlyCost: number }>;
      costs: Array<{ projectId: string; amount: number }>;
    }>(async (db) => ({
      projects: await db.many(sql`
        select p.id, p.contract_amount, c.total_cost, c.labor_cost, c.gross_profit, c.profit_rate
        from public.projects p join public.v_project_costs c on c.project_id = p.id
      `),
      attendance: await db.many(sql`select project_id, employee_id, work_minutes from public.attendance`),
      rates: await db.many(sql`select employee_id, hourly_cost from public.employee_cost_rates`),
      costs: await db.many(sql`
        select project_id, amount from public.materials
        union all select project_id, amount from public.outsourcing_costs
        union all select project_id, amount from public.expenses
      `),
    }));
    const rate = new Map(result.rates.map((r) => [r.employeeId, r.hourlyCost]));

    for (const p of result.projects) {
      const labor = result.attendance
        .filter((a) => a.projectId === p.id && a.workMinutes !== null)
        .reduce((s, a) => s + calcLaborCost(rate.get(a.employeeId)!, a.workMinutes!), 0);
      const others = result.costs.filter((c) => c.projectId === p.id).reduce((s, c) => s + c.amount, 0);
      expect(p.laborCost).toBe(labor);
      expect(p.totalCost).toBe(labor + others);
      if (p.contractAmount !== null) {
        expect(p.grossProfit).toBe(p.contractAmount - p.totalCost);
        expect(p.profitRate).toBe(calcProfitRate(p.contractAmount, p.totalCost));
      }
    }
  });
});

describe("行レベルセキュリティ（RLS）", () => {
  const staff = DEMO_AUTH_USER_IDS.staff;
  const manager = DEMO_AUTH_USER_IDS.manager;

  it("未認証（ユーザーID が users に存在しない）は何も参照できない", async () => {
    const count = await database.asUser("99999999-9999-4999-8999-999999999999", (db) =>
      db.one<{ projects: number; employees: number }>(sql`
        select (select count(*)::int from public.projects) as projects, (select count(*)::int from public.employees) as employees
      `),
    );
    expect(count).toEqual({ projects: 0, employees: 0 });
  });

  it("一般スタッフ: 担当現場のみ閲覧・自分の勤怠のみ・時間原価と原価明細は参照不可", async () => {
    const result = await database.asUser(staff, async (db) => ({
      self: await db.one<{ id: string }>(sql`select employee_id as id from public.users where id = auth.uid()`),
      projects: await db.many<{ id: string; accessible: boolean }>(sql`
        select p.id, exists (
          select 1 from public.project_members m
          join public.users u on u.employee_id = m.employee_id
          where m.project_id = p.id and u.id = auth.uid()
        ) as accessible
        from public.projects p
      `),
      attendanceOwners: await db.many<{ employeeId: string }>(sql`select distinct employee_id from public.attendance`),
      rates: await db.one<{ count: number }>(sql`select count(*)::int as count from public.employee_cost_rates`),
      materials: await db.one<{ count: number }>(sql`select count(*)::int as count from public.materials`),
    }));
    expect(result.projects.length).toBeGreaterThan(0);
    expect(result.projects.length).toBeLessThan(data.projects.length);
    expect(result.attendanceOwners).toEqual([{ employeeId: result.self.id }]);
    expect(result.rates.count).toBe(0);
    expect(result.materials.count).toBe(0);
  });

  it("一般スタッフ: 材料費の登録・案件の更新・3日前の勤怠登録はできない", async () => {
    const project = await asAdmin<{ id: string }>((db) => db.one(sql`select id from public.projects limit 1`));
    await expect(
      database.asUser(staff, (db) =>
        db.execute(sql`insert into public.materials (project_id, purchase_date, name, quantity, unit_price) values (${project.id}, ${TODAY}, 'x', 1, 1)`),
      ),
    ).rejects.toMatchObject({ code: "42501" });

    const updated = await database.asUser(staff, (db) => db.execute(sql`update public.projects set name = 'hacked'`));
    expect(updated).toBe(0);

    await expect(
      database.asUser(staff, async (db) => {
        const me = await db.one<{ id: string }>(sql`select employee_id as id from public.users where id = auth.uid()`);
        return db.execute(sql`
          insert into public.attendance (employee_id, work_date, clock_in)
          values (${me.id}, ${addDays(TODAY, -3)}, now() - interval '3 days')
        `);
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("現場責任者: 担当案件には経費を登録でき、担当外の案件には登録できない・案件は編集できない", async () => {
    const { own, other, me } = await database.asUser(manager, async (db) => {
      const me = await db.one<{ id: string }>(sql`select employee_id as id from public.users where id = auth.uid()`);
      const own = await db.one<{ id: string }>(sql`select id from public.projects where site_manager_id = ${me.id} limit 1`);
      return { me, own, other: null as { id: string } | null };
    });
    const otherProject = await asAdmin<{ id: string }>((db) =>
      db.one(sql`
        select p.id from public.projects p
        where p.site_manager_id <> ${me.id} and p.sales_rep_id <> ${me.id}
          and not exists (select 1 from public.project_members m where m.project_id = p.id and m.employee_id = ${me.id})
        limit 1
      `),
    );
    expect(other).toBeNull();

    const inserted = await database.asUser(manager, (db) =>
      db.execute(sql`
        insert into public.expenses (project_id, expense_date, category, amount, created_by)
        values (${own.id}, ${TODAY}, 'parking', 1200, ${me.id})
      `),
    );
    expect(inserted).toBe(1);

    await expect(
      database.asUser(manager, (db) =>
        db.execute(sql`
          insert into public.expenses (project_id, expense_date, category, amount, created_by)
          values (${otherProject.id}, ${TODAY}, 'parking', 1200, ${me.id})
        `),
      ),
    ).rejects.toMatchObject({ code: "42501" });

    const updated = await database.asUser(manager, (db) => db.execute(sql`update public.projects set memo = 'x' where id = ${own.id}`));
    expect(updated).toBe(0);
  });

  it("管理者は時間原価を含むすべてのデータを参照できる", async () => {
    const counts = await asAdmin<{ projects: number; rates: number }>((db) =>
      db.one(sql`select (select count(*)::int from public.projects) as projects, (select count(*)::int from public.employee_cost_rates) as rates`),
    );
    expect(counts.projects).toBe(data.projects.length);
    expect(counts.rates).toBe(data.employees.length);
  });
});

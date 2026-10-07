import type { Db } from "../db/db";
import { sql } from "../db/sql";

import type { SeedDataset, SeedRow } from "./generate";

const CHUNK_PARAMS = 20_000;

async function insertRows(db: Db, table: string, rows: readonly SeedRow[]): Promise<void> {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const chunkSize = Math.max(1, Math.floor(CHUNK_PARAMS / columns.length));
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = sql.join(chunk.map((row) => sql`(${sql.join(columns.map((c) => sql`${row[c] ?? null}`))})`));
    // テーブル名・列名はコード内の定数のみ（ユーザー入力は含まない）
    await db.execute(sql`insert into ${sql.raw(table)} (${sql.raw(columns.join(", "))}) values ${values}`);
  }
}

export const SEEDED_TABLES = [
  "public.expenses",
  "public.outsourcing_costs",
  "public.materials",
  "public.attendance",
  "public.project_photos",
  "public.daily_report_materials",
  "public.daily_report_workers",
  "public.daily_reports",
  "public.project_members",
  "public.projects",
  "public.customers",
  "public.users",
  "public.employee_cost_rates",
  "public.employees",
  "public.departments",
  "public.settings",
] as const;

export interface ApplySeedOptions {
  /** auth.users を直接作成する（デモモード用）。Supabase では Admin API で作成するため null */
  localAuthUsers: Array<{ id: string; email: string; passwordHash: string }> | null;
}

/**
 * Seed データを投入する。既存の業務データはすべて削除される。
 * システム権限（RLS バイパス）のトランザクション内で実行すること。
 */
export async function applySeed(db: Db, data: SeedDataset, options: ApplySeedOptions): Promise<void> {
  await db.execute(sql`truncate table ${sql.raw(SEEDED_TABLES.join(", "))} cascade`);

  if (options.localAuthUsers) {
    await db.execute(sql`delete from auth.users`);
    await insertRows(
      db,
      "auth.users",
      options.localAuthUsers.map((u) => ({ id: u.id, email: u.email, encrypted_password: u.passwordHash })),
    );
  }

  await insertRows(db, "public.settings", [data.settings]);
  await insertRows(db, "public.departments", data.departments);
  await insertRows(db, "public.employees", data.employees);
  await insertRows(db, "public.employee_cost_rates", data.employeeCostRates);
  await insertRows(
    db,
    "public.users",
    data.authUsers.map((u) => ({ id: u.id, employee_id: u.employeeId })),
  );
  await insertRows(db, "public.customers", data.customers);
  await insertRows(db, "public.projects", data.projects);
  await insertRows(db, "public.project_members", data.projectMembers);
  await insertRows(db, "public.attendance", data.attendance);
  await insertRows(db, "public.daily_reports", data.dailyReports);
  await insertRows(db, "public.daily_report_workers", data.dailyReportWorkers);
  await insertRows(db, "public.daily_report_materials", data.dailyReportMaterials);
  await insertRows(db, "public.project_photos", data.projectPhotos);
  await insertRows(db, "public.materials", data.materials);
  await insertRows(db, "public.outsourcing_costs", data.outsourcingCosts);
  await insertRows(db, "public.expenses", data.expenses);

  for (const [sequence, value] of Object.entries(data.sequences)) {
    await db.execute(sql`select setval(${`public.${sequence}`}, ${value})`);
  }
}

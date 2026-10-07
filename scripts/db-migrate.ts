/**
 * Supabase（PostgreSQL）へマイグレーションを適用する。
 *   DATABASE_URL=... npm run db:migrate
 *
 * Supabase CLI と同じ履歴テーブル（supabase_migrations.schema_migrations）に記録するため、
 * 後から `supabase db push` を使う場合も二重適用されない。
 */
import postgres from "postgres";

import { readMigrations } from "../src/server/db/migrations";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL を設定してください（Supabase の Session pooler / Direct connection の接続文字列）");

  const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(`
      create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key,
        statements text[],
        name text
      );
    `);
    const applied = new Set(
      (await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`).map((r) => r.version),
    );

    for (const migration of await readMigrations({ includeSupabaseOnly: true })) {
      const [version, ...rest] = migration.name.replace(/\.sql$/, "").split("_");
      if (applied.has(version)) {
        console.log(`skip    ${migration.name}`);
        continue;
      }
      await sql.begin(async (tx) => {
        await tx.unsafe(migration.sql);
        await tx.unsafe(
          `insert into supabase_migrations.schema_migrations (version, statements, name) values ($1, $2, $3)`,
          [version, [migration.sql], rest.join("_")],
        );
      });
      console.log(`applied ${migration.name}`);
    }
    console.log("マイグレーションが完了しました");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

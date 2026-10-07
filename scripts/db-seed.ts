/**
 * Supabase にデモデータ（株式会社山田設備）を投入し、デモ用ログインアカウントを作成する。
 *   npm run db:seed
 *
 * 必要な環境変数: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL
 * 注意: 業務テーブルのデータはすべて削除されてから再投入されます。
 */
import { DEMO_PASSWORD } from "../src/lib/constants";
import { todayJst } from "../src/lib/date";
import { createPostgresDatabase } from "../src/server/db/postgres";
import { seedSupabaseDemo } from "../src/server/seed/supabase-seed";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} を設定してください`);
  return value;
}

async function main() {
  const today = todayJst();
  const database = createPostgresDatabase(requireEnv("DATABASE_URL"));
  try {
    const data = await seedSupabaseDemo({
      supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      database,
      today,
    });
    console.log(
      `デモデータを投入しました（基準日 ${today}・案件 ${data.projects.length}件・勤怠 ${data.attendance.length}件・日報 ${data.dailyReports.length}件）`,
    );
    console.log(`ログイン: ${data.authUsers.map((u) => u.email).join(" / ")}（パスワード ${DEMO_PASSWORD}）`);
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { DEMO_PASSWORD } from "@/lib/constants";
import { todayJst } from "@/lib/date";

import { hashPassword } from "../auth/password";
import { appMode, getSupabaseEnv } from "../env";
import { applySeed } from "../seed/apply";
import { generateSeedData } from "../seed/generate";
import type { Database } from "./db";

export type { Database } from "./db";
export { Db, NotFoundError } from "./db";
export { sql, SqlFragment } from "./sql";

interface DatabaseStore {
  __kdxDatabase?: Promise<Database>;
  __kdxSeededOn?: string;
}

// 開発時のホットリロードでも接続（PGlite インスタンス）を使い回す
const store = globalThis as typeof globalThis & DatabaseStore;

/** デモデータを投入（既存データは削除） */
export async function seedDemoDatabase(database: Database): Promise<void> {
  const today = todayJst();
  const data = generateSeedData({ today });
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await database.asSystem((db) =>
    applySeed(db, data, {
      localAuthUsers: data.authUsers.map((u) => ({ id: u.id, email: u.email, passwordHash })),
    }),
  );
  store.__kdxSeededOn = today;
}

async function createDatabase(): Promise<Database> {
  if (appMode === "supabase") {
    const { createPostgresDatabase } = await import("./postgres");
    return createPostgresDatabase(getSupabaseEnv().databaseUrl);
  }
  const { createPgliteDatabase } = await import("./pglite");
  return createPgliteDatabase({
    dataDir: process.env.DEMO_DATA_DIR || undefined,
    onInitialize: seedDemoDatabase,
  });
}

export async function getDatabase(): Promise<Database> {
  store.__kdxDatabase ??= createDatabase().catch((error: unknown) => {
    store.__kdxDatabase = undefined;
    throw error;
  });
  const database = await store.__kdxDatabase;

  // メモリ上のデモDBは日付が変わったら再投入し、常に「今日」基準のデータを表示する
  if (appMode === "demo" && !process.env.DEMO_DATA_DIR && store.__kdxSeededOn && store.__kdxSeededOn !== todayJst()) {
    store.__kdxSeededOn = todayJst();
    await seedDemoDatabase(database);
  }
  return database;
}

/** デモデータを初期状態に戻す（デモモードのみ） */
export async function resetDemoDatabase(): Promise<void> {
  if (appMode !== "demo") throw new Error("デモデータの初期化はデモモードでのみ実行できます");
  await seedDemoDatabase(await getDatabase());
}

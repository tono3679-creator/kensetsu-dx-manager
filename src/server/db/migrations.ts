import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface Migration {
  name: string;
  sql: string;
}

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

/**
 * supabase/migrations 配下の SQL をファイル名順に読み込む。
 * ファイル名に "_supabase_" を含むもの（Storage 等）は Supabase 専用のため、
 * includeSupabaseOnly=false の場合は除外する。
 */
export async function readMigrations(options: { includeSupabaseOnly: boolean }): Promise<Migration[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const targets = options.includeSupabaseOnly ? files : files.filter((f) => !f.includes("_supabase_"));
  return Promise.all(
    targets.map(async (name) => ({
      name,
      sql: await readFile(path.join(MIGRATIONS_DIR, name), "utf8"),
    })),
  );
}

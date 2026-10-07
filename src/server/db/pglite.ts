import { PGlite, type Transaction } from "@electric-sql/pglite";

import { Db, PG_TYPE, parseTimestamptz, systemSessionSetup, userSessionSetup, type Database, type Executor } from "./db";
import { readMigrations } from "./migrations";
import { SUPABASE_SHIM_SQL } from "./supabase-shim";

const parsers = {
  [PG_TYPE.INT8]: (value: string) => Number(value),
  [PG_TYPE.NUMERIC]: (value: string) => Number(value),
  [PG_TYPE.DATE]: (value: string) => value,
  [PG_TYPE.TIME]: (value: string) => value,
  [PG_TYPE.TIMESTAMP]: (value: string) => value,
  [PG_TYPE.TIMESTAMPTZ]: (value: string) => parseTimestamptz(value),
};

function executorFor(tx: Transaction): Executor {
  return {
    async query(text, values) {
      const result = await tx.query<Record<string, unknown>>(text, values);
      return { rows: result.rows, rowCount: result.affectedRows ?? 0 };
    },
  };
}

export interface PgliteOptions {
  /** 永続化先ディレクトリ。未指定ならメモリ上（再起動でリセット） */
  dataDir?: string;
  /** 初回起動時に投入するデータ */
  onInitialize?: (db: Database) => Promise<void>;
}

/** PGlite を起動し、Supabase 互換レイヤー + マイグレーションを適用する */
export async function createPgliteDatabase(options: PgliteOptions = {}): Promise<Database> {
  const pg = new PGlite({ dataDir: options.dataDir, parsers });
  await pg.waitReady;

  const database: Database = {
    kind: "pglite",
    asUser(authUserId, fn) {
      return pg.transaction(async (tx) => {
        const setup = userSessionSetup(authUserId);
        await tx.query(setup.text, setup.values);
        return fn(new Db(executorFor(tx)));
      });
    },
    asSystem(fn) {
      return pg.transaction(async (tx) => {
        await tx.query(systemSessionSetup.text, systemSessionSetup.values);
        return fn(new Db(executorFor(tx)));
      });
    },
    close() {
      return pg.close();
    },
  };

  const initialized = await pg.query<{ exists: boolean }>(
    `select to_regclass('public.settings') is not null as exists`,
  );
  if (!initialized.rows[0]?.exists) {
    await pg.exec(SUPABASE_SHIM_SQL);
    for (const migration of await readMigrations({ includeSupabaseOnly: false })) {
      try {
        await pg.exec(migration.sql);
      } catch (error) {
        throw new Error(`マイグレーション ${migration.name} の適用に失敗しました: ${String(error)}`);
      }
    }
    await options.onInitialize?.(database);
  }

  return database;
}

import postgres from "postgres";

import { Db, PG_TYPE, parseTimestamptz, systemSessionSetup, userSessionSetup, type Database, type Executor } from "./db";

/** postgres.js のトランザクションのうち、ここで使う最小限のインターフェース */
interface UnsafeQueryRunner {
  unsafe(query: string, parameters?: unknown[]): Promise<Record<string, unknown>[] & { count?: number }>;
}

function executorFor(tx: UnsafeQueryRunner): Executor {
  return {
    async query(text, values) {
      const result = await tx.unsafe(text, values);
      return { rows: [...result], rowCount: result.count ?? 0 };
    },
  };
}

/**
 * Supabase の PostgreSQL に接続する。
 * 各リクエストはトランザクション内で `authenticated` ロールに切り替え、
 * JWT クレーム（sub = ユーザーID）を設定してから実行するため RLS がそのまま適用される。
 */
export function createPostgresDatabase(databaseUrl: string): Database {
  const client = postgres(databaseUrl, {
    // Supabase の Transaction Pooler (Supavisor) ではプリペアドステートメントを使えない
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "kensetsu-dx-manager" },
    types: {
      numeric: {
        to: PG_TYPE.NUMERIC,
        from: [PG_TYPE.INT8, PG_TYPE.NUMERIC],
        serialize: (value: number) => String(value),
        parse: (raw: string) => Number(raw),
      },
      dateText: {
        to: PG_TYPE.DATE,
        from: [PG_TYPE.DATE, PG_TYPE.TIME, PG_TYPE.TIMESTAMP],
        serialize: (value: string) => value,
        parse: (raw: string) => raw,
      },
      timestamptz: {
        to: PG_TYPE.TIMESTAMPTZ,
        from: [PG_TYPE.TIMESTAMPTZ],
        serialize: (value: string) => value,
        parse: (raw: string) => parseTimestamptz(raw),
      },
    },
  });

  return {
    kind: "postgres",
    async asUser(authUserId, fn) {
      const result = await client.begin(async (tx) => {
        const runner = tx as unknown as UnsafeQueryRunner;
        const setup = userSessionSetup(authUserId);
        await runner.unsafe(setup.text, setup.values);
        return fn(new Db(executorFor(runner)));
      });
      return result as Awaited<ReturnType<typeof fn>>;
    },
    async asSystem(fn) {
      const result = await client.begin(async (tx) => {
        const runner = tx as unknown as UnsafeQueryRunner;
        await runner.unsafe(systemSessionSetup.text, systemSessionSetup.values);
        return fn(new Db(executorFor(runner)));
      });
      return result as Awaited<ReturnType<typeof fn>>;
    },
    close() {
      return client.end({ timeout: 5 });
    },
  };
}

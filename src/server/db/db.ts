import { compile, type SqlFragment } from "./sql";

export type RawRow = Record<string, unknown>;

export interface QueryResult {
  rows: RawRow[];
  rowCount: number;
}

/** ドライバ（PGlite / postgres.js）ごとの最小実行インターフェース */
export interface Executor {
  query(text: string, values: unknown[]): Promise<QueryResult>;
}

export class NotFoundError extends Error {
  constructor(message = "データが見つかりません") {
    super(message);
    this.name = "NotFoundError";
  }
}

const camelCache = new Map<string, string>();

function toCamel(key: string): string {
  let cached = camelCache.get(key);
  if (cached === undefined) {
    cached = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    camelCache.set(key, cached);
  }
  return cached;
}

function camelizeRow(row: RawRow): RawRow {
  const out: RawRow = {};
  for (const key of Object.keys(row)) out[toCamel(key)] = row[key];
  return out;
}

/**
 * トランザクション内で使うクエリヘルパー。
 * 結果の列名は snake_case → camelCase に変換して返す。
 */
export class Db {
  private readonly executor: Executor;

  constructor(executor: Executor) {
    this.executor = executor;
  }

  async many<T>(query: SqlFragment): Promise<T[]> {
    const { text, values } = compile(query);
    const result = await this.executor.query(text, values);
    return result.rows.map((row) => camelizeRow(row) as T);
  }

  async maybeOne<T>(query: SqlFragment): Promise<T | null> {
    const rows = await this.many<T>(query);
    return rows[0] ?? null;
  }

  async one<T>(query: SqlFragment): Promise<T> {
    const row = await this.maybeOne<T>(query);
    if (row === null) throw new NotFoundError();
    return row;
  }

  /** INSERT / UPDATE / DELETE を実行し、影響行数を返す */
  async execute(query: SqlFragment): Promise<number> {
    const { text, values } = compile(query);
    const result = await this.executor.query(text, values);
    return result.rowCount;
  }
}

export interface Database {
  readonly kind: "pglite" | "postgres";
  /** ログインユーザーとしてトランザクションを実行（RLS が適用される） */
  asUser<T>(authUserId: string, fn: (db: Db) => Promise<T>): Promise<T>;
  /** システム権限でトランザクションを実行（RLS をバイパス。認証処理・Seed 専用） */
  asSystem<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** トランザクション開始直後に実行するセッション設定（ロール切替・JWTクレーム・タイムゾーン） */
export function userSessionSetup(authUserId: string): CompiledQuery {
  return {
    text: `select
      set_config('role', 'authenticated', true),
      set_config('request.jwt.claims', $1, true),
      set_config('TimeZone', 'Asia/Tokyo', true)`,
    values: [JSON.stringify({ sub: authUserId, role: "authenticated" })],
  };
}

export const systemSessionSetup: CompiledQuery = {
  text: `select set_config('TimeZone', 'Asia/Tokyo', true)`,
  values: [],
};

interface CompiledQuery {
  text: string;
  values: unknown[];
}

/** "2026-10-07 08:00:00+09" のような PostgreSQL の timestamptz 文字列を ISO 8601 (UTC) に変換 */
export function parseTimestamptz(value: string): string {
  let iso = value.replace(" ", "T");
  if (/[+-]\d{2}$/.test(iso)) iso += ":00";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export const PG_TYPE = {
  INT8: 20,
  NUMERIC: 1700,
  DATE: 1082,
  TIME: 1083,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
} as const;

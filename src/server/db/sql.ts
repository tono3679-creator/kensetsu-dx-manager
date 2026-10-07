/**
 * 最小限の SQL タグ関数。
 * 値はすべてプレースホルダ ($1, $2 ...) としてバインドされるため SQL インジェクションを防げる。
 * 入れ子の sql`` は展開され、パラメータ番号は自動で振り直される。
 */

type Part = { kind: "text"; text: string } | { kind: "value"; value: unknown };

export class SqlFragment {
  readonly parts: readonly Part[];

  constructor(parts: readonly Part[]) {
    this.parts = parts;
  }
}

export interface CompiledQuery {
  text: string;
  values: unknown[];
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): SqlFragment {
  const parts: Part[] = [];
  strings.forEach((text, i) => {
    if (text) parts.push({ kind: "text", text });
    if (i < values.length) {
      const value = values[i];
      if (value instanceof SqlFragment) {
        parts.push(...value.parts);
      } else {
        parts.push({ kind: "value", value: normalizeValue(value) });
      }
    }
  });
  return new SqlFragment(parts);
}

/** 複数のフラグメントを区切り文字で連結する */
sql.join = (fragments: readonly SqlFragment[], separator: string = ", "): SqlFragment => {
  const parts: Part[] = [];
  fragments.forEach((fragment, i) => {
    if (i > 0) parts.push({ kind: "text", text: separator });
    parts.push(...fragment.parts);
  });
  return new SqlFragment(parts);
};

/**
 * 生の SQL 文字列を埋め込む。ホワイトリスト済みの識別子（ソート列など）にのみ使用すること。
 */
sql.raw = (text: string): SqlFragment => new SqlFragment([{ kind: "text", text }]);

sql.empty = new SqlFragment([]);

/** column in ($1, $2, ...)。値が空なら false */
sql.inList = (column: SqlFragment, values: readonly unknown[]): SqlFragment =>
  values.length === 0
    ? sql`false`
    : sql`${column} in (${sql.join(values.map((v) => sql`${v}`))})`;

/** LIKE 検索用にワイルドカード文字をエスケープ */
sql.likeEscape = (value: string): string => `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** 条件が空なら空、あれば "where a and b" を返す */
sql.where = (conditions: readonly SqlFragment[]): SqlFragment =>
  conditions.length === 0 ? sql.empty : sql`where ${sql.join(conditions, " and ")}`;

export function compile(fragment: SqlFragment): CompiledQuery {
  let text = "";
  const values: unknown[] = [];
  for (const part of fragment.parts) {
    if (part.kind === "text") {
      text += part.text;
    } else {
      values.push(part.value);
      text += `$${values.length}`;
    }
  }
  return { text, values };
}

import { describe, expect, it } from "vitest";

import { compile, sql } from "@/server/db/sql";

describe("SQL タグ関数", () => {
  it("値はすべてプレースホルダになり、入れ子でも番号が振り直される", () => {
    const status = "in_progress";
    const where = sql.where([sql`p.status = ${status}`, sql`p.name ilike ${sql.likeEscape("50%_off")}`]);
    const query = compile(sql`select * from public.projects p ${where} limit ${10}`);
    expect(query.text).toBe("select * from public.projects p where p.status = $1 and p.name ilike $2 limit $3");
    expect(query.values).toEqual(["in_progress", "%50\\%\\_off%", 10]);
  });

  it("悪意のある文字列も SQL に埋め込まれない", () => {
    const query = compile(sql`select 1 where name = ${"'; drop table projects; --"}`);
    expect(query.text).toBe("select 1 where name = $1");
  });

  it("IN 句は空配列なら false", () => {
    expect(compile(sql`${sql.inList(sql`id`, [])}`).text).toBe("false");
    expect(compile(sql`${sql.inList(sql`id`, ["a", "b"])}`)).toEqual({ text: "id in ($1, $2)", values: ["a", "b"] });
  });
});

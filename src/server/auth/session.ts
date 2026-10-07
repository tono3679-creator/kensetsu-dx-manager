import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { AppRole } from "@/types/domain";

import { getDatabase, sql, type Db } from "../db";
import { appMode } from "../env";
import { DEMO_SESSION_COOKIE, verifySessionToken } from "./demo-session";
import { createSupabaseServerClient } from "./supabase";

export interface CurrentUser {
  authUserId: string;
  employeeId: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  name: string;
  email: string;
  role: AppRole;
  position: string | null;
  departmentName: string | null;
}

/** Cookie からログイン中ユーザーの ID を取得（署名・JWT を検証済み） */
async function getAuthUserId(): Promise<string | null> {
  if (appMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub;
  }
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(DEMO_SESSION_COOKIE)?.value);
}

/**
 * ログイン中のユーザー（従業員）情報。リクエスト内でキャッシュされる。
 * 退職者・従業員未紐付けのアカウントは null（ログイン不可）として扱う。
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;

  const database = await getDatabase();
  const profile = await database.asUser(authUserId, (db) =>
    db.maybeOne<Omit<CurrentUser, "authUserId" | "name">>(sql`
      select e.id as employee_id, e.employee_code, e.last_name, e.first_name, e.email, e.role, e.position,
             d.name as department_name
      from public.users u
      join public.employees e on e.id = u.employee_id
      left join public.departments d on d.id = e.department_id
      where u.id = auth.uid() and e.employment_status <> 'retired'
    `),
  );
  if (!profile) return null;
  return { ...profile, authUserId, name: `${profile.lastName} ${profile.firstName}` };
});

/** 未ログインならログイン画面へリダイレクト */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** 指定の権限を持たない場合は権限エラー画面へ */
export async function requireRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

/** ログインユーザーの権限（RLS 適用）でクエリを実行する */
export async function withUser<T>(
  fn: (db: Db, user: CurrentUser) => Promise<T>,
  options: { roles?: AppRole[] } = {},
): Promise<T> {
  const user = options.roles ? await requireRole(...options.roles) : await requireUser();
  const database = await getDatabase();
  return database.asUser(user.authUserId, (db) => fn(db, user));
}

export function hasRole(user: Pick<CurrentUser, "role">, ...roles: AppRole[]): boolean {
  return roles.includes(user.role);
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/validation/common";

import { DEMO_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken } from "../auth/demo-session";
import { verifyPassword } from "../auth/password";
import { createSupabaseServerClient } from "../auth/supabase";
import { getDatabase, sql } from "../db";
import { appMode } from "../env";

const loginSchema = z.object({
  email: z.email("メールアドレスの形式が正しくありません").max(254),
  password: z.string().min(1, "パスワードを入力してください").max(128),
});

const INVALID_CREDENTIALS = "メールアドレスまたはパスワードが正しくありません";

/** 同一ログインIDへの連続失敗を制限（プロセス内の簡易レート制限） */
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60 * 1000;

function isLocked(key: string): boolean {
  const entry = failures.get(key);
  return !!entry && entry.count >= MAX_FAILURES && entry.until > Date.now();
}

function recordFailure(key: string) {
  const entry = failures.get(key);
  const count = entry && entry.until > Date.now() ? entry.count + 1 : 1;
  failures.set(key, { count, until: Date.now() + LOCK_MS });
}

async function authenticateDemo(email: string, password: string): Promise<string | null> {
  const database = await getDatabase();
  const account = await database.asSystem((db) =>
    db.maybeOne<{ id: string; encryptedPassword: string }>(sql`
      select u.id, u.encrypted_password
      from auth.users u
      join public.users pu on pu.id = u.id
      join public.employees e on e.id = pu.employee_id
      where lower(u.email) = lower(${email}) and e.employment_status <> 'retired'
    `),
  );
  if (!account) return null;
  return (await verifyPassword(password, account.encryptedPassword)) ? account.id : null;
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS };
  }
  const { email, password } = parsed.data;
  const key = email.toLowerCase();
  if (isLocked(key)) {
    return { ok: false, message: "ログインに続けて失敗したため、5分間ロックしています。しばらくしてからお試しください。" };
  }

  if (appMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      recordFailure(key);
      return { ok: false, message: INVALID_CREDENTIALS };
    }
  } else {
    const userId = await authenticateDemo(email, password);
    if (!userId) {
      recordFailure(key);
      return { ok: false, message: INVALID_CREDENTIALS };
    }
    const store = await cookies();
    store.set(DEMO_SESSION_COOKIE, await createSessionToken(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }

  failures.delete(key);
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction(): Promise<void> {
  if (appMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    const store = await cookies();
    store.delete(DEMO_SESSION_COOKIE);
  }
  redirect("/login");
}

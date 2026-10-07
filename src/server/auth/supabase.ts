import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "../env";

/** Server Components / Server Actions 用の Supabase クライアント（Auth 用途） */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Component からの呼び出しでは Cookie を書き込めない（proxy でセッション更新済み）
        }
      },
    },
  });
}

/**
 * Storage 操作用のサービスロールクライアント。
 * 認可は事前に RLS 付きクエリ（project_photos の SELECT/INSERT）で確認してから使用すること。
 */
export function createSupabaseServiceClient() {
  const env = getSupabaseEnv();
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

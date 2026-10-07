import { z } from "zod";

/**
 * 動作モード
 *   demo     : PGlite（WASM 版 PostgreSQL）をプロセス内で起動。Supabase 不要で即座に動作。
 *   supabase : Supabase（Auth + PostgreSQL + Storage）に接続する本番構成。
 */
export type AppMode = "demo" | "supabase";

export const appMode: AppMode = process.env.APP_MODE === "supabase" ? "supabase" : "demo";

export const isDemoMode = appMode === "demo";

/** 公開デモ（デモアカウントを公開し、デモデータを毎日初期化する）運用かどうか */
export const isPublicDemo = process.env.DEMO_RESET_ENABLED === "true";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL が未設定または不正です"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL が未設定です"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY が未設定です"),
});

export type SupabaseEnv = {
  url: string;
  anonKey: string;
  databaseUrl: string;
  serviceRoleKey: string;
};

let cachedSupabaseEnv: SupabaseEnv | null = null;

export function getSupabaseEnv(): SupabaseEnv {
  if (cachedSupabaseEnv) return cachedSupabaseEnv;
  const parsed = supabaseEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `- ${issue.message}`).join("\n");
    throw new Error(`APP_MODE=supabase の環境変数が不足しています:\n${messages}`);
  }
  cachedSupabaseEnv = {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    databaseUrl: parsed.data.DATABASE_URL,
    serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  };
  return cachedSupabaseEnv;
}

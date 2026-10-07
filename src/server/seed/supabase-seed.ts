import { createClient } from "@supabase/supabase-js";

import { DEMO_PASSWORD } from "@/lib/constants";

import type { Database } from "../db/db";
import { applySeed } from "./apply";
import { generateSeedData, type SeedDataset } from "./generate";

type AdminApi = ReturnType<typeof createClient>["auth"]["admin"];

/** デモアカウントを Supabase Auth に作成（既存ならパスワードをデモ用に戻す）し、ユーザーID を返す */
async function ensureAuthUser(admin: AdminApi, email: string): Promise<string> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      const { error: updateError } = await admin.updateUserById(found.id, { password: DEMO_PASSWORD, email_confirm: true });
      if (updateError) throw updateError;
      return found.id;
    }
    if (data.users.length < 100) break;
  }
  const { data, error } = await admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`${email} の作成に失敗しました`);
  return data.user.id;
}

/**
 * Supabase にデモデータを投入する（業務データはすべて入れ替え）。
 * `npm run db:seed` と、公開デモの毎日の初期化（Vercel Cron）で共通利用する。
 */
export async function seedSupabaseDemo(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  database: Database;
  today: string;
}): Promise<SeedDataset> {
  const data = generateSeedData({ today: options.today });
  const supabase = createClient(options.supabaseUrl, options.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const account of data.authUsers) {
    account.id = await ensureAuthUser(supabase.auth.admin, account.email);
  }
  await options.database.asSystem((db) => applySeed(db, data, { localAuthUsers: null }));
  return data;
}

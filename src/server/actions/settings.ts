"use server";

import { revalidatePath } from "next/cache";

import { todayJst } from "@/lib/date";
import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";
import { settingsSchema } from "@/lib/validation/master";

import { requireRole, withUser } from "../auth/session";
import { NotFoundError, getDatabase, resetDemoDatabase, sql } from "../db";
import { getSupabaseEnv, isDemoMode, isPublicDemo } from "../env";
import { seedSupabaseDemo } from "../seed/supabase-seed";
import { toActionError } from "./helpers";

export async function updateSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const v = parsed.data;
  try {
    await withUser(
      async (db) => {
        const updated = await db.execute(sql`
          update public.settings set
            company_name = ${v.companyName}, standard_work_minutes = ${v.standardWorkMinutes},
            default_break_minutes = ${v.defaultBreakMinutes}, cost_alert_percent = ${v.costAlertPercent}
          where id = 1
        `);
        if (updated === 0) throw new NotFoundError();
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "設定を保存しました" };
}

/** デモデータを初期状態（今日を基準にした状態）へ戻す。デモモードと公開デモでのみ有効 */
export async function resetDemoDataAction(): Promise<ActionResult> {
  if (!isDemoMode && !isPublicDemo) return { ok: false, message: "デモ環境でのみ実行できます" };
  try {
    await requireRole("admin");
    if (isDemoMode) {
      await resetDemoDatabase();
    } else {
      const env = getSupabaseEnv();
      await seedSupabaseDemo({ supabaseUrl: env.url, serviceRoleKey: env.serviceRoleKey, database: await getDatabase(), today: todayJst() });
    }
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "デモデータを初期化しました" };
}

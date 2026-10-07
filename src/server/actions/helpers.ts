import "server-only";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import type { ActionResult } from "@/lib/validation/common";

import { NotFoundError } from "../db";

interface PostgresLikeError {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  message?: string;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  employees_email_key: "このメールアドレスは既に登録されています",
  daily_reports_project_author_date_key: "同じ日・同じ案件の日報は既に登録されています。既存の日報を編集してください。",
  attendance_employee_date_key: "この日の勤怠は既に登録されています",
  projects_completed_requires_end_date: "完工以降のステータスには「実際の完工日」が必要です",
  projects_started_requires_start_date: "工事中以降のステータスには「実際の着工日」が必要です",
  projects_planned_period_check: "完工予定日は着工予定日以降の日付にしてください",
  projects_actual_period_check: "実際の完工日は実際の着工日以降の日付にしてください",
  daily_reports_time_check: "作業終了時刻は開始時刻より後にしてください",
  attendance_clock_check: "退勤時刻は出勤時刻より後にしてください",
};

/** DB エラー等をユーザー向けメッセージに変換 */
export function toActionError(error: unknown): ActionResult {
  unstable_rethrow(error); // redirect() / notFound() はそのまま再送出

  if (error instanceof NotFoundError) return { ok: false, message: "対象のデータが見つからないか、アクセス権限がありません" };

  const pg = error as PostgresLikeError;
  const constraint = pg.constraint ?? pg.constraint_name;
  if (constraint && CONSTRAINT_MESSAGES[constraint]) return { ok: false, message: CONSTRAINT_MESSAGES[constraint] };

  switch (pg.code) {
    case "42501": // insufficient_privilege（RLS 違反）
      return { ok: false, message: "この操作を行う権限がありません" };
    case "23505":
      return { ok: false, message: "同じ内容のデータが既に登録されています" };
    case "23503":
      return { ok: false, message: "関連するデータが存在するため処理できません" };
    case "23514":
    case "22P02":
    case "22007":
    case "22008":
      return { ok: false, message: "入力値が正しくありません" };
  }

  console.error("[action error]", error);
  return { ok: false, message: "処理中にエラーが発生しました。時間をおいて再度お試しください。" };
}

const FLASH_COOKIE = "kdx_flash";

/** リダイレクト後の画面でトースト表示するメッセージを設定 */
export async function setFlash(message: string): Promise<void> {
  const store = await cookies();
  // 値は Next.js 側で URL エンコードされるため、そのまま渡す（クライアントで decodeURIComponent する）
  store.set(FLASH_COOKIE, message.slice(0, 300), { path: "/", maxAge: 30, sameSite: "lax" });
}

import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { todayJst } from "@/lib/date";
import { getDatabase, resetDemoDatabase } from "@/server/db";
import { appMode, getSupabaseEnv, isPublicDemo } from "@/server/env";
import { seedSupabaseDemo } from "@/server/seed/supabase-seed";

export const maxDuration = 60;

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * 公開デモのデータを「今日」を基準にした初期状態へ戻す（Vercel Cron から毎日実行）。
 * DEMO_RESET_ENABLED=true かつ CRON_SECRET を設定した場合のみ有効。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!isPublicDemo || !secret) return new NextResponse("Not Found", { status: 404 });
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = todayJst();
  if (appMode === "supabase") {
    const env = getSupabaseEnv();
    await seedSupabaseDemo({ supabaseUrl: env.url, serviceRoleKey: env.serviceRoleKey, database: await getDatabase(), today });
  } else {
    await resetDemoDatabase();
  }
  return NextResponse.json({ ok: true, today });
}

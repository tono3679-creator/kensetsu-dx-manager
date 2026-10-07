import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DEMO_SESSION_COOKIE } from "@/server/auth/demo-session";
import { appMode, getSupabaseEnv } from "@/server/env";

const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 認証の楽観的チェック（セッション Cookie の有無）と Supabase セッションの更新。
 * 最終的な認可は Server Components / Server Actions と DB の RLS で行う。
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });
  let hasSession: boolean;

  if (appMode === "supabase") {
    const env = getSupabaseEnv();
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    hasSession = !!data?.claims?.sub;
  } else {
    hasSession = request.cookies.has(DEMO_SESSION_COOKIE);
  }

  if (!hasSession && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // 静的ファイル・画像・API（写真配信は Route Handler 側で認可）を除外
    "/((?!_next/static|_next/image|api/|favicon.ico|demo-photos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

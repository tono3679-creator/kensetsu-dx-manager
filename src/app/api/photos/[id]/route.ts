import { NextResponse } from "next/server";

import { isUuid } from "@/lib/search-params";
import { getCurrentUser } from "@/server/auth/session";
import { getDatabase, sql } from "@/server/db";
import { getPhotoObject } from "@/server/storage/photos";

/**
 * 現場写真の配信。ユーザー権限（RLS）で写真レコードを参照できた場合のみ画像を返す。
 */
export async function GET(request: Request, context: RouteContext<"/api/photos/[id]">) {
  const { id } = await context.params;
  if (!isUuid(id)) return new NextResponse("Not Found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const database = await getDatabase();
  const photo = await database.asUser(user.authUserId, (db) =>
    db.maybeOne<{ storagePath: string; mimeType: string }>(sql`
      select storage_path, mime_type from public.project_photos where id = ${id}
    `),
  );
  if (!photo) return new NextResponse("Not Found", { status: 404 });

  // デモデータのサンプル画像は public/demo-photos から配信
  if (photo.storagePath.startsWith("seed/")) {
    const file = photo.storagePath.split("/").pop() ?? "";
    return NextResponse.redirect(new URL(`/demo-photos/${encodeURIComponent(file)}`, request.url));
  }

  const object = await getPhotoObject(photo.storagePath);
  if (!object) return new NextResponse("Not Found", { status: 404 });

  return new NextResponse(Buffer.from(object.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

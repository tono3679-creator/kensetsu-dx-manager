import "server-only";

import { createSupabaseServiceClient } from "../auth/supabase";
import { getDatabase, sql } from "../db";
import { appMode } from "../env";

export const PHOTO_BUCKET = "project-photos";
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * 写真の実体を保存する。
 * 呼び出し前に、ユーザー権限（RLS）で project_photos への INSERT が成功していること＝認可済みであること。
 */
export async function putPhotoObject(path: string, data: Uint8Array, mimeType: string): Promise<void> {
  if (appMode === "supabase") {
    const { error } = await createSupabaseServiceClient()
      .storage.from(PHOTO_BUCKET)
      .upload(path, data, { contentType: mimeType, upsert: false });
    if (error) throw new Error(`写真の保存に失敗しました: ${error.message}`);
    return;
  }
  const database = await getDatabase();
  await database.asSystem((db) =>
    db.execute(sql`insert into demo_storage.objects (path, mime_type, data) values (${path}, ${mimeType}, ${data})`),
  );
}

export async function getPhotoObject(path: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  if (appMode === "supabase") {
    const { data, error } = await createSupabaseServiceClient().storage.from(PHOTO_BUCKET).download(path);
    if (error || !data) return null;
    return { data: new Uint8Array(await data.arrayBuffer()), mimeType: data.type || "image/jpeg" };
  }
  const database = await getDatabase();
  return database.asSystem((db) =>
    db.maybeOne<{ data: Uint8Array; mimeType: string }>(sql`
      select data, mime_type from demo_storage.objects where path = ${path}
    `),
  );
}

export async function deletePhotoObject(path: string): Promise<void> {
  if (path.startsWith("seed/")) return;
  if (appMode === "supabase") {
    await createSupabaseServiceClient().storage.from(PHOTO_BUCKET).remove([path]);
    return;
  }
  const database = await getDatabase();
  await database.asSystem((db) => db.execute(sql`delete from demo_storage.objects where path = ${path}`));
}

/** バイナリ先頭のシグネチャから画像形式を判定（Content-Type の偽装対策） */
export function detectImageType(bytes: Uint8Array): (typeof ALLOWED_PHOTO_TYPES)[number] | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

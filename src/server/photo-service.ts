import "server-only";

import { PHOTO_PHASES, type PhotoPhase } from "@/types/domain";

import type { CurrentUser } from "./auth/session";
import { getDatabase, sql } from "./db";
import { MAX_PHOTO_BYTES, deletePhotoObject, detectImageType, putPhotoObject } from "./storage/photos";

export interface PhotoUpload {
  file: File;
  phase: PhotoPhase;
  caption: string | null;
}

export const MAX_PHOTOS_PER_REQUEST = 10;

/** FormData から写真（photos[] + photoPhases[] + photoCaptions[]）を取り出す */
export function readPhotoUploads(formData: FormData): PhotoUpload[] {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const phases = formData.getAll("photoPhases").map(String);
  const captions = formData.getAll("photoCaptions").map(String);
  return files.slice(0, MAX_PHOTOS_PER_REQUEST).map((file, i) => ({
    file,
    phase: (PHOTO_PHASES as readonly string[]).includes(phases[i]) ? (phases[i] as PhotoPhase) : "during",
    caption: captions[i]?.trim().slice(0, 200) || null,
  }));
}

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/**
 * 写真を保存する。
 *  1. 形式・サイズを検証（バイナリのシグネチャで判定）
 *  2. ユーザー権限で project_photos に INSERT（RLS で案件へのアクセス権を確認）
 *  3. 実体を保存。失敗したらレコードを削除して整合性を保つ
 */
export async function savePhotos(
  user: CurrentUser,
  projectId: string,
  dailyReportId: string | null,
  uploads: PhotoUpload[],
): Promise<{ saved: number; errors: string[] }> {
  const database = await getDatabase();
  const errors: string[] = [];
  let saved = 0;

  for (const upload of uploads) {
    const bytes = new Uint8Array(await upload.file.arrayBuffer());
    if (bytes.byteLength > MAX_PHOTO_BYTES) {
      errors.push(`${upload.file.name}: 5MBを超えています`);
      continue;
    }
    const mimeType = detectImageType(bytes);
    if (!mimeType) {
      errors.push(`${upload.file.name}: JPEG / PNG / WebP 以外の形式です`);
      continue;
    }

    const id = crypto.randomUUID();
    const path = `${projectId}/${id}.${EXTENSIONS[mimeType]}`;
    await database.asUser(user.authUserId, (db) =>
      db.execute(sql`
        insert into public.project_photos
          (id, project_id, daily_report_id, phase, storage_path, file_name, mime_type, size_bytes, caption, uploaded_by)
        values
          (${id}, ${projectId}, ${dailyReportId}, ${upload.phase}, ${path}, ${upload.file.name.slice(0, 200)},
           ${mimeType}, ${bytes.byteLength}, ${upload.caption}, ${user.employeeId})
      `),
    );
    try {
      await putPhotoObject(path, bytes, mimeType);
      saved++;
    } catch (error) {
      console.error("[photo upload]", error);
      await database.asUser(user.authUserId, (db) => db.execute(sql`delete from public.project_photos where id = ${id}`));
      errors.push(`${upload.file.name}: 保存に失敗しました`);
    }
  }
  return { saved, errors };
}

/** 写真を削除（RLS で削除権限を確認したうえで実体も削除） */
export async function removePhoto(user: CurrentUser, photoId: string): Promise<{ projectId: string } | null> {
  const database = await getDatabase();
  const row = await database.asUser(user.authUserId, (db) =>
    db.maybeOne<{ projectId: string; storagePath: string }>(sql`
      delete from public.project_photos where id = ${photoId} returning project_id, storage_path
    `),
  );
  if (!row) return null;
  await deletePhotoObject(row.storagePath);
  return { projectId: row.projectId };
}

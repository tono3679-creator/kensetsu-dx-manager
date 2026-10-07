"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/search-params";
import type { ActionResult } from "@/lib/validation/common";

import { requireUser } from "../auth/session";
import { readPhotoUploads, removePhoto, savePhotos } from "../photo-service";
import { toActionError } from "./helpers";

export async function uploadProjectPhotosAction(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isUuid(projectId)) return { ok: false, message: "不正なリクエストです" };
  const uploads = readPhotoUploads(formData);
  if (uploads.length === 0) return { ok: false, message: "写真を選択してください" };

  try {
    const user = await requireUser();
    const { saved, errors } = await savePhotos(user, projectId, null, uploads);
    revalidatePath(`/projects/${projectId}`);
    if (errors.length) {
      return { ok: saved > 0, message: `${saved}枚を登録しました。登録できなかった写真: ${errors.join(" / ")}` };
    }
    return { ok: true, message: `写真を${saved}枚登録しました` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePhotoAction(photoId: string): Promise<ActionResult> {
  if (!isUuid(photoId)) return { ok: false, message: "不正なリクエストです" };
  try {
    const user = await requireUser();
    const result = await removePhoto(user, photoId);
    if (!result) return { ok: false, message: "写真が見つからないか、削除する権限がありません" };
    revalidatePath(`/projects/${result.projectId}`);
    return { ok: true, message: "写真を削除しました" };
  } catch (error) {
    return toActionError(error);
  }
}

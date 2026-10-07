"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { todayJst } from "@/lib/date";
import { isUuid } from "@/lib/search-params";
import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";
import { DAILY_REPORT_ARRAY_KEYS, dailyReportSchema, type DailyReportInput } from "@/lib/validation/daily-report";

import { requireUser, withUser } from "../auth/session";
import { NotFoundError, sql, type Db } from "../db";
import { readPhotoUploads, savePhotos } from "../photo-service";
import { setFlash, toActionError } from "./helpers";

function parse(formData: FormData) {
  return dailyReportSchema.safeParse({ ...formDataToObject(formData, DAILY_REPORT_ARRAY_KEYS), today: todayJst() });
}

async function replaceChildren(db: Db, reportId: string, input: DailyReportInput) {
  await db.execute(sql`delete from public.daily_report_workers where daily_report_id = ${reportId}`);
  await db.execute(sql`delete from public.daily_report_materials where daily_report_id = ${reportId}`);
  if (input.workerIds.length) {
    await db.execute(sql`
      insert into public.daily_report_workers (daily_report_id, employee_id)
      values ${sql.join(input.workerIds.map((id) => sql`(${reportId}, ${id})`))}
    `);
  }
  if (input.materials.length) {
    await db.execute(sql`
      insert into public.daily_report_materials (daily_report_id, name, quantity, unit, sort_order)
      values ${sql.join(input.materials.map((m, i) => sql`(${reportId}, ${m.name}, ${m.quantity}, ${m.unit}, ${i})`))}
    `);
  }
}

function revalidateReportPages(projectId: string) {
  revalidatePath("/daily-reports");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

function photoMessage(base: string, result: { saved: number; errors: string[] } | null) {
  if (!result) return base;
  if (result.errors.length) return `${base}（写真${result.saved}枚。一部登録できませんでした: ${result.errors.join(" / ")}）`;
  return result.saved ? `${base}（写真${result.saved}枚）` : base;
}

export async function createDailyReportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  const uploads = readPhotoUploads(formData);

  let reportId: string;
  let photoResult: { saved: number; errors: string[] } | null = null;
  try {
    const user = await requireUser();
    reportId = await withUser(async (db) => {
      const { id } = await db.one<{ id: string }>(sql`
        insert into public.daily_reports
          (project_id, report_date, author_id, start_time, end_time, break_minutes, work_content, progress, issues, tomorrow_plan, notes)
        values
          (${input.projectId}, ${input.reportDate}, ${user.employeeId}, ${input.startTime}, ${input.endTime},
           ${input.breakMinutes}, ${input.workContent}, ${input.progress}, ${input.issues}, ${input.tomorrowPlan}, ${input.notes})
        returning id
      `);
      await replaceChildren(db, id, input);
      return id;
    });
    if (uploads.length) photoResult = await savePhotos(user, input.projectId, reportId, uploads);
  } catch (error) {
    return toActionError(error);
  }

  revalidateReportPages(input.projectId);
  await setFlash(photoMessage("日報を登録しました", photoResult));
  redirect(`/daily-reports/${reportId}`);
}

export async function updateDailyReportAction(reportId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isUuid(reportId)) return { ok: false, message: "不正なリクエストです" };
  const parsed = parse(formData);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  const uploads = readPhotoUploads(formData);

  let photoResult: { saved: number; errors: string[] } | null = null;
  try {
    const user = await requireUser();
    await withUser(async (db) => {
      const updated = await db.execute(sql`
        update public.daily_reports set
          project_id = ${input.projectId}, report_date = ${input.reportDate}, start_time = ${input.startTime},
          end_time = ${input.endTime}, break_minutes = ${input.breakMinutes}, work_content = ${input.workContent},
          progress = ${input.progress}, issues = ${input.issues}, tomorrow_plan = ${input.tomorrowPlan}, notes = ${input.notes}
        where id = ${reportId}
      `);
      if (updated === 0) throw new NotFoundError();
      await replaceChildren(db, reportId, input);
    });
    if (uploads.length) photoResult = await savePhotos(user, input.projectId, reportId, uploads);
  } catch (error) {
    return toActionError(error);
  }

  revalidateReportPages(input.projectId);
  await setFlash(photoMessage("日報を更新しました", photoResult));
  redirect(`/daily-reports/${reportId}`);
}

export async function deleteDailyReportAction(reportId: string): Promise<ActionResult> {
  if (!isUuid(reportId)) return { ok: false, message: "不正なリクエストです" };
  let projectId: string;
  try {
    projectId = await withUser(async (db) => {
      const row = await db.maybeOne<{ projectId: string }>(sql`
        delete from public.daily_reports where id = ${reportId} returning project_id
      `);
      if (!row) throw new NotFoundError();
      return row.projectId;
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidateReportPages(projectId);
  await setFlash("日報を削除しました");
  redirect("/daily-reports");
}

"use server";

import { revalidatePath } from "next/cache";

import { calcOvertimeMinutes } from "@/lib/attendance";
import { jstToIso, todayJst } from "@/lib/date";
import { formatMinutes } from "@/lib/format";
import { isUuid } from "@/lib/search-params";
import { attendanceEditSchema, clockInSchema, clockOutSchema } from "@/lib/validation/attendance";
import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";

import { withUser } from "../auth/session";
import { NotFoundError, sql } from "../db";
import { getSettings } from "../queries/common";
import { toActionError } from "./helpers";

function revalidateAttendance() {
  revalidatePath("/attendance", "layout");
  revalidatePath("/");
}

/** 出勤打刻（サーバー時刻で記録し、端末の時計のずれや改ざんを防ぐ） */
export async function clockInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = clockInSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const { projectId, note } = parsed.data;
  try {
    const time = await withUser(async (db, user) => {
      const settings = await getSettings(db);
      const existing = await db.maybeOne<{ id: string }>(sql`
        select id from public.attendance where employee_id = ${user.employeeId} and work_date = ${todayJst()}
      `);
      if (existing) throw Object.assign(new Error("already"), { code: "ALREADY_CLOCKED_IN" });
      const row = await db.one<{ clockIn: string }>(sql`
        insert into public.attendance (employee_id, work_date, project_id, clock_in, break_minutes, note)
        values (${user.employeeId}, ${todayJst()}, ${projectId}, now(), ${settings.defaultBreakMinutes}, ${note})
        returning to_char(clock_in at time zone 'Asia/Tokyo', 'HH24:MI') as clock_in
      `);
      return row.clockIn;
    });
    revalidateAttendance();
    return { ok: true, message: `${time} に出勤しました。今日もご安全に！` };
  } catch (error) {
    if ((error as { code?: string }).code === "ALREADY_CLOCKED_IN") return { ok: false, message: "本日は既に出勤済みです" };
    return toActionError(error);
  }
}

/** 退勤打刻（前日の打刻漏れは退勤時刻を指定して登録） */
export async function clockOutAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = clockOutSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  try {
    const result = await withUser(async (db, user) => {
      const record = await db.maybeOne<{ workDate: string }>(sql`
        select work_date from public.attendance
        where id = ${input.attendanceId} and employee_id = ${user.employeeId} and clock_out is null
      `);
      if (!record) throw new NotFoundError("退勤打刻の対象が見つかりません");
      const clockOut = input.clockOutTime ? jstToIso(record.workDate, input.clockOutTime) : null;
      const settings = await getSettings(db);
      const row = await db.maybeOne<{ workMinutes: number | null }>(sql`
        update public.attendance set
          clock_out = coalesce(${clockOut}::timestamptz, now()),
          break_minutes = ${input.breakMinutes},
          project_id = ${input.projectId},
          note = coalesce(${input.note}, note)
        where id = ${input.attendanceId} and employee_id = ${user.employeeId} and clock_out is null
        returning work_minutes
      `);
      if (!row) throw new NotFoundError();
      return { workMinutes: row.workMinutes, overtime: calcOvertimeMinutes(row.workMinutes, settings.standardWorkMinutes) };
    });
    revalidateAttendance();
    const overtime = result.overtime ? `（残業 ${formatMinutes(result.overtime)}）` : "";
    return { ok: true, message: `退勤しました。実働 ${formatMinutes(result.workMinutes)}${overtime}。お疲れさまでした！` };
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false, message: error.message };
    return toActionError(error);
  }
}

/** 管理者による勤怠の登録・修正 */
export async function saveAttendanceAction(attendanceId: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = attendanceEditSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const v = parsed.data;
  const clockIn = jstToIso(v.workDate, v.clockInTime);
  const clockOut = v.clockOutTime ? jstToIso(v.workDate, v.clockOutTime) : null;
  try {
    await withUser(
      async (db) => {
        if (attendanceId) {
          const updated = await db.execute(sql`
            update public.attendance set
              work_date = ${v.workDate}, clock_in = ${clockIn}, clock_out = ${clockOut},
              break_minutes = ${v.breakMinutes}, project_id = ${v.projectId}, note = ${v.note}
            where id = ${attendanceId}
          `);
          if (updated === 0) throw new NotFoundError();
        } else {
          await db.execute(sql`
            insert into public.attendance (employee_id, work_date, project_id, clock_in, clock_out, break_minutes, note)
            values (${v.employeeId}, ${v.workDate}, ${v.projectId}, ${clockIn}, ${clockOut}, ${v.breakMinutes}, ${v.note})
          `);
        }
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidateAttendance();
  return { ok: true, message: attendanceId ? "勤怠を修正しました" : "勤怠を登録しました" };
}

export async function deleteAttendanceAction(attendanceId: string): Promise<ActionResult> {
  if (!isUuid(attendanceId)) return { ok: false, message: "不正なリクエストです" };
  try {
    await withUser(
      async (db) => {
        const deleted = await db.execute(sql`delete from public.attendance where id = ${attendanceId}`);
        if (deleted === 0) throw new NotFoundError();
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidateAttendance();
  return { ok: true, message: "勤怠を削除しました" };
}

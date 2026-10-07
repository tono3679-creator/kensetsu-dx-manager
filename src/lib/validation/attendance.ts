import { z } from "zod";

import { zDate, zInt, zOptionalText, zOptionalUuid, zTime, zUuid } from "./common";

export const clockInSchema = z.object({
  projectId: zOptionalUuid("案件"),
  note: zOptionalText("メモ", 500),
});

export const clockOutSchema = z.object({
  attendanceId: zUuid("勤怠"),
  breakMinutes: zInt("休憩時間", 0, 600),
  projectId: zOptionalUuid("案件"),
  note: zOptionalText("メモ", 500),
  /** 前日の退勤打刻漏れを修正する場合の退勤時刻（HH:MM）。未指定なら現在時刻 */
  clockOutTime: z.preprocess((v) => (v === "" ? undefined : v), zTime("退勤時刻").optional()),
});

export const attendanceEditSchema = z
  .object({
    employeeId: zUuid("従業員"),
    workDate: zDate("日付"),
    clockInTime: zTime("出勤時刻"),
    clockOutTime: z.preprocess((v) => (v === "" || v === undefined ? null : v), zTime("退勤時刻").nullable()),
    breakMinutes: zInt("休憩時間", 0, 600),
    projectId: zOptionalUuid("案件"),
    note: zOptionalText("メモ", 500),
  })
  .superRefine((v, ctx) => {
    if (v.clockOutTime && v.clockOutTime <= v.clockInTime) {
      ctx.addIssue({ code: "custom", path: ["clockOutTime"], message: "退勤時刻は出勤時刻より後にしてください" });
    }
  });

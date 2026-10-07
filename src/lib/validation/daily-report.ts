import { z } from "zod";

import { zDate, zInt, zOptionalText, zText, zTime, zUuid } from "./common";

const materialRowSchema = z.object({
  name: z.string().trim().min(1).max(100, "材料名は100文字以内で入力してください"),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "材料数量は小数第2位までの数値で入力してください")
    .refine((v) => Number(v) > 0 && Number(v) < 100_000_000, "材料数量が正しくありません"),
  unit: z.string().trim().max(10, "単位は10文字以内で入力してください"),
});

export const dailyReportSchema = z
  .object({
    projectId: zUuid("案件"),
    reportDate: zDate("日付"),
    startTime: zTime("作業開始時間"),
    endTime: zTime("作業終了時間"),
    breakMinutes: zInt("休憩時間", 0, 600),
    workContent: zText("作業内容", 4000),
    progress: zInt("作業進捗", 0, 100),
    issues: zOptionalText("問題・トラブル", 2000),
    tomorrowPlan: zOptionalText("明日の予定", 2000),
    notes: zOptionalText("備考", 2000),
    workerIds: z.array(z.uuid()).max(50).default([]),
    materialNames: z.array(z.string()).max(30).default([]),
    materialQuantities: z.array(z.string()).max(30).default([]),
    materialUnits: z.array(z.string()).max(30).default([]),
    today: zDate("今日"),
  })
  .transform((v, ctx) => {
    if (v.endTime <= v.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "作業終了時間は開始時間より後にしてください" });
    }
    if (v.reportDate > v.today) {
      ctx.addIssue({ code: "custom", path: ["reportDate"], message: "未来の日付の日報は登録できません" });
    }
    const materials: Array<{ name: string; quantity: string; unit: string | null }> = [];
    v.materialNames.forEach((rawName, i) => {
      const name = rawName.trim();
      const quantity = (v.materialQuantities[i] ?? "").trim();
      if (!name && !quantity) return;
      const parsed = materialRowSchema.safeParse({ name, quantity, unit: v.materialUnits[i] ?? "" });
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", path: ["materials"], message: `使用材料 ${i + 1}行目: ${parsed.error.issues[0]?.message ?? "入力が正しくありません"}` });
        return;
      }
      materials.push({ ...parsed.data, unit: parsed.data.unit || null });
    });
    return {
      projectId: v.projectId,
      reportDate: v.reportDate,
      startTime: v.startTime,
      endTime: v.endTime,
      breakMinutes: v.breakMinutes,
      workContent: v.workContent,
      progress: v.progress,
      issues: v.issues,
      tomorrowPlan: v.tomorrowPlan,
      notes: v.notes,
      workerIds: [...new Set(v.workerIds)],
      materials,
    };
  });

export type DailyReportInput = z.output<typeof dailyReportSchema>;

export const DAILY_REPORT_ARRAY_KEYS = ["workerIds", "materialNames", "materialQuantities", "materialUnits"] as const;

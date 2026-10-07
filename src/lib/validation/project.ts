import { z } from "zod";

import { CONSTRUCTION_TYPES, PROJECT_STATUSES } from "@/types/domain";

import { zDate, zOptionalDate, zOptionalText, zOptionalUuid, zOptionalYen, zText, zUuid } from "./common";

export const projectSchema = z
  .object({
    name: zText("案件名", 200),
    customerId: zUuid("顧客"),
    siteAddress: zOptionalText("現場住所", 200),
    constructionType: z.enum(CONSTRUCTION_TYPES, { error: "工事種別を選択してください" }),
    salesRepId: zOptionalUuid("担当者"),
    siteManagerId: zOptionalUuid("現場責任者"),
    contractAmount: zOptionalYen("受注金額"),
    estimateAmount: zOptionalYen("見積金額"),
    budgetCost: zOptionalYen("予算原価"),
    contractDate: zOptionalDate("契約日"),
    plannedStartDate: zOptionalDate("着工予定日"),
    plannedEndDate: zOptionalDate("完工予定日"),
    actualStartDate: zOptionalDate("実際の着工日"),
    actualEndDate: zOptionalDate("実際の完工日"),
    status: z.enum(PROJECT_STATUSES, { error: "ステータスを選択してください" }),
    memo: zOptionalText("メモ", 4000),
    memberIds: z.array(z.uuid()).max(50).default([]),
  })
  .superRefine((v, ctx) => {
    const ordered = !["estimating", "lost"].includes(v.status);
    if (ordered && v.contractAmount === null) {
      ctx.addIssue({ code: "custom", path: ["contractAmount"], message: "受注以降のステータスでは受注金額を入力してください" });
    }
    if (v.plannedStartDate && v.plannedEndDate && v.plannedEndDate < v.plannedStartDate) {
      ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: "完工予定日は着工予定日以降にしてください" });
    }
    if (v.actualStartDate && v.actualEndDate && v.actualEndDate < v.actualStartDate) {
      ctx.addIssue({ code: "custom", path: ["actualEndDate"], message: "実際の完工日は実際の着工日以降にしてください" });
    }
    if (["completed", "invoiced", "paid"].includes(v.status) && !v.actualEndDate) {
      ctx.addIssue({ code: "custom", path: ["actualEndDate"], message: "完工以降のステータスでは実際の完工日を入力してください" });
    }
  });

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectStatusChangeSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
  date: zDate("日付").optional(),
});

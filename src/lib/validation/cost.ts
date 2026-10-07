import { z } from "zod";

import { EXPENSE_CATEGORIES } from "@/types/domain";

import { zDate, zDecimal, zOptionalText, zText, zUuid, zYen } from "./common";

export const materialSchema = z.object({
  projectId: zUuid("案件"),
  purchaseDate: zDate("日付"),
  name: zText("材料名", 100),
  quantity: zDecimal("数量", { max: 99_999_999 }),
  unit: zOptionalText("単位", 10),
  unitPrice: zDecimal("単価", { max: 9_999_999_999, allowZero: true }),
  supplier: zOptionalText("仕入先", 100),
  memo: zOptionalText("メモ", 500),
});

export const outsourcingSchema = z.object({
  projectId: zUuid("案件"),
  costDate: zDate("日付"),
  vendorName: zText("外注先", 100),
  description: zText("作業内容", 200),
  amount: zYen("金額"),
  memo: zOptionalText("メモ", 500),
});

export const expenseSchema = z.object({
  projectId: zUuid("案件"),
  expenseDate: zDate("日付"),
  category: z.enum(EXPENSE_CATEGORIES, { error: "費目を選択してください" }),
  amount: zYen("金額"),
  memo: zOptionalText("メモ", 500),
});

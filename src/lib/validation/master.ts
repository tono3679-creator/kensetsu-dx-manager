import { z } from "zod";

import { APP_ROLES, EMPLOYMENT_STATUSES } from "@/types/domain";

import { emptyToNull, zInt, zOptionalDate, zOptionalText, zOptionalUuid, zText, zYen } from "./common";

const zPhone = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^[0-9+()\- ]{10,20}$/, "電話番号は数字とハイフンで入力してください（例: 03-1234-5678）")
    .nullable(),
);

const zKana = (label: string) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(30, `${label}は30文字以内で入力してください`)
      .regex(/^[ぁ-んァ-ヶー　 ]+$/, `${label}はひらがな・カタカナで入力してください`)
      .nullable(),
  );

export const employeeSchema = z.object({
  lastName: zText("姓", 30),
  firstName: zText("名", 30),
  lastNameKana: zKana("せい"),
  firstNameKana: zKana("めい"),
  email: z.email("メールアドレスの形式が正しくありません").max(254),
  phone: zPhone,
  departmentId: zOptionalUuid("所属"),
  position: zOptionalText("役職", 30),
  role: z.enum(APP_ROLES, { error: "権限を選択してください" }),
  hourlyCost: zYen("時間原価").refine((v) => v <= 100_000, "時間原価は100,000円以下で入力してください"),
  hireDate: zOptionalDate("入社日"),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES, { error: "在籍状況を選択してください" }),
});

export const customerSchema = z.object({
  name: zText("顧客名", 100),
  corporateName: zOptionalText("法人名", 100),
  contactPerson: zOptionalText("担当者", 50),
  phone: zPhone,
  email: z.preprocess(emptyToNull, z.email("メールアドレスの形式が正しくありません").max(254).nullable()),
  postalCode: z.preprocess(emptyToNull, z.string().trim().regex(/^\d{3}-?\d{4}$/, "郵便番号は 123-4567 の形式で入力してください").nullable()),
  address: zOptionalText("住所", 200),
  memo: zOptionalText("メモ", 2000),
});

export const settingsSchema = z.object({
  companyName: zText("会社名", 100),
  standardWorkMinutes: zInt("所定労働時間", 60, 1440),
  defaultBreakMinutes: zInt("既定の休憩時間", 0, 240),
  costAlertPercent: zInt("原価アラート", 50, 100),
});

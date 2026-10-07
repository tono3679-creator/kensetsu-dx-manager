import { z } from "zod";

/** Server Action の戻り値（useActionState で利用） */
export interface ActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export const initialActionResult: ActionResult = { ok: false };

/** 未送信（undefined）・空文字を null に正規化（任意項目用） */
export const emptyToNull = (value: unknown) =>
  value === undefined || (typeof value === "string" && value.trim() === "") ? null : value;
const stripNumber = (value: unknown) =>
  typeof value === "string" ? value.replace(/[,\s円¥￥]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)) : value;

/** 必須テキスト */
export const zText = (label: string, max: number) =>
  z
    .string({ error: `${label}を入力してください` })
    .trim()
    .min(1, `${label}を入力してください`)
    .max(max, `${label}は${max}文字以内で入力してください`);

/** 任意テキスト（空文字は null） */
export const zOptionalText = (label: string, max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `${label}は${max}文字以内で入力してください`).nullable());

/** 必須日付 YYYY-MM-DD */
export const zDate = (label: string) =>
  z.string({ error: `${label}を入力してください` }).min(1, `${label}を入力してください`).pipe(z.iso.date(`${label}の形式が正しくありません`));

/** 任意日付 */
export const zOptionalDate = (label: string) =>
  z.preprocess(emptyToNull, z.iso.date(`${label}の形式が正しくありません`).nullable());

/** 時刻 HH:MM */
export const zTime = (label: string) =>
  z
    .string({ error: `${label}を入力してください` })
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label}を HH:MM 形式で入力してください`);

/** 必須の金額（円・0以上の整数） */
export const zYen = (label: string) =>
  z.preprocess(
    stripNumber,
    z.coerce
      .number({ error: `${label}を数値で入力してください` })
      .int(`${label}は円単位の整数で入力してください`)
      .min(0, `${label}は0以上で入力してください`)
      .max(99_999_999_999, `${label}が大きすぎます`),
  );

/** 任意の金額 */
export const zOptionalYen = (label: string) =>
  z.preprocess(
    (v) => emptyToNull(stripNumber(v)),
    z.coerce
      .number({ error: `${label}を数値で入力してください` })
      .int(`${label}は円単位の整数で入力してください`)
      .min(0, `${label}は0以上で入力してください`)
      .max(99_999_999_999, `${label}が大きすぎます`)
      .nullable(),
  );

/** 小数第2位までの数量・単価（文字列のまま保持し、DB の numeric に渡す） */
export const zDecimal = (label: string, options: { min?: number; max: number; allowZero?: boolean }) =>
  z.preprocess(
    stripNumber,
    z
      .string({ error: `${label}を入力してください` })
      .min(1, `${label}を入力してください`)
      .regex(/^\d+(\.\d{1,2})?$/, `${label}は小数第2位までの数値で入力してください`)
      .refine((v) => (options.allowZero ? Number(v) >= 0 : Number(v) > 0), `${label}は${options.allowZero ? "0以上" : "0より大きい値"}で入力してください`)
      .refine((v) => Number(v) <= options.max, `${label}が大きすぎます`),
  );

export const zInt = (label: string, min: number, max: number) =>
  z.preprocess(
    stripNumber,
    z.coerce
      .number({ error: `${label}を数値で入力してください` })
      .int(`${label}は整数で入力してください`)
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`),
  );

export const zUuid = (label: string) => z.uuid(`${label}を選択してください`);

export const zOptionalUuid = (label: string) => z.preprocess(emptyToNull, z.uuid(`${label}が不正です`).nullable());

/** FormData をオブジェクトに変換（同名キーが複数ある場合は配列） */
export function formDataToObject(formData: FormData, arrayKeys: readonly string[] = []): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((v): v is string => typeof v === "string");
    result[key] = arrayKeys.includes(key) ? values : (values[0] ?? "");
  }
  for (const key of arrayKeys) result[key] ??= [];
  return result;
}

export function validationFailed(error: z.ZodError): ActionResult {
  return {
    ok: false,
    message: "入力内容に誤りがあります。赤字の項目を確認してください。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

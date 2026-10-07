/**
 * 金額計算ユーティリティ
 * 浮動小数点の誤差を避けるため、小数は 100 倍した整数に変換して計算する。
 * 端数処理は PostgreSQL の round()（四捨五入・0 から遠い方向）と一致させる。
 */

/** 正の値は四捨五入、負の値は 0 から遠い方向に丸める（PostgreSQL の numeric round と同じ） */
export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/**
 * 小数第2位までの数値文字列を 100 倍した整数に変換する。
 * "12.5" → 1250, "1,234" → 123400。不正な値は null。
 */
export function toCents(value: string | number): number | null {
  const text = String(value).replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return null;
  const negative = text.startsWith("-");
  const [intPart, fracPart = ""] = text.replace("-", "").split(".");
  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** 材料費: 金額 = 数量 × 単価（円未満四捨五入）。DB の生成列と同じ結果になる */
export function calcMaterialAmount(quantity: string | number, unitPrice: string | number): number | null {
  const q = toCents(quantity);
  const p = toCents(unitPrice);
  if (q === null || p === null) return null;
  // q, p はそれぞれ 100 倍されているので積は 10,000 倍
  const product = q * p;
  if (!Number.isSafeInteger(product)) return null;
  const quotient = Math.trunc(product / 10_000);
  const remainder = Math.abs(product % 10_000);
  return quotient + (remainder >= 5_000 ? Math.sign(product) : 0);
}

/** 労務費 = 時間原価 × 実働分 ÷ 60（円未満四捨五入） */
export function calcLaborCost(hourlyCost: number, workMinutes: number): number {
  return roundHalfAwayFromZero((hourlyCost * workMinutes) / 60);
}

/** 粗利益 = 受注金額 - 総原価 */
export function calcGrossProfit(contractAmount: number, totalCost: number): number {
  return contractAmount - totalCost;
}

/** 利益率(%) = 粗利益 ÷ 受注金額 × 100（小数第1位で四捨五入）。受注金額が 0 / 未設定なら null */
export function calcProfitRate(contractAmount: number | null, totalCost: number): number | null {
  if (!contractAmount) return null;
  const permille = ((contractAmount - totalCost) * 1000) / contractAmount;
  return roundHalfAwayFromZero(permille) / 10;
}

/** 予算消化率(%) = 総原価 ÷ 予算原価 × 100 */
export function calcBudgetUsageRate(budgetCost: number | null, totalCost: number): number | null {
  if (!budgetCost) return null;
  return roundHalfAwayFromZero((totalCost * 1000) / budgetCost) / 10;
}

export function sum(values: readonly (number | null | undefined)[]): number {
  let total = 0;
  for (const v of values) total += v ?? 0;
  return total;
}

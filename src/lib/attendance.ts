/**
 * 勤怠計算（DB の生成列 / ビューと同じロジック。画面のプレビュー表示とテストで使用）
 *   実働時間 = 退勤 - 出勤 - 休憩
 *   残業時間 = max(0, 実働時間 - 所定労働時間)
 */

export function calcWorkMinutes(clockInIso: string, clockOutIso: string | null, breakMinutes: number): number | null {
  if (!clockOutIso) return null;
  const elapsed = Math.floor((new Date(clockOutIso).getTime() - new Date(clockInIso).getTime()) / 60_000);
  return Math.max(0, elapsed - breakMinutes);
}

export function calcOvertimeMinutes(workMinutes: number | null, standardWorkMinutes: number): number | null {
  if (workMinutes === null) return null;
  return Math.max(0, workMinutes - standardWorkMinutes);
}

/** 時刻文字列 "HH:MM" or "HH:MM:SS" → 0時からの分 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

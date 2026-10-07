/**
 * 日付ユーティリティ（日本時間基準）
 * 業務日付は "YYYY-MM-DD" 文字列で扱い、タイムゾーンによるずれを防ぐ。
 */

export const TIME_ZONE = "Asia/Tokyo";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hmFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Date → 日本時間の "YYYY-MM-DD" */
export function toJstDateString(date: Date = new Date()): string {
  return ymdFormatter.format(date);
}

export function todayJst(): string {
  return toJstDateString(new Date());
}

/** ISO 日時 → 日本時間の "HH:MM" */
export function toJstTimeString(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return hmFormatter.format(date);
}

/** 日本時間の日付と時刻 → ISO 8601 (UTC) */
export function jstToIso(date: string, time: string): string {
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  return new Date(`${date}T${hhmm}:00+09:00`).toISOString();
}

function toUtcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcDate(d);
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromUtcDate(target);
}

/** a - b の日数 */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcDate(a).getTime() - toUtcDate(b).getTime()) / 86_400_000);
}

/** 0=日曜 ... 6=土曜 */
export function dayOfWeek(date: string): number {
  return toUtcDate(date).getUTCDay();
}

export function isWeekend(date: string): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return fromUtcDate(new Date(Date.UTC(y, m, 0)));
}

/** "YYYY-MM" */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthRange(key: string): { start: string; end: string } {
  const start = `${key}-01`;
  return { start, end: endOfMonth(start) };
}

/** today を含む直近 n ヶ月の "YYYY-MM"（古い順） */
export function recentMonthKeys(today: string, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(monthKey(addMonths(startOfMonth(today), -i)));
  return keys;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtcDate(toUtcDate(value)) === value;
}

/** from〜to の日付を列挙（両端含む） */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** 直前の平日（土日を除く） */
export function previousWeekday(date: string): string {
  let d = addDays(date, -1);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}

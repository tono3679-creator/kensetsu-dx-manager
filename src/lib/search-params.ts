import { isValidDateString } from "./date";

export type SearchParams = Record<string, string | string[] | undefined>;

/** 先頭の値を取得（空文字は undefined） */
export function param(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ? first.trim() : undefined;
}

export function enumParam<T extends string>(params: SearchParams, key: string, allowed: readonly T[]): T | undefined {
  const value = param(params, key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function dateParam(params: SearchParams, key: string): string | undefined {
  const value = param(params, key);
  return value && isValidDateString(value) ? value : undefined;
}

/** "YYYY-MM" */
export function monthParam(params: SearchParams, key: string): string | undefined {
  const value = param(params, key);
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

export function uuidParam(params: SearchParams, key: string): string | undefined {
  const value = param(params, key);
  return isUuid(value) ? value : undefined;
}

/** 検索語の長さを制限 */
export function textParam(params: SearchParams, key: string, max = 50): string | undefined {
  return param(params, key)?.slice(0, max);
}

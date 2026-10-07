/**
 * デモモード用のセッショントークン（HMAC-SHA256 署名付き Cookie）。
 * Web Crypto API のみを使用するため proxy / Server Components の双方で利用できる。
 */

export const DEMO_SESSION_COOKIE = "kdx_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: string;
  exp: number;
}

const DEV_FALLBACK_SECRET = "kensetsu-dx-manager-local-development-secret";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    // 本番で未設定の場合はプロセスごとのランダム値（再起動でログアウトされる）
    const store = globalThis as typeof globalThis & { __kdxEphemeralSecret?: string };
    store.__kdxEphemeralSecret ??= crypto.randomUUID() + crypto.randomUUID();
    return store.__kdxEphemeralSecret;
  }
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createSessionToken(authUserId: string): Promise<string> {
  const payload: SessionPayload = { sub: authUserId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

/** 署名と有効期限を検証し、ユーザーIDを返す。不正なら null */
export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(signature) as Uint8Array<ArrayBuffer>,
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as Partial<SessionPayload>;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

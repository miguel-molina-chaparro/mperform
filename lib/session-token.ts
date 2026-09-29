export const SESSION_COOKIE_NAME = "mperform_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 dias

type SessionPayload = {
  v: 1;
  exp: number;
};

const encoder = new TextEncoder();

// Valores pegados en el dashboard de Vercel suelen arrastrar espacios o saltos de linea.
function leerEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getAppPassword(): string | undefined {
  return leerEnv("APP_PASSWORD");
}

export function getSessionSecret(): string | undefined {
  return leerEnv("APP_SESSION_SECRET") ?? getAppPassword();
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Comparacion en tiempo constante: se comparan los HMAC, no los textos. */
export async function textosIguales(a: string, b: string, secret: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([hmac(a, secret), hmac(b, secret)]);
  return sameBytes(ha, hb);
}

export async function firmarSesion(secret: string, now = Date.now()): Promise<string> {
  const payload: SessionPayload = { v: 1, exp: now + SESSION_TTL_SECONDS * 1000 };
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(encoded, secret));
  return `${encoded}.${signature}`;
}

export async function verificarSesion(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = bytesToBase64Url(await hmac(encoded, secret));
  if (!sameBytes(encoder.encode(expected), encoder.encode(signature))) return false;

  try {
    const payload = JSON.parse(base64UrlToString(encoded)) as SessionPayload;
    return payload.v === 1 && payload.exp > now;
  } catch {
    return false;
  }
}

/** Evita redirecciones abiertas: solo rutas internas absolutas. */
export function rutaSegura(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/login" || next.startsWith("/login?")) return "/";
  return next;
}

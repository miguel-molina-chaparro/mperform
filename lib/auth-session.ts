import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "mperform_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 dias

type SessionPayload = {
  v: 1;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = `${base64}${"=".repeat(padLength)}`;
  return Buffer.from(padded, "base64").toString("utf8");
}

async function hmacSha256(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input),
  );
  return Buffer.from(signature)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET ?? process.env.APP_PASSWORD;
  if (!secret) {
    throw new Error("Falta APP_PASSWORD o APP_SESSION_SECRET");
  }
  return secret;
}

async function signPayload(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(encodedPayload, getSessionSecret());
  return `${encodedPayload}.${signature}`;
}

async function verifySignedToken(token: string): Promise<boolean> {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expected = await hmacSha256(encodedPayload, getSessionSecret());
  if (signature !== expected) return false;

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    return parsed.v === 1 && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function crearSesionCookie() {
  const token = await signPayload({
    v: 1,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function borrarSesionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export { SESSION_COOKIE_NAME, verifySignedToken };

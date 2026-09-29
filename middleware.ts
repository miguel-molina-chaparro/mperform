import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "mperform_session";

function base64UrlToBase64(input: string) {
  const replaced = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (replaced.length % 4)) % 4;
  return `${replaced}${"=".repeat(padLength)}`;
}

function decodePayload(encodedPayload: string) {
  const base64 = base64UrlToBase64(encodedPayload);
  return atob(base64);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signValue(value: string, secret: string) {
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
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.APP_SESSION_SECRET ?? process.env.APP_PASSWORD;
  if (!token || !secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await signValue(payload, secret);
  if (expected !== signature) return false;

  try {
    const parsed = JSON.parse(decodePayload(payload)) as { v: number; exp: number };
    return parsed.v === 1 && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml");

  if (isPublic) return NextResponse.next();

  const validSession = await hasValidSession(request);
  if (validSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

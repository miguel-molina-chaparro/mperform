import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  verificarSesion,
} from "@/lib/session-token";

const RUTAS_PUBLICAS = new Set(["/login", "/api/health"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (RUTAS_PUBLICAS.has(pathname)) return NextResponse.next();

  const valida = await verificarSesion(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    getSessionSecret(),
  );
  if (valida) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};

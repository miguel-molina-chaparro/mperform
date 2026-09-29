import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/logger";
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  verificarSesion,
} from "@/lib/session-token";

const RUTAS_PUBLICAS = new Set(["/login", "/api/health", "/api/client-error"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (RUTAS_PUBLICAS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = getSessionSecret();
  const valida = await verificarSesion(token, secret);
  if (valida) return NextResponse.next();

  if (!secret) {
    log.error("auth.sin_secreto", { ruta: pathname });
  } else if (token) {
    // Cookie presente pero rechazada: caducada o firmada con otro secreto
    // (p. ej. tras cambiar APP_PASSWORD/APP_SESSION_SECRET). Si se repite, hay bucle de login.
    log.warn("auth.cookie_invalida", { ruta: pathname });
  } else {
    log.debug("auth.sin_sesion", { ruta: pathname });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};

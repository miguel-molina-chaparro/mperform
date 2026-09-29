import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  firmarSesion,
  getSessionSecret,
  verificarSesion,
} from "@/lib/session-token";

export class NoAutorizadoError extends Error {
  constructor() {
    super("Sesion no valida. Vuelve a iniciar sesion.");
    this.name = "NoAutorizadoError";
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function crearSesionCookie() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Falta APP_PASSWORD o APP_SESSION_SECRET");

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, await firmarSesion(secret), {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function borrarSesionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
}

export async function haySesionValida(): Promise<boolean> {
  const jar = await cookies();
  return verificarSesion(jar.get(SESSION_COOKIE_NAME)?.value, getSessionSecret());
}

/** Las Server Actions son endpoints publicos: cada una debe comprobar la sesion. */
export async function requireSession() {
  if (!(await haySesionValida())) throw new NoAutorizadoError();
}

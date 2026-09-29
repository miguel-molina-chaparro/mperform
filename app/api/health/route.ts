import { Prisma } from "@prisma/client";
import { connection } from "next/server";

import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getAppPassword } from "@/lib/session-token";

// Ruta publica de diagnostico: solo expone si cada pieza esta configurada, nunca valores.
export async function GET() {
  await connection();

  const env = {
    APP_PASSWORD: Boolean(getAppPassword()),
    APP_SESSION_SECRET: Boolean(process.env.APP_SESSION_SECRET?.trim()),
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
  };

  let database: { ok: boolean; entradas?: number; error?: string };
  try {
    database = { ok: true, entradas: await prisma.dailyEntry.count() };
  } catch (error) {
    let code = "desconocido";
    if (error instanceof Prisma.PrismaClientKnownRequestError) code = error.code;
    else if (error instanceof Prisma.PrismaClientInitializationError) {
      code = error.errorCode ?? "sin_conexion";
    }
    const hint =
      code === "P2021"
        ? "Faltan las tablas: ejecuta `npx prisma migrate deploy` contra esta base de datos."
        : "No se pudo consultar la base de datos: revisa DATABASE_URL.";
    database = { ok: false, error: `${code}: ${hint}` };
    log.error("health.bd_fallo", { code, error });
  }

  const ok = env.APP_PASSWORD && database.ok;
  if (!ok) log.warn("health.no_ok", { env, database: database.ok });
  return Response.json({ ok, env, database }, { status: ok ? 200 : 503 });
}

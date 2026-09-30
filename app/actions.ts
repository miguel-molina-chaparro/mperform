"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  NoAutorizadoError,
  borrarSesionCookie,
  crearSesionCookie,
  requireSession,
} from "@/lib/auth-session";
import { eliminarEntrada, guardarEntrada, sobrescribirEntradasDeFecha } from "@/lib/data";
import type { ImportEntryInput } from "@/lib/importExport";
import { log, medir, serializarError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getAppPassword,
  getSessionSecret,
  rutaSegura,
  textosIguales,
} from "@/lib/session-token";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

type GuardarEntradaInput = {
  fecha: string;
  rendimientoTrabajo: number;
  movil17: boolean;
  movilResto: boolean;
  np: boolean;
  ejercicio: boolean;
  formacion: boolean;
  leer: boolean;
  social: boolean;
  nf: number;
};

// En produccion Next oculta el mensaje de los errores lanzados en una Server Action,
// asi que se traducen aqui a un mensaje que el cliente pueda mostrar.
// Los errores de uso (sesion, validacion) se registran como warn; los de infraestructura como error.
function mensajeDeError(error: unknown, contexto: string): string {
  const evento = `accion.${contexto}.fallo`;

  if (error instanceof NoAutorizadoError) {
    log.warn(evento, { motivo: "sin_sesion" });
    return error.message;
  }
  if (error instanceof z.ZodError) {
    log.warn(evento, {
      motivo: "validacion",
      problemas: error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    });
    return error.issues[0]?.message ?? "Datos no validos";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      log.warn(evento, { motivo: "no_existe" });
      return "La entrada ya no existe.";
    }
    if (error.code === "P2021") {
      log.error(evento, {
        motivo: "faltan_migraciones",
        ayuda: "Ejecuta `npx prisma migrate deploy` contra la base de datos de este entorno.",
        error,
      });
      return "La base de datos no tiene las tablas creadas (faltan migraciones).";
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    log.error(evento, { motivo: "sin_conexion_bd", error });
    return "No se pudo conectar a la base de datos.";
  }
  if (error instanceof Error && error.message === "Fecha invalida") {
    log.warn(evento, { motivo: "fecha_invalida" });
    return error.message;
  }

  log.error(evento, { motivo: "inesperado", error });
  return "Error inesperado en el servidor.";
}

async function ipCliente(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
}

function revalidarTodo() {
  revalidatePath("/");
  revalidatePath("/estadisticas");
  revalidatePath("/sugerencias");
  revalidatePath("/importar-exportar");
}

export async function loginAction(
  password: string,
  next?: string,
): Promise<ActionResult> {
  const expected = getAppPassword();
  const secret = getSessionSecret();
  const ip = await ipCliente();

  if (!expected || !secret) {
    log.error("login.sin_configuracion", {
      ip,
      ayuda: "APP_PASSWORD no llega al servidor: revisa que exista para este entorno y haz Redeploy.",
    });
    return {
      ok: false,
      message: "El servidor no tiene APP_PASSWORD configurada.",
    };
  }

  if (typeof password !== "string" || !(await textosIguales(password.trim(), expected, secret))) {
    // La longitud ayuda a detectar comillas o caracteres de mas sin revelar la contraseña.
    log.warn("login.contrasena_incorrecta", {
      ip,
      longitudIntroducida: typeof password === "string" ? password.trim().length : null,
      longitudEsperada: expected.length,
    });
    return { ok: false, message: "Contraseña incorrecta." };
  }

  try {
    await crearSesionCookie();
  } catch (error) {
    return { ok: false, message: mensajeDeError(error, "login") };
  }

  const destino = rutaSegura(next);
  log.info("login.ok", { ip, destino });
  redirect(destino);
}

export async function logoutAction() {
  await borrarSesionCookie();
  log.info("logout.ok", { ip: await ipCliente() });
}

export async function guardarEntradaAction(input: GuardarEntradaInput, id?: string) {
  try {
    await requireSession();
    if (id !== undefined && (typeof id !== "string" || id.length === 0)) {
      return { ok: false as const, message: "Identificador de registro no válido." };
    }
    const entry = await medir("bd.guardarEntrada", () => guardarEntrada(input, id), {
      fecha: input.fecha,
      id,
    });
    revalidarTodo();
    log.info(id ? "entrada.actualizada" : "entrada.creada", {
      id: entry.id,
      fecha: input.fecha,
      total: entry.total,
    });
    return {
      ok: true as const,
      data: { ...entry, fecha: entry.fecha.toISOString() },
    };
  } catch (error) {
    return { ok: false as const, message: mensajeDeError(error, "guardarEntrada") };
  }
}

export async function eliminarEntradaAction(id: string): Promise<ActionResult> {
  try {
    await requireSession();
    if (typeof id !== "string" || id.length === 0) {
      return { ok: false, message: "Identificador de registro no válido." };
    }
    const entry = await medir("bd.eliminarEntrada", () => eliminarEntrada(id), { id });
    revalidarTodo();
    log.info("entrada.eliminada", { id, fecha: entry.fecha.toISOString().slice(0, 10) });
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, message: mensajeDeError(error, "eliminarEntrada") };
  }
}

const importRowSchema = z.object({
  fecha: z.string(),
  rendimientoTrabajo: z.number(),
  movil17: z.boolean(),
  movilResto: z.boolean(),
  np: z.boolean(),
  ejercicio: z.boolean(),
  formacion: z.boolean(),
  leer: z.boolean(),
  social: z.boolean(),
  nf: z.number().int().min(0),
});

export type ImportSummary = {
  imported: number;
  updated: number;
  skippedExisting: number;
  invalid: number;
  existingDates: string[];
};

export async function importarEntradasAction(
  rows: ImportEntryInput[],
  overwriteExisting: boolean,
): Promise<ActionResult<ImportSummary>> {
  try {
    await requireSession();

    const parsedRows = rows.map((row) => importRowSchema.parse(row));
    const fechas = parsedRows.map((row) => new Date(row.fecha));
    const existentes = await prisma.dailyEntry.findMany({
      where: { fecha: { in: fechas } },
      select: { fecha: true },
    });
    const existingSet = new Set(
      existentes.map((entry) => entry.fecha.toISOString().slice(0, 10)),
    );

    let imported = 0;
    let updated = 0;
    let skippedExisting = 0;
    let invalid = 0;
    const muestraErrores: Record<string, unknown>[] = [];
    const inicio = performance.now();

    for (const row of parsedRows) {
      try {
        const exists = existingSet.has(row.fecha);
        if (exists && !overwriteExisting) {
          skippedExisting += 1;
          continue;
        }
        if (exists) {
          await sobrescribirEntradasDeFecha(row);
          updated += 1;
        } else {
          await guardarEntrada(row);
          imported += 1;
        }
      } catch (error) {
        invalid += 1;
        if (muestraErrores.length < 5) {
          muestraErrores.push({ fecha: row.fecha, error: serializarError(error) });
        }
      }
    }

    revalidarTodo();

    const resumen = {
      filas: parsedRows.length,
      imported,
      updated,
      skippedExisting,
      invalid,
      overwriteExisting,
      ms: Math.round(performance.now() - inicio),
    };
    if (invalid > 0) log.warn("importacion.con_errores", { ...resumen, muestraErrores });
    else log.info("importacion.ok", resumen);

    return {
      ok: true,
      data: {
        imported,
        updated,
        skippedExisting,
        invalid,
        existingDates: Array.from(existingSet),
      },
    };
  } catch (error) {
    return { ok: false, message: mensajeDeError(error, "importarEntradas") };
  }
}

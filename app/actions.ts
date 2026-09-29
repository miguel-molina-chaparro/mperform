"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  NoAutorizadoError,
  borrarSesionCookie,
  crearSesionCookie,
  requireSession,
} from "@/lib/auth-session";
import { eliminarEntrada, guardarEntrada } from "@/lib/data";
import type { ImportEntryInput } from "@/lib/importExport";
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
function mensajeDeError(error: unknown, contexto: string): string {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Datos no validos";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return "La entrada ya no existe.";
    if (error.code === "P2021") {
      console.error(`[${contexto}] Falta la tabla: ejecuta "prisma migrate deploy".`, error);
      return "La base de datos no tiene las tablas creadas (faltan migraciones).";
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(`[${contexto}] No se pudo conectar a la base de datos.`, error);
    return "No se pudo conectar a la base de datos.";
  }
  if (error instanceof Error && error.message === "Fecha invalida") return error.message;

  console.error(`[${contexto}]`, error);
  return "Error inesperado en el servidor.";
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
  if (!expected || !secret) {
    console.error("[login] APP_PASSWORD no esta definida en este entorno.");
    return {
      ok: false,
      message: "El servidor no tiene APP_PASSWORD configurada.",
    };
  }

  if (typeof password !== "string" || !(await textosIguales(password.trim(), expected, secret))) {
    return { ok: false, message: "Contraseña incorrecta." };
  }

  try {
    await crearSesionCookie();
  } catch (error) {
    return { ok: false, message: mensajeDeError(error, "login") };
  }

  redirect(rutaSegura(next));
}

export async function logoutAction() {
  await borrarSesionCookie();
}

export async function guardarEntradaAction(input: GuardarEntradaInput) {
  try {
    await requireSession();
    const entry = await guardarEntrada(input);
    revalidarTodo();
    return {
      ok: true as const,
      data: { ...entry, fecha: entry.fecha.toISOString() },
    };
  } catch (error) {
    return { ok: false as const, message: mensajeDeError(error, "guardarEntrada") };
  }
}

export async function eliminarEntradaAction(fecha: string): Promise<ActionResult> {
  try {
    await requireSession();
    await eliminarEntrada(fecha);
    revalidarTodo();
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

    for (const row of parsedRows) {
      try {
        const exists = existingSet.has(row.fecha);
        if (exists && !overwriteExisting) {
          skippedExisting += 1;
          continue;
        }
        await guardarEntrada(row);
        imported += 1;
        if (exists) updated += 1;
      } catch {
        invalid += 1;
      }
    }

    revalidarTodo();

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

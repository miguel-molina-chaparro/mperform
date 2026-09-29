"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { borrarSesionCookie, crearSesionCookie } from "@/lib/auth-session";
import { eliminarEntrada, guardarEntrada } from "@/lib/data";
import type { ImportEntryInput } from "@/lib/importExport";
import { prisma } from "@/lib/prisma";

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

type LoginActionResult = {
  ok: boolean;
  message?: string;
};

export async function guardarEntradaAction(input: GuardarEntradaInput) {
  const entry = await guardarEntrada(input);
  revalidatePath("/");

  return {
    ...entry,
    fecha: entry.fecha.toISOString(),
  };
}

export async function loginAction(password: string): Promise<LoginActionResult> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return {
      ok: false,
      message: "APP_PASSWORD no esta configurada en el servidor.",
    };
  }

  if (!password || password !== expected) {
    return { ok: false, message: "Contrasena incorrecta." };
  }

  await crearSesionCookie();
  return { ok: true };
}

export async function logoutAction() {
  await borrarSesionCookie();
}

export async function eliminarEntradaAction(fecha: string) {
  await eliminarEntrada(fecha);
  revalidatePath("/");
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

export async function importarEntradasAction(
  rows: ImportEntryInput[],
  overwriteExisting: boolean,
) {
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

  revalidatePath("/");
  revalidatePath("/estadisticas");
  revalidatePath("/sugerencias");

  return {
    imported,
    updated,
    skippedExisting,
    invalid,
    existingDates: Array.from(existingSet),
  };
}

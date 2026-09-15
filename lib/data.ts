"use server";

import { isValid, parseISO } from "date-fns";
import { z } from "zod";

import { calcularTotal, nfInputAValor } from "@/lib/calculos";
import { prisma } from "@/lib/prisma";

const fechaSchema = z.union([z.string(), z.date()]);

const entradaSchema = z
  .object({
    fecha: fechaSchema,
    rendimientoTrabajo: z
      .number()
      .min(0)
      .max(24)
      .refine(
        (value) => Number.isInteger(value * 10),
        "rendimientoTrabajo debe tener como maximo 1 decimal",
      ),
    movil17: z.boolean(),
    movilResto: z.boolean(),
    np: z.boolean(),
    ejercicio: z.boolean(),
    formacion: z.boolean(),
    leer: z.boolean(),
    social: z.boolean(),
    nf: z.number().int().min(0),
  })
  .strict();

function normalizarFechaAUTC(fecha: string | Date): Date {
  const date = typeof fecha === "string" ? parseISO(fecha) : fecha;

  if (!isValid(date)) {
    throw new Error("Fecha invalida");
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function obtenerEntradas() {
  try {
    return await prisma.dailyEntry.findMany({
      orderBy: {
        fecha: "desc",
      },
    });
  } catch (error) {
    console.error("No se pudieron cargar entradas:", error);
    return [];
  }
}

export async function obtenerEntradaPorFecha(fecha: string | Date) {
  const fechaNormalizada = normalizarFechaAUTC(fecha);

  return prisma.dailyEntry.findUnique({
    where: {
      fecha: fechaNormalizada,
    },
  });
}

export async function guardarEntrada(datos: z.input<typeof entradaSchema>) {
  const parsed = entradaSchema.parse(datos);
  const fechaNormalizada = normalizarFechaAUTC(parsed.fecha);
  const nfValor = nfInputAValor(parsed.nf);

  const total = calcularTotal({
    rendimientoTrabajo: parsed.rendimientoTrabajo,
    movil17: parsed.movil17,
    movilResto: parsed.movilResto,
    np: parsed.np,
    ejercicio: parsed.ejercicio,
    formacion: parsed.formacion,
    leer: parsed.leer,
    social: parsed.social,
    nfValor,
  });

  return prisma.dailyEntry.upsert({
    where: {
      fecha: fechaNormalizada,
    },
    update: {
      rendimientoTrabajo: parsed.rendimientoTrabajo,
      movil17: parsed.movil17,
      movilResto: parsed.movilResto,
      np: parsed.np,
      ejercicio: parsed.ejercicio,
      formacion: parsed.formacion,
      leer: parsed.leer,
      social: parsed.social,
      nf: parsed.nf,
      total,
    },
    create: {
      fecha: fechaNormalizada,
      rendimientoTrabajo: parsed.rendimientoTrabajo,
      movil17: parsed.movil17,
      movilResto: parsed.movilResto,
      np: parsed.np,
      ejercicio: parsed.ejercicio,
      formacion: parsed.formacion,
      leer: parsed.leer,
      social: parsed.social,
      nf: parsed.nf,
      total,
    },
  });
}

export async function eliminarEntrada(fecha: string | Date) {
  const fechaNormalizada = normalizarFechaAUTC(fecha);

  return prisma.dailyEntry.delete({
    where: {
      fecha: fechaNormalizada,
    },
  });
}

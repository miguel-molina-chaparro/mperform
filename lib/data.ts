import "server-only";

import { connection } from "next/server";
import { z } from "zod";

import { calcularTotal, nfInputAValor } from "@/lib/calculos";
import { normalizarFechaAUTC } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";

const fechaSchema = z.union([z.string(), z.date()]);

export const entradaSchema = z
  .object({
    fecha: fechaSchema,
    rendimientoTrabajo: z
      .number()
      .min(0)
      .max(24)
      .refine(
        // Tolerancia para valores calculados en Excel (0.1 + 0.2 = 0.30000000000000004).
        (value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9,
        "Rendimiento Trabajo admite como maximo 1 decimal",
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

export async function obtenerEntradas() {
  // Sin esto las paginas se prerenderizan en el build y los datos quedan congelados.
  await connection();

  return prisma.dailyEntry.findMany({
    orderBy: {
      fecha: "desc",
    },
  });
}

export async function obtenerEntradaPorFecha(fecha: string | Date) {
  return prisma.dailyEntry.findUnique({
    where: {
      fecha: normalizarFechaAUTC(fecha),
    },
  });
}

export async function guardarEntrada(datos: z.input<typeof entradaSchema>) {
  const parsed = entradaSchema.parse(datos);
  const fechaNormalizada = normalizarFechaAUTC(parsed.fecha);

  const valores = {
    rendimientoTrabajo: parsed.rendimientoTrabajo,
    movil17: parsed.movil17,
    movilResto: parsed.movilResto,
    np: parsed.np,
    ejercicio: parsed.ejercicio,
    formacion: parsed.formacion,
    leer: parsed.leer,
    social: parsed.social,
    nf: parsed.nf,
    total: calcularTotal({ ...parsed, nfValor: nfInputAValor(parsed.nf) }),
  };

  return prisma.dailyEntry.upsert({
    where: {
      fecha: fechaNormalizada,
    },
    update: valores,
    create: { fecha: fechaNormalizada, ...valores },
  });
}

export async function eliminarEntrada(fecha: string | Date) {
  return prisma.dailyEntry.delete({
    where: {
      fecha: normalizarFechaAUTC(fecha),
    },
  });
}

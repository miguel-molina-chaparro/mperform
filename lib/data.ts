import "server-only";

import { connection } from "next/server";
import { z } from "zod";

import { calcularTotal, nfInputAValor } from "@/lib/calculos";
import { normalizarFechaAUTC } from "@/lib/fechas";
import { medir } from "@/lib/logger";
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

  return medir("bd.obtenerEntradas", () =>
    prisma.dailyEntry.findMany({
      orderBy: {
        fecha: "desc",
      },
    }),
  );
}

function prepararEntrada(datos: z.input<typeof entradaSchema>) {
  const parsed = entradaSchema.parse(datos);
  return {
    fecha: normalizarFechaAUTC(parsed.fecha),
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
}

/** Con `id` actualiza ese registro (incluida la fecha); sin `id` crea uno nuevo. */
export async function guardarEntrada(datos: z.input<typeof entradaSchema>, id?: string) {
  const valores = prepararEntrada(datos);
  if (id) {
    return prisma.dailyEntry.update({ where: { id }, data: valores });
  }
  return prisma.dailyEntry.create({ data: valores });
}

/** Actualiza todos los registros de esa fecha. Devuelve cuantos se han modificado. */
export async function sobrescribirEntradasDeFecha(datos: z.input<typeof entradaSchema>) {
  const valores = prepararEntrada(datos);
  const { count } = await prisma.dailyEntry.updateMany({
    where: { fecha: valores.fecha },
    data: valores,
  });
  return count;
}

export async function eliminarEntrada(id: string) {
  return prisma.dailyEntry.delete({ where: { id } });
}

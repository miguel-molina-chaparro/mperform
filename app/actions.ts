"use server";

import { revalidatePath } from "next/cache";

import { eliminarEntrada, guardarEntrada } from "@/lib/data";

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

export async function guardarEntradaAction(input: GuardarEntradaInput) {
  const entry = await guardarEntrada(input);
  revalidatePath("/");

  return {
    ...entry,
    fecha: entry.fecha.toISOString(),
  };
}

export async function eliminarEntradaAction(fecha: string) {
  await eliminarEntrada(fecha);
  revalidatePath("/");
}

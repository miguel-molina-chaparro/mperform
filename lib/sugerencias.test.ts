import { describe, expect, it } from "vitest";
import type { DailyEntry } from "@prisma/client";

import { generarSugerencias } from "./sugerencias";

function entry(partial: Partial<DailyEntry>): DailyEntry {
  return {
    id: partial.id ?? crypto.randomUUID(),
    fecha: partial.fecha ?? new Date(),
    rendimientoTrabajo: partial.rendimientoTrabajo ?? 3,
    movil17: partial.movil17 ?? false,
    movilResto: partial.movilResto ?? false,
    np: partial.np ?? false,
    ejercicio: partial.ejercicio ?? false,
    formacion: partial.formacion ?? false,
    leer: partial.leer ?? false,
    social: partial.social ?? false,
    nf: partial.nf ?? 1,
    total: partial.total ?? 40,
    createdAt: partial.createdAt ?? new Date(),
    updatedAt: partial.updatedAt ?? new Date(),
  };
}

describe("generarSugerencias", () => {
  it("devuelve estado vacio si hay pocos datos", () => {
    const output = generarSugerencias([entry({}), entry({})]);
    expect(output).toHaveLength(1);
    expect(output[0].tipo).toBe("general");
  });

  it("detecta habitos con bajo cumplimiento", () => {
    const now = new Date();
    const entradas: DailyEntry[] = Array.from({ length: 10 }).map((_, idx) =>
      entry({
        fecha: new Date(now.getTime() - idx * 86400000),
        movil17: idx < 2,
        movilResto: idx < 3,
        np: idx < 2,
        ejercicio: true,
        formacion: true,
        leer: true,
        social: true,
        rendimientoTrabajo: 5,
        total: 60,
      }),
    );

    const output = generarSugerencias(entradas);
    expect(output.some((s) => s.tipo === "habito")).toBe(true);
  });

  it("marca habitos bajos con prioridad alta", () => {
    const now = new Date();
    const entradas: DailyEntry[] = Array.from({ length: 12 }).map((_, idx) =>
      entry({
        fecha: new Date(now.getTime() - idx * 86400000),
        movil17: idx < 2,
        movilResto: false,
        np: false,
        ejercicio: idx % 2 === 0,
        formacion: true,
        leer: true,
        social: true,
        rendimientoTrabajo: 4,
        total: idx < 2 ? 70 : 40,
      }),
    );

    const output = generarSugerencias(entradas);
    const habitosBajos = output.filter((s) => s.tipo === "habito");
    expect(habitosBajos.length).toBeGreaterThan(0);
    expect(habitosBajos.every((s) => s.prioridad === "alta")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { diaFinDeSemana, fechasRepetidas, normalizarFechaAUTC } from "./fechas";

describe("normalizarFechaAUTC", () => {
  it("conserva el dia de calendario de una cadena yyyy-MM-dd", () => {
    expect(normalizarFechaAUTC("2026-09-15").toISOString()).toBe(
      "2026-09-15T00:00:00.000Z",
    );
  });

  it("acepta fechas ISO completas usando su parte de dia", () => {
    expect(normalizarFechaAUTC("2026-09-15T00:00:00.000Z").toISOString()).toBe(
      "2026-09-15T00:00:00.000Z",
    );
  });

  it("rechaza fechas inexistentes o mal formadas", () => {
    expect(() => normalizarFechaAUTC("2026-02-30")).toThrow("Fecha invalida");
    expect(() => normalizarFechaAUTC("15/09/2026")).toThrow("Fecha invalida");
    expect(() => normalizarFechaAUTC(new Date("nope"))).toThrow("Fecha invalida");
  });
});

describe("diaFinDeSemana", () => {
  it("detecta sabados y domingos sin depender de la zona horaria", () => {
    expect(diaFinDeSemana("2026-07-25")).toBe("Sábado");
    expect(diaFinDeSemana("2026-03-01T00:00:00.000Z")).toBe("Domingo");
    expect(diaFinDeSemana("2026-09-28")).toBeNull();
    expect(diaFinDeSemana("2026-10-02")).toBeNull();
  });
});

describe("fechasRepetidas", () => {
  it("devuelve solo las fechas con mas de un registro", () => {
    const repetidas = fechasRepetidas([
      "2026-09-28T00:00:00.000Z",
      "2026-09-29T00:00:00.000Z",
      "2026-09-28",
    ]);
    expect([...repetidas]).toEqual(["2026-09-28"]);
  });
});

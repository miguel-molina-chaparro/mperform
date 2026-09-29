import { describe, expect, it } from "vitest";

import { normalizarFechaAUTC } from "./fechas";

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

import { describe, expect, it } from "vitest";

import { entriesToExcelRows, parseExcelRowsToEntries } from "./importExport";

describe("importExport", () => {
  it("parsea filas de excel y convierte nf real a nf input", () => {
    const rows = [
      [
        "Fecha",
        "Rendimiento Trabajo",
        "Movil - 17 horas",
        "Móvil Resto de día",
        "N.F.",
        "N. P",
        "Ejercicio",
        "Formacion",
        "Leer",
        "Social",
        "Total",
      ],
      [new Date("2026-01-01"), 3.2, 1, 0, -0.3, 1, 0, 1, 1, 0, 50],
    ];
    const result = parseExcelRowsToEntries(rows);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].nf).toBe(3);
  });

  it("detecta duplicadas dentro de archivo", () => {
    const rows = [
      ["Fecha", "Rendimiento Trabajo", "Movil - 17 horas", "Móvil Resto de día", "N.F.", "N. P", "Ejercicio", "Formacion", "Leer", "Social", "Total"],
      [new Date("2026-01-01"), 3, 1, 1, 1, 1, 1, 1, 1, 1, 80],
      [new Date("2026-01-01"), 3, 1, 1, 1, 1, 1, 1, 1, 1, 80],
    ];
    const result = parseExcelRowsToEntries(rows);
    expect(result.duplicateInFileCount).toBe(1);
  });

  it("exporta filas con nf real", () => {
    const rows = entriesToExcelRows([
      {
        fecha: "2026-01-01",
        rendimientoTrabajo: 4,
        movil17: true,
        movilResto: false,
        np: true,
        ejercicio: true,
        formacion: false,
        leer: true,
        social: false,
        nf: 2,
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1][4]).toBe(-0.2);
  });
});

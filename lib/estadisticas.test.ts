import { describe, expect, it } from "vitest";

import {
  calcularCumplimientoHabitos,
  calcularRachas,
  construirSerieTemporal,
  correlacionesHabitos,
  histograma,
  pearson,
  promediosPorDiaSemana,
  resumenAgregado,
} from "./estadisticas";

const sample = [
  {
    fecha: "2026-09-01",
    rendimientoTrabajo: 2,
    total: 30,
    movil17: true,
    movilResto: false,
    np: true,
    ejercicio: false,
    formacion: true,
    leer: false,
    social: true,
  },
  {
    fecha: "2026-09-02",
    rendimientoTrabajo: 4,
    total: 50,
    movil17: true,
    movilResto: true,
    np: true,
    ejercicio: true,
    formacion: false,
    leer: true,
    social: true,
  },
  {
    fecha: "2026-09-03",
    rendimientoTrabajo: 6,
    total: 70,
    movil17: false,
    movilResto: true,
    np: false,
    ejercicio: true,
    formacion: true,
    leer: true,
    social: false,
  },
];

describe("estadisticas", () => {
  it("calcula serie temporal con media movil", () => {
    const serie = construirSerieTemporal(sample);
    expect(serie).toHaveLength(3);
    expect(serie[2].rendimientoMM7).toBeCloseTo(4);
    expect(serie[2].totalMM7).toBeCloseTo(50);
  });

  it("calcula cumplimiento de habitos", () => {
    const cumplimiento = calcularCumplimientoHabitos(sample);
    const np = cumplimiento.find((row) => row.habito === "np");
    expect(np?.porcentaje).toBeCloseTo((2 / 3) * 100);
  });

  it("calcula promedios por dia de semana", () => {
    const data = promediosPorDiaSemana(sample);
    expect(data).toHaveLength(7);
    expect(data.some((row) => row.totalPromedio > 0)).toBe(true);
  });

  it("construye histogramas", () => {
    const h = histograma([1, 2, 3, 4, 5], 5);
    expect(h).toHaveLength(5);
    expect(h.reduce((acc, row) => acc + row.count, 0)).toBe(5);
  });

  it("calcula correlacion de pearson", () => {
    expect(pearson([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1);
  });

  it("calcula correlaciones por habito", () => {
    const rows = correlacionesHabitos(sample);
    expect(rows).toHaveLength(7);
  });

  it("calcula rachas sin asumir dias faltantes", () => {
    const streaks = calcularRachas(sample);
    const movilResto = streaks.find((row) => row.habito === "movilResto");
    expect(movilResto?.actual).toBe(2);
    expect(movilResto?.mejor).toBe(2);
  });

  it("calcula resumen agregado", () => {
    const resumen = resumenAgregado(sample);
    expect(resumen.totalMedio).toBeCloseTo(50);
    expect(resumen.mejorDia?.total).toBe(70);
    expect(resumen.peorDia?.total).toBe(30);
  });
});

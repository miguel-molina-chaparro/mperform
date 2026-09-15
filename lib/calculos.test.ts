import { describe, expect, it } from "vitest";

import { calcularTotal, nfInputAValor, valorANfInput } from "./calculos";

describe("conversiones de nf", () => {
  it("convierte nfInput a nfValor", () => {
    expect(nfInputAValor(0)).toBe(1);
    expect(nfInputAValor(1)).toBe(0);
    expect(nfInputAValor(2)).toBe(-0.2);
    expect(nfInputAValor(3)).toBe(-0.3);
    expect(nfInputAValor(5)).toBe(-0.5);
  });

  it("convierte nfValor a nfInput", () => {
    expect(valorANfInput(1)).toBe(0);
    expect(valorANfInput(0)).toBe(1);
    expect(valorANfInput(-0.2)).toBe(2);
    expect(valorANfInput(-0.3)).toBe(3);
  });
});

describe("calculo de total", () => {
  it("calcula el total del caso real A", () => {
    const total = calcularTotal({
      rendimientoTrabajo: 2.8,
      movil17: false,
      movilResto: true,
      nfValor: 1,
      np: true,
      ejercicio: false,
      formacion: true,
      leer: true,
      social: true,
    });

    expect(total).toBeCloseTo(63.3333333333, 10);
  });

  it("calcula el total del caso real B", () => {
    const total = calcularTotal({
      rendimientoTrabajo: 5.3,
      movil17: false,
      movilResto: false,
      nfValor: -0.2,
      np: false,
      ejercicio: true,
      formacion: true,
      leer: true,
      social: true,
    });

    expect(total).toBeCloseTo(68.1666666667, 10);
  });
});

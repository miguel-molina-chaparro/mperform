export type CalcularTotalInput = {
  rendimientoTrabajo: number;
  movil17: boolean;
  movilResto: boolean;
  np: boolean;
  ejercicio: boolean;
  formacion: boolean;
  leer: boolean;
  social: boolean;
  nfValor: number;
};

export function nfInputAValor(nfInput: number): number {
  if (!Number.isInteger(nfInput) || nfInput < 0) {
    throw new Error("nfInput debe ser un entero mayor o igual a 0");
  }

  if (nfInput === 0) return 1;
  if (nfInput === 1) return 0;

  return Number((-0.1 * nfInput).toFixed(1));
}

export function valorANfInput(nfValor: number): number {
  if (nfValor === 1) return 0;
  if (nfValor === 0) return 1;
  if (nfValor < 0) return Math.round(Math.abs(nfValor) * 10);

  throw new Error("nfValor invalido para conversion");
}

export function calcularTotal(entry: CalcularTotalInput): number {
  const movil17 = entry.movil17 ? 1 : 0;
  const movilResto = entry.movilResto ? 1 : 0;
  const np = entry.np ? 1 : 0;
  const ejercicio = entry.ejercicio ? 1 : 0;
  const formacion = entry.formacion ? 1 : 0;
  const leer = entry.leer ? 1 : 0;
  const social = entry.social ? 1 : 0;

  return (
    entry.rendimientoTrabajo / 0.12 +
    movil17 / 0.2 +
    movilResto / 0.2 +
    entry.nfValor / 0.2 +
    np / 0.1 +
    ejercicio / 0.2 +
    formacion / 0.2 +
    leer / 0.2 +
    social / 0.1
  );
}

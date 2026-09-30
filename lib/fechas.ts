const FECHA_ISO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte una fecha a medianoche UTC del mismo dia de calendario.
 * Las cadenas "yyyy-MM-dd" se interpretan como dia de calendario, no como hora local:
 * de lo contrario, en UTC+2 el dia 15 se guardaria como el 14.
 */
export function normalizarFechaAUTC(fecha: string | Date): Date {
  if (typeof fecha === "string") {
    const match = FECHA_ISO_DIA.exec(fecha.slice(0, 10));
    if (!match) throw new Error("Fecha invalida");

    const [, y, m, d] = match.map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      throw new Error("Fecha invalida");
    }
    return date;
  }

  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha invalida");
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

/** "Sábado" o "Domingo" si la fecha (yyyy-MM-dd...) cae en fin de semana; si no, null. */
export function diaFinDeSemana(fecha: string): "Sábado" | "Domingo" | null {
  const dia = normalizarFechaAUTC(fecha).getUTCDay();
  if (dia === 6) return "Sábado";
  if (dia === 0) return "Domingo";
  return null;
}

/** Claves yyyy-MM-dd que aparecen en mas de un registro. */
export function fechasRepetidas(fechas: string[]): Set<string> {
  const vistas = new Set<string>();
  const repetidas = new Set<string>();
  for (const fecha of fechas) {
    const clave = fecha.slice(0, 10);
    if (vistas.has(clave)) repetidas.add(clave);
    vistas.add(clave);
  }
  return repetidas;
}

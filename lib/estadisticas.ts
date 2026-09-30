import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";

export type DailyEntryLike = {
  fecha: string | Date;
  rendimientoTrabajo: number;
  total: number;
  movil17: boolean;
  movilResto: boolean;
  np: boolean;
  ejercicio: boolean;
  formacion: boolean;
  leer: boolean;
  social: boolean;
};

export type HabitKey =
  | "movil17"
  | "movilResto"
  | "np"
  | "ejercicio"
  | "formacion"
  | "leer"
  | "social";

export const HABIT_KEYS: HabitKey[] = [
  "movil17",
  "movilResto",
  "np",
  "ejercicio",
  "formacion",
  "leer",
  "social",
];

export type DateRangePreset = "7d" | "1m" | "3m" | "all";

type Point = { fecha: Date; value: number };

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function ordenarEntradasAsc<T extends DailyEntryLike>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) => toDate(a.fecha).getTime() - toDate(b.fecha).getTime(),
  );
}

export function filtrarPorRangoPreset<T extends DailyEntryLike>(
  entries: T[],
  preset: DateRangePreset,
  now = new Date(),
): T[] {
  if (preset === "all") return [...entries];

  const from =
    preset === "7d"
      ? subDays(now, 7)
      : preset === "1m"
        ? subMonths(now, 1)
        : subMonths(now, 3);

  return entries.filter((entry) =>
    isWithinInterval(toDate(entry.fecha), { start: from, end: now }),
  );
}

export function mediaMovilPuntos(points: Point[], ventana = 7): number[] {
  if (ventana <= 0) throw new Error("La ventana debe ser mayor a 0");
  const values = points.map((point) => point.value);
  return values.map((_, index) => {
    const start = Math.max(0, index - ventana + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((acc, value) => acc + value, 0) / slice.length;
  });
}

export function construirSerieTemporal(entries: DailyEntryLike[]) {
  const asc = ordenarEntradasAsc(entries);

  const rendimientoMM = mediaMovilPuntos(
    asc.map((entry) => ({
      fecha: toDate(entry.fecha),
      value: entry.rendimientoTrabajo,
    })),
  );
  const totalMM = mediaMovilPuntos(
    asc.map((entry) => ({
      fecha: toDate(entry.fecha),
      value: entry.total,
    })),
  );

  return asc.map((entry, index) => ({
    fecha: format(toDate(entry.fecha), "yyyy-MM-dd"),
    rendimientoTrabajo: entry.rendimientoTrabajo,
    total: entry.total,
    rendimientoMM7: rendimientoMM[index],
    totalMM7: totalMM[index],
  }));
}

export function calcularCumplimientoHabitos(entries: DailyEntryLike[]) {
  const totalDias = entries.length || 1;
  return HABIT_KEYS.map((key) => ({
    habito: key,
    porcentaje:
      (entries.filter((entry) => entry[key]).length / totalDias) * 100,
  }));
}

export function calcularCumplimientoAgregado(
  entries: DailyEntryLike[],
  granularidad: "week" | "month" = "week",
) {
  const asc = ordenarEntradasAsc(entries);
  const grouped = new Map<string, { sum: number; count: number }>();

  for (const entry of asc) {
    const date = toDate(entry.fecha);
    const periodStart =
      granularidad === "week"
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfMonth(date);
    const periodEnd =
      granularidad === "week"
        ? endOfWeek(date, { weekStartsOn: 1 })
        : endOfMonth(date);

    const label = `${format(periodStart, "yyyy-MM-dd")}..${format(periodEnd, "yyyy-MM-dd")}`;
    const cumplidos = HABIT_KEYS.reduce(
      (acc, key) => acc + (entry[key] ? 1 : 0),
      0,
    );
    const ratioDia = (cumplidos / HABIT_KEYS.length) * 100;
    const current = grouped.get(label) ?? { sum: 0, count: 0 };
    grouped.set(label, { sum: current.sum + ratioDia, count: current.count + 1 });
  }

  return Array.from(grouped.entries()).map(([periodo, value]) => ({
    periodo,
    porcentaje: value.sum / value.count,
  }));
}

/**
 * Las fechas se guardan como medianoche UTC, asi que el dia de la semana se
 * calcula en UTC para que no dependa de la zona horaria del navegador.
 * Sabado y domingo solo aparecen si hay registros en esos dias.
 */
export function promediosPorDiaSemana(entries: DailyEntryLike[]) {
  const labels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const grouped = new Map<number, { totalSum: number; rtSum: number; count: number }>();

  for (const entry of entries) {
    const day = ((toDate(entry.fecha).getUTCDay() + 6) % 7) + 1;
    const current = grouped.get(day) ?? { totalSum: 0, rtSum: 0, count: 0 };
    grouped.set(day, {
      totalSum: current.totalSum + entry.total,
      rtSum: current.rtSum + entry.rendimientoTrabajo,
      count: current.count + 1,
    });
  }

  return labels
    .map((label, index) => {
      const value = grouped.get(index + 1);
      return {
        dia: label,
        registros: value?.count ?? 0,
        totalPromedio: value ? value.totalSum / value.count : 0,
        rendimientoPromedio: value ? value.rtSum / value.count : 0,
      };
    })
    .filter((row, index) => index < 5 || row.registros > 0);
}

export function histograma(values: number[], bins = 10) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;
  const buckets = Array.from({ length: bins }, (_, index) => ({
    bin: index,
    min: min + index * width,
    max: min + (index + 1) * width,
    count: 0,
    label: "",
  }));

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / width);
    const safeIndex = Math.min(bins - 1, Math.max(0, rawIndex));
    buckets[safeIndex].count += 1;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    label: `${bucket.min.toFixed(1)}-${bucket.max.toFixed(1)}`,
  }));
}

export function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let i = 0; i < n; i += 1) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }

  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export function correlacionesHabitos(entries: DailyEntryLike[]) {
  return HABIT_KEYS.map((key) => {
    const habit01 = entries.map((entry) => (entry[key] ? 1 : 0));
    return {
      habito: key,
      corrTotal: pearson(
        habit01,
        entries.map((entry) => entry.total),
      ),
      corrRendimiento: pearson(
        habit01,
        entries.map((entry) => entry.rendimientoTrabajo),
      ),
    };
  }).sort(
    (a, b) =>
      Math.abs(b.corrTotal) +
      Math.abs(b.corrRendimiento) -
      (Math.abs(a.corrTotal) + Math.abs(a.corrRendimiento)),
  );
}

export function calcularRachas(entries: DailyEntryLike[]) {
  const desc = [...entries].sort(
    (a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime(),
  );

  return HABIT_KEYS.map((key) => {
    let actual = 0;
    for (const entry of desc) {
      if (!entry[key]) break;
      actual += 1;
    }

    let mejor = 0;
    let current = 0;
    for (const entry of ordenarEntradasAsc(desc)) {
      if (entry[key]) {
        current += 1;
        if (current > mejor) mejor = current;
      } else {
        current = 0;
      }
    }

    return { habito: key, actual, mejor };
  });
}

export function resumenAgregado(entries: DailyEntryLike[]) {
  if (entries.length === 0) {
    return {
      totalMedio: 0,
      rendimientoMedio: 0,
      mejorDia: null as null | { fecha: string; total: number },
      peorDia: null as null | { fecha: string; total: number },
      desviacionTotal: 0,
    };
  }

  const totalMedio =
    entries.reduce((acc, entry) => acc + entry.total, 0) / entries.length;
  const rendimientoMedio =
    entries.reduce((acc, entry) => acc + entry.rendimientoTrabajo, 0) /
    entries.length;
  const sortedByTotal = [...entries].sort((a, b) => b.total - a.total);
  const mejor = sortedByTotal[0];
  const peor = sortedByTotal[sortedByTotal.length - 1];
  const variance =
    entries.reduce((acc, entry) => acc + (entry.total - totalMedio) ** 2, 0) /
    entries.length;

  return {
    totalMedio,
    rendimientoMedio,
    mejorDia: { fecha: format(toDate(mejor.fecha), "yyyy-MM-dd"), total: mejor.total },
    peorDia: { fecha: format(toDate(peor.fecha), "yyyy-MM-dd"), total: peor.total },
    desviacionTotal: Math.sqrt(variance),
  };
}

export function diasConRegistro(entries: DailyEntryLike[]) {
  if (entries.length === 0) return [];
  const asc = ordenarEntradasAsc(entries);
  return eachDayOfInterval({
    start: toDate(asc[0].fecha),
    end: toDate(asc[asc.length - 1].fecha),
  }).filter((day) =>
    asc.some((entry) => format(toDate(entry.fecha), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")),
  );
}

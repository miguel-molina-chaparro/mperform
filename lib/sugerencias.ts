import type { DailyEntry } from "@prisma/client";
import { format, subDays } from "date-fns";

import {
  type HabitKey,
  calcularCumplimientoHabitos,
  calcularRachas,
  correlacionesHabitos,
  ordenarEntradasAsc,
} from "./estadisticas";

export type Sugerencia = {
  tipo: "habito" | "tendencia" | "racha" | "general";
  titulo: string;
  mensaje: string;
  prioridad: "alta" | "media" | "baja";
};

type SuggestionGenerator = (entradas: DailyEntry[]) => Sugerencia[];

const PRIORIDAD_SCORE: Record<Sugerencia["prioridad"], number> = {
  alta: 3,
  media: 2,
  baja: 1,
};

const HABIT_LABELS: Record<HabitKey, string> = {
  movil17: "Movil - 17h",
  movilResto: "Movil resto del dia",
  np: "N.P",
  ejercicio: "Ejercicio",
  formacion: "Formacion",
  leer: "Leer",
  social: "Social",
};

// Umbrales de negocio: faciles de ajustar o mover a config.
const UMBRAL_CUMPLIMIENTO_BAJO = 50; // %
const UMBRAL_CORRELACION_POSITIVA = 0.35; // Pearson
const UMBRAL_CAIDA_TOTAL = -0.1; // -10%
const UMBRAL_RACHA_REFUERZO = 7; // dias con registro consecutivo
const UMBRAL_CAIDA_RENDIMIENTO = -0.1; // -10%

function porcentajeCambio(base: number, nuevo: number) {
  if (base === 0) return 0;
  return (nuevo - base) / base;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function dateKey(input: string | Date) {
  return format(new Date(input), "yyyy-MM-dd");
}

function ultimoCumplimiento(entradas: DailyEntry[], habito: HabitKey) {
  const desc = [...entradas].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  const found = desc.find((entry) => entry[habito]);
  return found ? dateKey(found.fecha) : null;
}

function topLowHabits(
  entradas30: DailyEntry[],
  correlacionesPorHabito: ReturnType<typeof correlacionesHabitos>,
) {
  const cumplimiento = calcularCumplimientoHabitos(entradas30);
  const correlationsMap = new Map(
    correlacionesPorHabito.map((row) => [row.habito, row.corrTotal]),
  );

  return cumplimiento
    .filter((row) => row.porcentaje < UMBRAL_CUMPLIMIENTO_BAJO)
    .map((row) => ({
      habito: row.habito,
      porcentaje: row.porcentaje,
      corrTotal: correlationsMap.get(row.habito) ?? 0,
    }))
    .sort((a, b) => {
      const aBoost =
        a.corrTotal >= UMBRAL_CORRELACION_POSITIVA
          ? 1000 + (100 - a.porcentaje)
          : 100 - a.porcentaje;
      const bBoost =
        b.corrTotal >= UMBRAL_CORRELACION_POSITIVA
          ? 1000 + (100 - b.porcentaje)
          : 100 - b.porcentaje;
      return bBoost - aBoost;
    });
}

function habitoMasDescuidado(entradas30: DailyEntry[]) {
  const cumplimiento = calcularCumplimientoHabitos(entradas30);
  return [...cumplimiento].sort((a, b) => a.porcentaje - b.porcentaje)[0] ?? null;
}

const generarSugerenciasReglas: SuggestionGenerator = (entradas) => {
  const asc = ordenarEntradasAsc(entradas);
  if (asc.length < 7) {
    return [
      {
        tipo: "general",
        prioridad: "media",
        titulo: "Aun no hay datos suficientes",
        mensaje:
          "Necesitas al menos 7 registros para generar sugerencias fiables. Sigue registrando tus dias y vuelve a revisar esta seccion.",
      },
    ];
  }

  const now = new Date();
  const from30 = subDays(now, 30);
  const from7 = subDays(now, 7);
  const from60 = subDays(now, 60);

  const last30 = asc.filter((entry) => new Date(entry.fecha) >= from30);
  const last7 = asc.filter((entry) => new Date(entry.fecha) >= from7);
  const prev30 = asc.filter(
    (entry) =>
      new Date(entry.fecha) >= from60 && new Date(entry.fecha) < from30,
  );

  const baseForHabits = last30.length > 0 ? last30 : asc;
  const correlaciones = correlacionesHabitos(baseForHabits);
  const lowHabits = topLowHabits(baseForHabits, correlaciones);
  const masDescuidado = habitoMasDescuidado(baseForHabits);

  const suggestions: Sugerencia[] = [];

  if (
    masDescuidado &&
    masDescuidado.porcentaje < UMBRAL_CUMPLIMIENTO_BAJO
  ) {
    const ultimaFechaOk = ultimoCumplimiento(baseForHabits, masDescuidado.habito);
    suggestions.push({
      tipo: "habito",
      prioridad: "alta",
      titulo: `Habito mas descuidado: ${HABIT_LABELS[masDescuidado.habito]}`,
      mensaje: `${HABIT_LABELS[masDescuidado.habito]} solo se cumple ${masDescuidado.porcentaje.toFixed(1)}% en la ventana reciente. ${ultimaFechaOk ? `No se cumple desde ${ultimaFechaOk}.` : "No hay dias recientes con cumplimiento de este habito."}`,
    });
  }

  for (const low of lowHabits) {
    const label = HABIT_LABELS[low.habito];
    const ultimaFechaOk = ultimoCumplimiento(baseForHabits, low.habito);
    const correlacionAlta = low.corrTotal >= UMBRAL_CORRELACION_POSITIVA;

    suggestions.push({
      tipo: "habito",
      prioridad: "alta",
      titulo: correlacionAlta
        ? `Impacto alto: refuerza ${label}`
        : `Cumplimiento bajo en ${label}`,
      mensaje: correlacionAlta
        ? `${label} tiene cumplimiento reciente bajo (${low.porcentaje.toFixed(1)}%) y correlacion positiva con Total (${low.corrTotal.toFixed(2)}). Es el ajuste con mayor impacto probable.`
        : `${label} se cumple solo ${low.porcentaje.toFixed(1)}% en la ventana reciente. Ultima vez cumplido: ${ultimaFechaOk ?? "sin registros de cumplimiento recientes"}.`,
    });
  }

  if (last7.length >= 3 && baseForHabits.length >= 7) {
    const avg7 = average(last7.map((entry) => entry.total));
    const avg30 = average(baseForHabits.map((entry) => entry.total));
    const change = porcentajeCambio(avg30, avg7);

    if (change <= UMBRAL_CAIDA_TOTAL) {
      suggestions.push({
        tipo: "tendencia",
        prioridad: "alta",
        titulo: "Tendencia reciente a la baja en Total",
        mensaje: `El promedio de Total de los ultimos 7 registros (${avg7.toFixed(2)}) esta ${(Math.abs(change) * 100).toFixed(1)}% por debajo del promedio de referencia (${avg30.toFixed(2)}).`,
      });
    }
  }

  if (last30.length >= 7 && prev30.length >= 7) {
    const avgRtRecent = average(last30.map((entry) => entry.rendimientoTrabajo));
    const avgRtPrev = average(prev30.map((entry) => entry.rendimientoTrabajo));
    const changeRt = porcentajeCambio(avgRtPrev, avgRtRecent);
    if (changeRt <= UMBRAL_CAIDA_RENDIMIENTO) {
      const lowRecent = topLowHabits(last30, correlaciones).slice(0, 2);
      const hint = lowRecent
        .map((row) => `${HABIT_LABELS[row.habito]} (${row.porcentaje.toFixed(0)}%)`)
        .join(", ");
      suggestions.push({
        tipo: "tendencia",
        prioridad: "media",
        titulo: "Rendimiento Trabajo cae frente al mes anterior",
        mensaje: `Rendimiento medio reciente ${avgRtRecent.toFixed(2)}h vs ${avgRtPrev.toFixed(2)}h del periodo previo (${(Math.abs(changeRt) * 100).toFixed(1)}% menos). Revisa especialmente: ${hint || "habitos con menor cumplimiento reciente"}.`,
      });
    }
  }

  const rachas = calcularRachas(asc);
  for (const row of rachas) {
    if (row.actual > UMBRAL_RACHA_REFUERZO) {
      suggestions.push({
        tipo: "racha",
        prioridad: "baja",
        titulo: `Racha positiva en ${HABIT_LABELS[row.habito]}`,
        mensaje: `Llevas ${row.actual} dias con registro cumpliendo ${HABIT_LABELS[row.habito]}. Tu mejor racha historica es ${row.mejor}. No la rompas.`,
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      tipo: "general",
      prioridad: "baja",
      titulo: "Buen equilibrio general",
      mensaje:
        "No se detectan alertas claras en el rango reciente. Mantener consistencia en los habitos con mejor correlacion te dara mayor estabilidad.",
    });
  }

  return suggestions.sort(
    (a, b) => {
      const priorityDelta = PRIORIDAD_SCORE[b.prioridad] - PRIORIDAD_SCORE[a.prioridad];
      if (priorityDelta !== 0) return priorityDelta;

      // Dentro de la misma prioridad, adelantamos habitos para accion inmediata.
      if (a.tipo === "habito" && b.tipo !== "habito") return -1;
      if (a.tipo !== "habito" && b.tipo === "habito") return 1;
      return 0;
    },
  );
};

// Punto de extension: en el futuro se puede inyectar un motor hibrido/reglas+LLM
// sin cambiar el contrato de la UI ni las llamadas del resto de la app.
export function generarSugerenciasConMotor(
  entradas: DailyEntry[],
  motor: SuggestionGenerator = generarSugerenciasReglas,
): Sugerencia[] {
  return motor(entradas);
}

export const generarSugerencias: SuggestionGenerator = (entradas) =>
  generarSugerenciasConMotor(entradas, generarSugerenciasReglas);

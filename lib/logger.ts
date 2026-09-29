type Nivel = "debug" | "info" | "warn" | "error";

const PRIORIDAD: Record<Nivel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function nivelMinimo(): number {
  const configurado = process.env.LOG_LEVEL?.trim().toLowerCase() as Nivel | undefined;
  return PRIORIDAD[configurado ?? "info"] ?? PRIORIDAD.info;
}

const STACK_MAX = 1500;

export function serializarError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { valor: String(error) };

  const extra = error as Error & { code?: unknown; digest?: unknown; errorCode?: unknown };
  return {
    nombre: error.name,
    mensaje: error.message,
    ...(extra.code !== undefined && { code: extra.code }),
    ...(extra.errorCode !== undefined && { code: extra.errorCode }),
    ...(extra.digest !== undefined && { digest: extra.digest }),
    stack: error.stack?.slice(0, STACK_MAX),
  };
}

// Una linea JSON por evento: Vercel la muestra tal cual y permite buscar por "evento".
// console.error/warn hacen que Vercel marque la linea con el nivel correspondiente.
function escribir(nivel: Nivel, evento: string, datos: Record<string, unknown> = {}) {
  if (PRIORIDAD[nivel] < nivelMinimo()) return;

  const { error, ...resto } = datos;
  const linea = JSON.stringify({
    nivel,
    evento,
    ...resto,
    ...(error !== undefined && { error: serializarError(error) }),
    entorno: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ts: new Date().toISOString(),
  });

  if (nivel === "error") console.error(linea);
  else if (nivel === "warn") console.warn(linea);
  else console.log(linea);
}

export const log = {
  debug: (evento: string, datos?: Record<string, unknown>) => escribir("debug", evento, datos),
  info: (evento: string, datos?: Record<string, unknown>) => escribir("info", evento, datos),
  warn: (evento: string, datos?: Record<string, unknown>) => escribir("warn", evento, datos),
  error: (evento: string, datos?: Record<string, unknown>) => escribir("error", evento, datos),
};

const UMBRAL_LENTO_MS = 1000;

/**
 * Mide una operacion y avisa si es lenta. No registra errores: los relanza para que
 * quien llama decida si son esperados (warn) o fallos reales (error).
 */
export async function medir<T>(
  evento: string,
  fn: () => Promise<T>,
  datos: Record<string, unknown> = {},
): Promise<T> {
  const inicio = performance.now();
  let ok = false;
  try {
    const resultado = await fn();
    ok = true;
    return resultado;
  } finally {
    const ms = Math.round(performance.now() - inicio);
    if (ms >= UMBRAL_LENTO_MS) log.warn(`${evento}.lento`, { ...datos, ms, ok });
    else log.debug(evento, { ...datos, ms, ok });
  }
}

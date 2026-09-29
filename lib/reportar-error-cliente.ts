const ENDPOINT = "/api/client-error";
const MAX_POR_PAGINA = 10;

let enviados = 0;

/** Envia un error del navegador al servidor para que aparezca en los logs de Vercel. */
export function reportarErrorCliente(
  tipo: string,
  error: unknown,
  extra: Record<string, unknown> = {},
) {
  if (typeof window === "undefined" || enviados >= MAX_POR_PAGINA) return;
  enviados += 1;

  const err = error instanceof Error ? error : new Error(String(error));
  const body = JSON.stringify({
    tipo,
    mensaje: err.message,
    nombre: err.name,
    stack: err.stack,
    digest: (err as Error & { digest?: string }).digest,
    ruta: window.location.pathname,
    ...extra,
  });

  try {
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
      void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    // Nunca romper la app por fallar al reportar.
  }
}

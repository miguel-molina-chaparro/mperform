import type { Instrumentation } from "next";

import { log } from "@/lib/logger";

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  log.info("servidor.arranque", {
    region: process.env.VERCEL_REGION,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    config: {
      APP_PASSWORD: Boolean(process.env.APP_PASSWORD?.trim()),
      APP_SESSION_SECRET: Boolean(process.env.APP_SESSION_SECRET?.trim()),
      DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    },
  });

  if (!process.env.APP_PASSWORD?.trim()) {
    log.error("config.falta_app_password", {
      ayuda: "Define APP_PASSWORD en Vercel para este entorno y haz Redeploy.",
    });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    log.error("config.falta_database_url", {
      ayuda: "Define DATABASE_URL en Vercel para este entorno y haz Redeploy.",
    });
  }
}

// Errores no capturados en paginas, Server Actions, rutas y proxy.
// No se registran las cabeceras: incluyen la cookie de sesion.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  log.error("request.error", {
    metodo: request.method,
    ruta: request.path,
    archivo: context.routePath,
    tipo: context.routeType,
    origen: "renderSource" in context ? context.renderSource : undefined,
    error,
  });
};

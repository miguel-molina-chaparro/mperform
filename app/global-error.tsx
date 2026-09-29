"use client";

import { useEffect } from "react";

import { reportarErrorCliente } from "@/lib/reportar-error-cliente";

// Sustituye al layout raiz cuando este falla, por eso no puede usar sus estilos ni componentes.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportarErrorCliente("global_error", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>Algo ha fallado</h1>
        <p>La aplicación no se pudo cargar.</p>
        {error.digest ? <p style={{ fontFamily: "monospace" }}>Ref: {error.digest}</p> : null}
        <button onClick={() => retry()}>Reintentar</button>
      </body>
    </html>
  );
}

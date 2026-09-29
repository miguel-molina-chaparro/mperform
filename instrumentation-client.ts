import { reportarErrorCliente } from "@/lib/reportar-error-cliente";

window.addEventListener("error", (event) => {
  reportarErrorCliente("window.error", event.error ?? event.message, {
    origen: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  reportarErrorCliente("promesa.no_capturada", event.reason);
});

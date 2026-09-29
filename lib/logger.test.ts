import { afterEach, describe, expect, it, vi } from "vitest";

import { log, medir } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_LEVEL;
});

function capturar(metodo: "log" | "warn" | "error") {
  return vi.spyOn(console, metodo).mockImplementation(() => {});
}

describe("logger", () => {
  it("escribe una linea JSON con nivel, evento y datos", () => {
    const spy = capturar("log");
    log.info("prueba.evento", { ruta: "/x" });

    const linea = JSON.parse(spy.mock.calls[0][0] as string);
    expect(linea).toMatchObject({ nivel: "info", evento: "prueba.evento", ruta: "/x" });
    expect(linea.ts).toBeTypeOf("string");
  });

  it("usa console.error para errores y serializa el Error", () => {
    const spy = capturar("error");
    log.error("prueba.fallo", { error: Object.assign(new Error("boom"), { code: "P2021" }) });

    const linea = JSON.parse(spy.mock.calls[0][0] as string);
    expect(linea.error).toMatchObject({ nombre: "Error", mensaje: "boom", code: "P2021" });
  });

  it("omite debug salvo con LOG_LEVEL=debug", () => {
    const spy = capturar("log");
    log.debug("oculto");
    expect(spy).not.toHaveBeenCalled();

    process.env.LOG_LEVEL = "debug";
    log.debug("visible");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("medir relanza el error sin registrarlo como error", async () => {
    const spyError = capturar("error");
    await expect(medir("op", () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(spyError).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it } from "vitest";

import {
  SESSION_TTL_SECONDS,
  firmarSesion,
  getAppPassword,
  getSessionSecret,
  rutaSegura,
  textosIguales,
  verificarSesion,
} from "./session-token";

const envOriginal = { ...process.env };

afterEach(() => {
  process.env = { ...envOriginal };
});

describe("session-token", () => {
  it("verifica un token firmado con el mismo secreto", async () => {
    const token = await firmarSesion("secreto");
    expect(await verificarSesion(token, "secreto")).toBe(true);
  });

  it("rechaza tokens con otro secreto, manipulados o caducados", async () => {
    const token = await firmarSesion("secreto");
    expect(await verificarSesion(token, "otro")).toBe(false);
    expect(await verificarSesion(`${token}x`, "secreto")).toBe(false);
    expect(await verificarSesion(undefined, "secreto")).toBe(false);

    const futuro = Date.now() + (SESSION_TTL_SECONDS + 1) * 1000;
    expect(await verificarSesion(token, "secreto", futuro)).toBe(false);
  });

  it("compara textos correctamente", async () => {
    expect(await textosIguales("abc", "abc", "k")).toBe(true);
    expect(await textosIguales("abc", "abd", "k")).toBe(false);
  });

  it("ignora espacios en las variables de entorno y trata vacias como ausentes", () => {
    process.env.APP_PASSWORD = "  mipass\n";
    process.env.APP_SESSION_SECRET = "   ";
    expect(getAppPassword()).toBe("mipass");
    expect(getSessionSecret()).toBe("mipass");
  });

  it("solo permite redirecciones internas", () => {
    expect(rutaSegura("/estadisticas?x=1")).toBe("/estadisticas?x=1");
    expect(rutaSegura("https://evil.com")).toBe("/");
    expect(rutaSegura("//evil.com")).toBe("/");
    expect(rutaSegura("/\\evil.com")).toBe("/");
    expect(rutaSegura("/login")).toBe("/");
    expect(rutaSegura(undefined)).toBe("/");
  });
});

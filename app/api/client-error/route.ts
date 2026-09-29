import { log } from "@/lib/logger";

const MAX_BYTES = 8 * 1024;

function texto(valor: unknown, max: number): string | undefined {
  return typeof valor === "string" ? valor.slice(0, max) : undefined;
}

// Publica para poder recibir errores tambien desde /login; se limita el tamaño
// y solo se guardan campos conocidos y truncados.
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return new Response(null, { status: 413 });

  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  log.error("cliente.error", {
    tipo: texto(datos.tipo, 50),
    ruta: texto(datos.ruta, 200),
    nombre: texto(datos.nombre, 100),
    mensaje: texto(datos.mensaje, 500),
    digest: texto(datos.digest, 100),
    origen: texto(datos.origen, 300),
    stack: texto(datos.stack, 1500),
    navegador: request.headers.get("user-agent")?.slice(0, 200),
  });

  return new Response(null, { status: 204 });
}

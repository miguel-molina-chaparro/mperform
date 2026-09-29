import { ImportExportDashboard } from "@/components/import-export-dashboard";
import { obtenerEntradas } from "@/lib/data";

export default async function ImportarExportarPage() {
  const entries = await obtenerEntradas();
  const serializable = entries.map((entry) => ({
    ...entry,
    fecha: entry.fecha.toISOString(),
  }));

  return <ImportExportDashboard entries={serializable} />;
}

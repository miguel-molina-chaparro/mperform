import { EstadisticasDashboard } from "@/components/estadisticas-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerEntradas } from "@/lib/data";

export default async function EstadisticasPage() {
  const entries = await obtenerEntradas();
  if (entries.length === 0) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-6 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay datos para estadísticas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Registra algunos días en Inicio o importa tu histórico para ver gráficos y
            tendencias.
          </CardContent>
        </Card>
      </main>
    );
  }

  const serializedEntries = entries.map((entry) => ({
    ...entry,
    fecha: entry.fecha.toISOString(),
  }));

  return <EstadisticasDashboard entries={serializedEntries} />;
}

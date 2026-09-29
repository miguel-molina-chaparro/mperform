import {
  AlertTriangle,
  Activity,
  Lightbulb,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerEntradas } from "@/lib/data";
import { generarSugerencias, type Sugerencia } from "@/lib/sugerencias";

function priorityBadge(prioridad: Sugerencia["prioridad"]) {
  if (prioridad === "alta") return <Badge variant="destructive">Alta</Badge>;
  if (prioridad === "media")
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Media
      </Badge>
    );
  return <Badge variant="secondary">Baja</Badge>;
}

function typeIcon(tipo: Sugerencia["tipo"]) {
  if (tipo === "habito") return <Lightbulb className="size-4" />;
  if (tipo === "tendencia") return <TrendingUp className="size-4" />;
  if (tipo === "racha") return <Trophy className="size-4" />;
  return <Activity className="size-4" />;
}

export default async function SugerenciasPage() {
  const entradas = await obtenerEntradas();
  const sugerencias = generarSugerencias(entradas);
  const destacadas = sugerencias.filter((s) => s.prioridad === "alta").slice(0, 3);
  const resto = sugerencias.slice(destacadas.length);
  const hasEmptyState =
    sugerencias.length === 1 &&
    sugerencias[0].tipo === "general" &&
    sugerencias[0].titulo.includes("Aun no hay datos suficientes");

  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sugerencias</h1>
        <p className="text-sm text-muted-foreground">
          Reglas estadisticas sobre tus propios registros historicos.
        </p>
      </div>

      {hasEmptyState ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              Estado inicial de sugerencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{sugerencias[0].mensaje}</p>
          </CardContent>
        </Card>
      ) : null}

      {!hasEmptyState ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Sugerencias destacadas</h2>
            {destacadas.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {destacadas.map((sugerencia, index) => (
                  <Card key={`${sugerencia.titulo}-${index}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <span className="inline-flex items-center gap-2">
                          {typeIcon(sugerencia.tipo)}
                          {sugerencia.titulo}
                        </span>
                        {priorityBadge(sugerencia.prioridad)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{sugerencia.mensaje}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-4 text-sm text-muted-foreground">
                  No hay sugerencias de prioridad alta ahora mismo.
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Resto de recomendaciones</h2>
            <div className="space-y-3">
              {resto.map((sugerencia, index) => (
                <Card key={`${sugerencia.titulo}-${index}`} size="sm">
                  <CardContent className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="inline-flex items-center gap-2 font-medium">
                        {typeIcon(sugerencia.tipo)}
                        {sugerencia.titulo}
                      </p>
                      <p className="text-sm text-muted-foreground">{sugerencia.mensaje}</p>
                    </div>
                    <div>{priorityBadge(sugerencia.prioridad)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

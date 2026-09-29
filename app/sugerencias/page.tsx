import type { CSSProperties } from "react";
import {
  AlertTriangle,
  Activity,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { obtenerEntradas } from "@/lib/data";
import { generarSugerencias, type Sugerencia } from "@/lib/sugerencias";

const PRIORIDAD: Record<Sugerencia["prioridad"], { label: string; color: string }> = {
  alta: { label: "Alta", color: "var(--destructive)" },
  media: { label: "Media", color: "var(--warning)" },
  baja: { label: "Baja", color: "var(--brand)" },
};

function PrioridadBadge({ prioridad }: { prioridad: Sugerencia["prioridad"] }) {
  const { label, color } = PRIORIDAD[prioridad];
  return (
    <span
      style={{ "--prio": color } as CSSProperties}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--prio),transparent_85%)] px-2.5 py-0.5 text-xs font-semibold text-[color-mix(in_oklch,var(--prio),var(--foreground)_25%)]"
    >
      <span className="size-1.5 rounded-full bg-[var(--prio)]" />
      {label}
    </span>
  );
}

function TipoIcon({ tipo }: { tipo: Sugerencia["tipo"] }) {
  const Icon =
    tipo === "habito"
      ? Lightbulb
      : tipo === "tendencia"
        ? TrendingUp
        : tipo === "racha"
          ? Trophy
          : Activity;
  return <Icon className="size-5" />;
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
    <main className="container mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      <PageHeader
        icon={Sparkles}
        title="Sugerencias"
        description="Reglas estadísticas sobre tus propios registros históricos."
      />

      {hasEmptyState ? (
        <Card>
          <CardContent className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warning/20 text-[color-mix(in_oklch,var(--warning),var(--foreground)_30%)]">
              <AlertTriangle className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-heading font-semibold">Aún no hay sugerencias</p>
              <p className="text-sm text-muted-foreground">{sugerencias[0].mensaje}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Destacadas</h2>
            {destacadas.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {destacadas.map((sugerencia, index) => (
                  <Card
                    key={`${sugerencia.titulo}-${index}`}
                    style={{ "--prio": PRIORIDAD[sugerencia.prioridad].color } as CSSProperties}
                    className="relative"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-[var(--prio)]" />
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklch,var(--prio),transparent_85%)] text-[var(--prio)]">
                          <TipoIcon tipo={sugerencia.tipo} />
                        </span>
                        <PrioridadBadge prioridad={sugerencia.prioridad} />
                      </div>
                      <p className="font-heading text-base font-semibold leading-snug">
                        {sugerencia.titulo}
                      </p>
                      <p className="text-sm text-muted-foreground">{sugerencia.mensaje}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-sm text-muted-foreground">
                  No hay sugerencias de prioridad alta ahora mismo. ¡Buen trabajo!
                </CardContent>
              </Card>
            )}
          </section>

          {resto.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Resto de recomendaciones</h2>
              <div className="grid gap-3">
                {resto.map((sugerencia, index) => (
                  <Card
                    key={`${sugerencia.titulo}-${index}`}
                    size="sm"
                    style={{ "--prio": PRIORIDAD[sugerencia.prioridad].color } as CSSProperties}
                    className="border-l-4 border-l-[var(--prio)]"
                  >
                    <CardContent className="flex items-start gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--prio),transparent_85%)] text-[var(--prio)]">
                        <TipoIcon tipo={sugerencia.tipo} />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">{sugerencia.titulo}</p>
                        <p className="text-sm text-muted-foreground">{sugerencia.mensaje}</p>
                      </div>
                      <PrioridadBadge prioridad={sugerencia.prioridad} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

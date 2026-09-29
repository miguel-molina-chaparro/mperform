"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  Gauge,
  Sigma,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  type DailyEntryLike,
  type DateRangePreset,
  calcularCumplimientoAgregado,
  calcularCumplimientoHabitos,
  calcularRachas,
  construirSerieTemporal,
  correlacionesHabitos,
  filtrarPorRangoPreset,
  histograma,
  promediosPorDiaSemana,
  resumenAgregado,
} from "@/lib/estadisticas";
import { HABITO_POR_KEY, type HabitoKey } from "@/components/habitos";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Entry = DailyEntryLike & {
  id: string;
  nf: number;
};

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "Última semana" },
  { value: "1m", label: "Último mes" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "all", label: "Todo" },
];

function habito(key: string) {
  return HABITO_POR_KEY[key as HabitoKey];
}

function StatCard({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <Card style={{ "--stat": color } as CSSProperties}>
      <CardContent className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklch,var(--stat),transparent_85%)] text-[var(--stat)]">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="font-heading text-2xl font-bold tabular-nums">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function colorCorrelacion(valor: number) {
  const intensidad = Math.min(1, Math.abs(valor));
  const base = valor >= 0 ? "var(--success)" : "var(--destructive)";
  return {
    backgroundColor: `color-mix(in oklch, ${base} ${Math.round(intensidad * 35)}%, transparent)`,
  };
}

export function EstadisticasDashboard({ entries }: { entries: Entry[] }) {
  const [range, setRange] = useState<DateRangePreset>("3m");
  const filtered = useMemo(
    () => filtrarPorRangoPreset(entries, range),
    [entries, range],
  );

  const temporal = useMemo(() => construirSerieTemporal(filtered), [filtered]);
  const cumplimiento = useMemo(
    () =>
      calcularCumplimientoHabitos(filtered).map((row) => ({
        ...row,
        habitoLabel: habito(row.habito).corto,
        color: habito(row.habito).color,
      })),
    [filtered],
  );
  const cumplimientoSemanal = useMemo(
    () => calcularCumplimientoAgregado(filtered, "week"),
    [filtered],
  );
  const weekdays = useMemo(() => promediosPorDiaSemana(filtered), [filtered]);
  const histTotal = useMemo(
    () => histograma(filtered.map((entry) => entry.total), 12),
    [filtered],
  );
  const histRendimiento = useMemo(
    () => histograma(filtered.map((entry) => entry.rendimientoTrabajo), 10),
    [filtered],
  );
  const correlaciones = useMemo(() => correlacionesHabitos(filtered), [filtered]);
  const rachas = useMemo(() => calcularRachas(filtered), [filtered]);
  const resumen = useMemo(() => resumenAgregado(filtered), [filtered]);

  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        icon={BarChart3}
        title="Estadísticas"
        description={`${filtered.length} registros en el rango seleccionado`}
      >
        <Select
          items={RANGE_OPTIONS}
          value={range}
          onValueChange={(value) => setRange(value as DateRangePreset)}
        >
          <SelectTrigger className="w-56 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Sigma} label="Total medio" color="var(--chart-1)">
          {resumen.totalMedio.toFixed(2)}
        </StatCard>
        <StatCard icon={Gauge} label="Rendimiento medio" color="var(--chart-3)">
          {resumen.rendimientoMedio.toFixed(2)}
        </StatCard>
        <StatCard icon={TrendingUp} label="Mejor día" color="var(--chart-4)">
          {resumen.mejorDia ? resumen.mejorDia.total.toFixed(2) : "—"}
          {resumen.mejorDia ? (
            <p className="font-sans text-xs font-normal text-muted-foreground">
              {format(new Date(resumen.mejorDia.fecha), "dd/MM/yyyy")}
            </p>
          ) : null}
        </StatCard>
        <StatCard icon={TrendingDown} label="Peor día" color="var(--chart-2)">
          {resumen.peorDia ? resumen.peorDia.total.toFixed(2) : "—"}
          {resumen.peorDia ? (
            <p className="font-sans text-xs font-normal text-muted-foreground">
              {format(new Date(resumen.peorDia.fecha), "dd/MM/yyyy")}
            </p>
          ) : null}
        </StatCard>
      </div>

      <Tabs defaultValue="evolucion">
        <TabsList className="w-full justify-start overflow-auto rounded-xl bg-card/70 p-1 backdrop-blur">
          <TabsTrigger value="evolucion">Evolución</TabsTrigger>
          <TabsTrigger value="habitos">Hábitos</TabsTrigger>
          <TabsTrigger value="patrones">Patrones</TabsTrigger>
          <TabsTrigger value="distribucion">Distribución</TabsTrigger>
          <TabsTrigger value="correlaciones">Correlaciones</TabsTrigger>
          <TabsTrigger value="rachas">Rachas</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucion" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento Trabajo y media móvil (7 registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  rendimientoTrabajo: { label: "Rendimiento", color: "var(--chart-1)" },
                  rendimientoMM7: { label: "Media móvil 7", color: "var(--chart-2)" },
                }}
              >
                <LineChart data={temporal}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="fecha" tickLine={false} minTickGap={24} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="rendimientoTrabajo"
                    stroke="var(--color-rendimientoTrabajo)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rendimientoMM7"
                    stroke="var(--color-rendimientoMM7)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total y media móvil (7 registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: "Total diario", color: "var(--chart-3)" },
                  totalMM7: { label: "Media móvil 7", color: "var(--chart-5)" },
                }}
              >
                <LineChart data={temporal}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="fecha" tickLine={false} minTickGap={24} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalMM7"
                    stroke="var(--color-totalMM7)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="habitos" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>% de cumplimiento por hábito</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ porcentaje: { label: "% cumplimiento", color: "var(--chart-1)" } }}
              >
                <BarChart data={cumplimiento}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="habitoLabel" tickLine={false} />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="porcentaje" radius={[8, 8, 0, 0]}>
                    {cumplimiento.map((row) => (
                      <Cell key={row.habito} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolución del cumplimiento agregado</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ porcentaje: { label: "% semanal", color: "var(--chart-4)" } }}
              >
                <LineChart data={cumplimientoSemanal}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="periodo" tickLine={false} minTickGap={24} />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="porcentaje"
                    stroke="var(--color-porcentaje)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patrones">
          <Card>
            <CardHeader>
              <CardTitle>Promedios por día de la semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  totalPromedio: { label: "Total medio", color: "var(--chart-1)" },
                  rendimientoPromedio: { label: "Rendimiento medio", color: "var(--chart-3)" },
                }}
              >
                <BarChart data={weekdays}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="dia" tickLine={false} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalPromedio" fill="var(--color-totalPromedio)" radius={4} />
                  <Bar
                    dataKey="rendimientoPromedio"
                    fill="var(--color-rendimientoPromedio)"
                    radius={4}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribucion" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribución del Total</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Frecuencia", color: "var(--chart-2)" } }}>
                <BarChart data={histTotal}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} minTickGap={12} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={2} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Rendimiento Trabajo</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Frecuencia", color: "var(--chart-3)" } }}>
                <BarChart data={histRendimiento}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} minTickGap={12} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={2} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlaciones">
          <Card>
            <CardHeader>
              <CardTitle>Correlaciones (Pearson)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Habito</TableHead>
                      <TableHead>Corr con Total</TableHead>
                      <TableHead>Corr con Rendimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {correlaciones.map((row) => (
                      <TableRow key={row.habito}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: habito(row.habito).color }}
                            />
                            {habito(row.habito).label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-block rounded-md px-2 py-0.5 tabular-nums"
                            style={colorCorrelacion(row.corrTotal)}
                          >
                            {row.corrTotal.toFixed(3)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-block rounded-md px-2 py-0.5 tabular-nums"
                            style={colorCorrelacion(row.corrRendimiento)}
                          >
                            {row.corrRendimiento.toFixed(3)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rachas">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rachas.map((row) => {
              const meta = habito(row.habito);
              const Icon = meta.icon;
              const progreso = row.mejor > 0 ? (row.actual / row.mejor) * 100 : 0;
              return (
                <Card key={row.habito} style={{ "--habit": meta.color } as CSSProperties}>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-[var(--habit)] text-white shadow-[0_6px_14px_-6px_var(--habit)]">
                        <Icon className="size-5" />
                      </span>
                      <p className="font-heading font-semibold">{meta.label}</p>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-heading text-3xl font-bold tabular-nums">
                          {row.actual}
                        </p>
                        <p className="text-xs text-muted-foreground">días de racha actual</p>
                      </div>
                      <p className="text-right text-sm text-muted-foreground">
                        Mejor: <strong className="text-foreground">{row.mejor}</strong>
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--habit)] transition-all"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="resumen">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Sigma} label="Total medio" color="var(--chart-1)">
              {resumen.totalMedio.toFixed(2)}
            </StatCard>
            <StatCard icon={Gauge} label="Rendimiento medio" color="var(--chart-3)">
              {resumen.rendimientoMedio.toFixed(2)}
            </StatCard>
            <StatCard icon={Activity} label="Desviación estándar del Total" color="var(--chart-5)">
              {resumen.desviacionTotal.toFixed(2)}
            </StatCard>
            <StatCard icon={TrendingUp} label="Mejor día" color="var(--chart-4)">
              {resumen.mejorDia
                ? `${format(new Date(resumen.mejorDia.fecha), "dd/MM/yyyy")} · ${resumen.mejorDia.total.toFixed(2)}`
                : "Sin datos"}
            </StatCard>
            <StatCard icon={TrendingDown} label="Peor día" color="var(--chart-2)">
              {resumen.peorDia
                ? `${format(new Date(resumen.peorDia.fecha), "dd/MM/yyyy")} · ${resumen.peorDia.total.toFixed(2)}`
                : "Sin datos"}
            </StatCard>
            <StatCard icon={CalendarCheck} label="Registros en rango" color="var(--brand)">
              {filtered.length}
            </StatCard>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

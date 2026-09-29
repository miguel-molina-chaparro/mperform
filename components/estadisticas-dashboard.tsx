"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  { value: "7d", label: "Ultima semana" },
  { value: "1m", label: "Ultimo mes" },
  { value: "3m", label: "Ultimos 3 meses" },
  { value: "all", label: "Todo" },
];

const HABIT_LABELS: Record<string, string> = {
  movil17: "Movil-17h",
  movilResto: "Movil resto",
  np: "N.P",
  ejercicio: "Ejercicio",
  formacion: "Formacion",
  leer: "Leer",
  social: "Social",
};

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
        habitoLabel: HABIT_LABELS[row.habito],
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
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Estadisticas</h1>
        <Select value={range} onValueChange={(value) => setRange(value as DateRangePreset)}>
          <SelectTrigger className="w-56">
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
      </div>

      <Tabs defaultValue="evolucion">
        <TabsList variant="line" className="w-full justify-start overflow-auto">
          <TabsTrigger value="evolucion">Evolucion</TabsTrigger>
          <TabsTrigger value="habitos">Habitos</TabsTrigger>
          <TabsTrigger value="patrones">Patrones</TabsTrigger>
          <TabsTrigger value="distribucion">Distribucion</TabsTrigger>
          <TabsTrigger value="correlaciones">Correlaciones</TabsTrigger>
          <TabsTrigger value="rachas">Rachas</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucion" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento Trabajo y media movil (7 registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  rendimientoTrabajo: { label: "Rendimiento", color: "#2563eb" },
                  rendimientoMM7: { label: "Media movil 7", color: "#ef4444" },
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
              <CardTitle>Total y media movil (7 registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: "Total diario", color: "#16a34a" },
                  totalMM7: { label: "Media movil 7", color: "#f97316" },
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
              <CardTitle>% de cumplimiento por habito</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ porcentaje: { label: "% cumplimiento", color: "#2563eb" } }}
              >
                <BarChart data={cumplimiento}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="habitoLabel" tickLine={false} />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="porcentaje" fill="var(--color-porcentaje)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolucion del cumplimiento agregado</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ porcentaje: { label: "% semanal", color: "#16a34a" } }}
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
              <CardTitle>Promedios por dia de la semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  totalPromedio: { label: "Total medio", color: "#7c3aed" },
                  rendimientoPromedio: { label: "Rendimiento medio", color: "#0ea5e9" },
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
              <CardTitle>Distribucion del Total</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Frecuencia", color: "#2563eb" } }}>
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
              <CardTitle>Distribucion de Rendimiento Trabajo</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Frecuencia", color: "#16a34a" } }}>
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
                        <TableCell>{HABIT_LABELS[row.habito]}</TableCell>
                        <TableCell>{row.corrTotal.toFixed(3)}</TableCell>
                        <TableCell>{row.corrRendimiento.toFixed(3)}</TableCell>
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
            {rachas.map((row) => (
              <Card key={row.habito}>
                <CardHeader>
                  <CardTitle>{HABIT_LABELS[row.habito]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Racha actual: {row.actual} dias</p>
                  <p>Mejor racha: {row.mejor} dias</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resumen">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total medio</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {resumen.totalMedio.toFixed(2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento medio</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {resumen.rendimientoMedio.toFixed(2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Desviacion estandar del Total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {resumen.desviacionTotal.toFixed(2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mejor dia</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {resumen.mejorDia
                  ? `${format(new Date(resumen.mejorDia.fecha), "dd/MM/yyyy")} (${resumen.mejorDia.total.toFixed(2)})`
                  : "Sin datos"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Peor dia</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {resumen.peorDia
                  ? `${format(new Date(resumen.peorDia.fecha), "dd/MM/yyyy")} (${resumen.peorDia.total.toFixed(2)})`
                  : "Sin datos"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Registros en rango</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {filtered.length}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

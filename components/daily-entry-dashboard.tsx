"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CalendarIcon,
  CalendarX2,
  CopyPlus,
  Flame,
  History,
  type LucideIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { eliminarEntradaAction, guardarEntradaAction } from "@/app/actions";
import { calcularTotal, nfInputAValor } from "@/lib/calculos";
import { diaFinDeSemana, fechasRepetidas } from "@/lib/fechas";
import { reportarErrorCliente } from "@/lib/reportar-error-cliente";
import { cn } from "@/lib/utils";
import { HABITOS, type HabitoMeta } from "@/components/habitos";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EntryRow = {
  id: string;
  fecha: string;
  rendimientoTrabajo: number;
  movil17: boolean;
  movilResto: boolean;
  np: boolean;
  ejercicio: boolean;
  formacion: boolean;
  leer: boolean;
  social: boolean;
  nf: number;
  total: number;
};

type Props = {
  initialEntries: EntryRow[];
};

const formSchema = z.object({
  rendimientoTrabajo: z
    .number({ error: "Introduce un número" })
    .min(0, "Mínimo 0")
    .max(24, "Máximo 24")
    .refine(
      (value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9,
      "Como máximo 1 decimal",
    ),
  movil17: z.boolean(),
  movilResto: z.boolean(),
  np: z.boolean(),
  ejercicio: z.boolean(),
  formacion: z.boolean(),
  leer: z.boolean(),
  social: z.boolean(),
  nf: z
    .number({ error: "Introduce un número" })
    .int("Debe ser un número entero")
    .min(0, "Debe ser 0 o mayor"),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  rendimientoTrabajo: 0,
  movil17: false,
  movilResto: false,
  np: false,
  ejercicio: false,
  formacion: false,
  leer: false,
  social: false,
  nf: 1,
};

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function keyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(dateKey: string): string {
  return format(keyToLocalDate(dateKey), "dd/MM/yyyy");
}

function entryToFormValues(entry: EntryRow): FormValues {
  return {
    rendimientoTrabajo: entry.rendimientoTrabajo,
    movil17: entry.movil17,
    movilResto: entry.movilResto,
    np: entry.np,
    ejercicio: entry.ejercicio,
    formacion: entry.formacion,
    leer: entry.leer,
    social: entry.social,
    nf: entry.nf,
  };
}

function HabitoDot({ habito, value }: { habito: HabitoMeta; value: boolean }) {
  const Icon = habito.icon;
  return (
    <span
      title={`${habito.label}: ${value ? "cumplido" : "no cumplido"}`}
      style={{ "--habit": habito.color } as CSSProperties}
      className={cn(
        "inline-grid size-7 place-items-center rounded-lg transition-colors",
        value
          ? "bg-[var(--habit)] text-white shadow-[0_4px_10px_-4px_var(--habit)]"
          : "bg-muted text-muted-foreground/40",
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}

function Aviso({
  tono,
  icon: Icon,
  children,
}: {
  tono: "warning" | "info";
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2 text-sm",
        tono === "warning"
          ? "border-warning/50 bg-warning/12"
          : "border-brand-3/50 bg-brand-3/12",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          tono === "warning"
            ? "text-[color-mix(in_oklch,var(--warning),black_30%)] dark:text-warning"
            : "text-[color-mix(in_oklch,var(--brand-3),black_30%)] dark:text-brand-3",
        )}
      />
      {children}
    </div>
  );
}

function AvisosFila({
  repetida,
  finDeSemana,
}: {
  repetida: boolean;
  finDeSemana: "Sábado" | "Domingo" | null;
}) {
  if (!repetida && !finDeSemana) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {repetida ? (
        <span
          title="Hay más de un registro con esta fecha"
          className="inline-flex items-center gap-1 rounded-md bg-warning/18 px-1.5 py-0.5 text-[11px] font-semibold text-[color-mix(in_oklch,var(--warning),black_40%)] dark:text-warning"
        >
          <CopyPlus className="size-3" />
          Repetida
        </span>
      ) : null}
      {finDeSemana ? (
        <span
          title="Registro en fin de semana"
          className="inline-flex items-center gap-1 rounded-md bg-brand-3/18 px-1.5 py-0.5 text-[11px] font-semibold text-[color-mix(in_oklch,var(--brand-3),black_40%)] dark:text-brand-3"
        >
          <CalendarX2 className="size-3" />
          {finDeSemana}
        </span>
      ) : null}
    </span>
  );
}

function tonoTotal(total: number) {
  const mostrado = Math.round(total * 100) / 100;
  if (mostrado >= 70) return "bg-success/15 text-success";
  if (mostrado >= 55) {
    return "bg-warning/18 text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning";
  }
  return "bg-destructive/12 text-destructive";
}

export function DailyEntryDashboard({ initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  // Si hoy ya tiene registro se abre en modo edicion; si no, en modo nuevo.
  const [editingId, setEditingId] = useState<string | null>(
    () => initialEntries.find((entry) => entry.fecha.slice(0, 10) === toDateKey(new Date()))?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [soloAvisos, setSoloAvisos] = useState(false);
  const [page, setPage] = useState(1);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      const inicial = initialEntries.find((entry) => entry.id === editingId);
      return inicial ? entryToFormValues(inicial) : DEFAULT_VALUES;
    })(),
  });

  const selectedKey = toDateKey(selectedDate);
  const editingEntry = entries.find((entry) => entry.id === editingId);
  const otrosEnFecha = entries.filter(
    (entry) => entry.fecha.slice(0, 10) === selectedKey && entry.id !== editingId,
  );
  const finDeSemanaSeleccionado = diaFinDeSemana(selectedKey);

  const repetidas = useMemo(
    () => fechasRepetidas(entries.map((entry) => entry.fecha)),
    [entries],
  );
  const avisosDe = (entry: EntryRow) => {
    const clave = entry.fecha.slice(0, 10);
    return { repetida: repetidas.has(clave), finDeSemana: diaFinDeSemana(clave) };
  };
  const totalAvisos = entries.filter((entry) => {
    const avisos = avisosDe(entry);
    return avisos.repetida || avisos.finDeSemana;
  }).length;

  const watched = useWatch({ control: form.control });
  const totalEnVivo = useMemo(() => {
    const nf = watched.nf ?? 1;
    const rendimiento = watched.rendimientoTrabajo ?? 0;
    // Mientras se escribe, N.F puede ser negativo o decimal y nfInputAValor lanzaria.
    if (!Number.isInteger(nf) || nf < 0 || !Number.isFinite(rendimiento)) return null;

    return calcularTotal({
      rendimientoTrabajo: rendimiento,
      movil17: watched.movil17 ?? false,
      movilResto: watched.movilResto ?? false,
      np: watched.np ?? false,
      ejercicio: watched.ejercicio ?? false,
      formacion: watched.formacion ?? false,
      leer: watched.leer ?? false,
      social: watched.social ?? false,
      nfValor: nfInputAValor(nf),
    });
  }, [watched]);

  const habitosCumplidos = HABITOS.filter((habito) => Boolean(watched[habito.key])).length;

  const mediaTotal = useMemo(
    () =>
      entries.length === 0
        ? 0
        : entries.reduce((suma, entry) => suma + entry.total, 0) / entries.length,
    [entries],
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const key = entry.fecha.slice(0, 10);
      if (fromDate && key < fromDate) return false;
      if (toDate && key > toDate) return false;
      if (soloAvisos && !repetidas.has(key) && !diaFinDeSemana(key)) return false;
      return true;
    });
  }, [entries, fromDate, toDate, soloAvisos, repetidas]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      try {
        const result = await guardarEntradaAction(
          { fecha: selectedKey, ...values },
          editingId ?? undefined,
        );
        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        const saved = result.data;
        setEntries((prev) => {
          const next = prev.filter((entry) => entry.id !== saved.id);
          next.push(saved);
          next.sort((a, b) => b.fecha.localeCompare(a.fecha));
          return next;
        });
        // Tras crear, los siguientes guardados editan ese mismo registro en vez de duplicarlo.
        setEditingId(saved.id);
        toast.success(editingId ? "Registro actualizado" : "Registro creado");
      } catch (error) {
        reportarErrorCliente("accion.guardarEntrada", error, { fecha: selectedKey });
        toast.error("No se pudo contactar con el servidor");
      }
    });
  };

  const editarEntrada = (entry: EntryRow) => {
    setEditingId(entry.id);
    setSelectedDate(keyToLocalDate(entry.fecha.slice(0, 10)));
    form.reset(entryToFormValues(entry));
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nuevoRegistro = () => {
    setEditingId(null);
    setSelectedDate(new Date());
    form.reset(DEFAULT_VALUES);
  };

  const eliminarEntradaUI = (entry: EntryRow) => {
    startTransition(async () => {
      try {
        const result = await eliminarEntradaAction(entry.id);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setEntries((prev) => prev.filter((item) => item.id !== entry.id));
        if (entry.id === editingId) nuevoRegistro();
        toast.success("Registro eliminado");
      } catch (error) {
        reportarErrorCliente("accion.eliminarEntrada", error, { id: entry.id });
        toast.error("No se pudo contactar con el servidor");
      }
    });
  };

  return (
    <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
      <section ref={formSectionRef} className="scroll-mt-24 space-y-6">
        <PageHeader
          icon={Flame}
          title="Seguimiento diario"
          description="Registra tu día y mira cómo cambia tu total al instante."
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                {editingEntry ? "Editar registro" : "Nuevo registro"}
                {editingEntry ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    del {formatDateKey(editingEntry.fecha.slice(0, 10))}
                  </span>
                ) : null}
              </CardTitle>
              {editingEntry ? (
                <Button type="button" variant="outline" size="sm" onClick={nuevoRegistro}>
                  <Plus className="size-4" />
                  Nuevo registro
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-brand" />
                        Fecha
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 w-full justify-start text-left font-normal"
                            />
                          }
                        >
                          <CalendarIcon className="mr-2 size-4 text-brand" />
                          {format(selectedDate, "dd/MM/yyyy")}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            defaultMonth={selectedDate}
                            onSelect={(date) => {
                              if (date) setSelectedDate(date);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="rendimientoTrabajo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Briefcase className="size-3.5 text-brand" />
                            Rendimiento Trabajo
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={24}
                              step="0.1"
                              className="h-10 tabular-nums"
                              value={field.value}
                              onChange={(event) =>
                                field.onChange(Number(event.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {otrosEnFecha.length > 0 || finDeSemanaSeleccionado ? (
                    <div className="space-y-2">
                      {otrosEnFecha.length > 0 ? (
                        <Aviso tono="warning" icon={CopyPlus}>
                          <span>
                            Ya hay {otrosEnFecha.length === 1 ? "otro registro" : `${otrosEnFecha.length} registros`}{" "}
                            el {format(selectedDate, "dd/MM/yyyy")}. Si guardas, quedará la fecha
                            repetida.
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => editarEntrada(otrosEnFecha[0])}
                          >
                            Editar ese registro
                          </Button>
                        </Aviso>
                      ) : null}
                      {finDeSemanaSeleccionado ? (
                        <Aviso tono="info" icon={CalendarX2}>
                          El {format(selectedDate, "dd/MM/yyyy")} es{" "}
                          {finDeSemanaSeleccionado.toLowerCase()}.
                        </Aviso>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Hábitos</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                      {HABITOS.map((habito) => {
                        const Icon = habito.icon;
                        return (
                          <FormField
                            key={habito.key}
                            control={form.control}
                            name={habito.key}
                            render={({ field }) => {
                              const activo = Boolean(field.value);
                              return (
                                <FormItem
                                  style={{ "--habit": habito.color } as CSSProperties}
                                  className={cn(
                                    "flex cursor-pointer flex-row items-center gap-3 rounded-xl border p-3 transition-all",
                                    activo
                                      ? "border-[color-mix(in_oklch,var(--habit),transparent_45%)] bg-[color-mix(in_oklch,var(--habit),transparent_88%)]"
                                      : "hover:border-[color-mix(in_oklch,var(--habit),transparent_60%)]",
                                  )}
                                  onClick={() => field.onChange(!activo)}
                                >
                                  <span
                                    className={cn(
                                      "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                                      activo
                                        ? "bg-[var(--habit)] text-white shadow-[0_6px_14px_-6px_var(--habit)]"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    <Icon className="size-4" />
                                  </span>
                                  <FormLabel
                                    className="flex-1 cursor-pointer"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {habito.label}
                                  </FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={activo}
                                      onClick={(event) => event.stopPropagation()}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="nf"
                    render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel>N.F</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            className="h-10 tabular-nums"
                            value={field.value}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          0 = cumplido, 1 = no cumplido, 2 o más = fallo agravado
                          (2→-0.2, 3→-0.3, etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="h-10 px-5" disabled={isPending}>
                    <Save className="size-4" />
                    {isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_20px_40px_-20px_var(--brand)]">
              <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-white/10 blur-2xl" />
              <p className="relative text-sm font-medium text-white/80">Total en vivo</p>
              <p className="relative mt-2 font-heading text-5xl font-bold tabular-nums">
                {totalEnVivo === null ? "—" : totalEnVivo.toFixed(2)}
              </p>
              <p className="relative mt-2 text-sm text-white/80">
                {totalEnVivo === null
                  ? "Revisa N.F: debe ser un entero mayor o igual que 0."
                  : mediaTotal > 0
                    ? `Tu media histórica es ${mediaTotal.toFixed(2)}`
                    : "Se recalcula con cada cambio del formulario."}
              </p>
            </div>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">Hábitos cumplidos</p>
                  <p className="font-heading text-2xl font-bold tabular-nums">
                    {habitosCumplidos}
                    <span className="text-base text-muted-foreground">/{HABITOS.length}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {HABITOS.map((habito) => (
                    <span
                      key={habito.key}
                      title={habito.label}
                      className="h-2 flex-1 rounded-full bg-muted transition-colors"
                      style={
                        watched[habito.key] ? { backgroundColor: habito.color } : undefined
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader className="gap-4 sm:flex sm:items-end sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="size-5 text-brand" />
              Histórico
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {totalAvisos > 0 || soloAvisos ? (
                <Button
                  type="button"
                  variant={soloAvisos ? "default" : "outline"}
                  onClick={() => {
                    setSoloAvisos((prev) => !prev);
                    setPage(1);
                  }}
                >
                  <AlertTriangle className="size-4" />
                  Solo con avisos ({totalAvisos})
                </Button>
              ) : null}
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Desde</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[560px] overflow-auto rounded-xl border">
              <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Rendimiento</TableHead>
                    {HABITOS.map((habito) => (
                      <TableHead key={habito.key} className="text-center">
                        {habito.corto}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">N.F</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={HABITOS.length + 5}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Todavía no hay entradas en este rango de fechas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleEntries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        data-state={entry.id === editingId ? "selected" : undefined}
                        className={cn(
                          entry.id === editingId && "bg-accent/60 hover:bg-accent/70",
                        )}
                      >
                        <TableCell className="font-medium tabular-nums">
                          <div className="flex flex-col gap-1">
                            {formatDateKey(entry.fecha.slice(0, 10))}
                            <AvisosFila {...avisosDe(entry)} />
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {entry.rendimientoTrabajo.toFixed(1)}
                        </TableCell>
                        {HABITOS.map((habito) => (
                          <TableCell key={habito.key} className="text-center">
                            <HabitoDot habito={habito} value={entry[habito.key]} />
                          </TableCell>
                        ))}
                        <TableCell className="text-center tabular-nums">{entry.nf}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "inline-block rounded-lg px-2.5 py-1 font-semibold tabular-nums",
                              tonoTotal(entry.total),
                            )}
                          >
                            {entry.total.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Editar"
                              onClick={() => editarEntrada(entry)}
                            >
                              <Pencil className="size-4" />
                            </Button>

                            <Dialog>
                              <DialogTrigger
                                render={
                                  <Button
                                    size="icon-sm"
                                    variant="destructive"
                                    aria-label="Eliminar"
                                  />
                                }
                              >
                                <Trash2 className="size-4" />
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Eliminar entrada</DialogTitle>
                                  <DialogDescription>
                                    Se borrará el registro del{" "}
                                    {formatDateKey(entry.fecha.slice(0, 10))} (total{" "}
                                    {entry.total.toFixed(2)}). Esta acción no se puede
                                    deshacer.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="destructive"
                                    onClick={() => eliminarEntradaUI(entry)}
                                    disabled={isPending}
                                  >
                                    Eliminar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length} registros · página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

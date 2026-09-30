"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  CalendarDays,
  CalendarIcon,
  Flame,
  History,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { eliminarEntradaAction, guardarEntradaAction } from "@/app/actions";
import { calcularTotal, nfInputAValor } from "@/lib/calculos";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const selectedKey = toDateKey(selectedDate);
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.fecha.slice(0, 10) === selectedKey),
    [entries, selectedKey],
  );

  useEffect(() => {
    form.reset(selectedEntry ? entryToFormValues(selectedEntry) : DEFAULT_VALUES);
  }, [form, selectedEntry]);

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
      return true;
    });
  }, [entries, fromDate, toDate]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      try {
        const result = await guardarEntradaAction({
          fecha: selectedKey,
          ...values,
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        const saved = result.data;
        setEntries((prev) => {
          const next = prev.filter((entry) => entry.fecha !== saved.fecha);
          next.push(saved);
          next.sort((a, b) => b.fecha.localeCompare(a.fecha));
          return next;
        });
        toast.success("Entrada guardada");
      } catch (error) {
        reportarErrorCliente("accion.guardarEntrada", error, { fecha: selectedKey });
        toast.error("No se pudo contactar con el servidor");
      }
    });
  };

  const editarEntrada = (entry: EntryRow) => {
    setSelectedDate(keyToLocalDate(entry.fecha.slice(0, 10)));
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const eliminarEntradaUI = (fecha: string) => {
    startTransition(async () => {
      try {
        const result = await eliminarEntradaAction(fecha.slice(0, 10));
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setEntries((prev) => prev.filter((entry) => entry.fecha !== fecha));
        toast.success("Entrada eliminada");
      } catch (error) {
        reportarErrorCliente("accion.eliminarEntrada", error, { fecha });
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedEntry ? "Editar registro" : "Nuevo registro"}
                {selectedEntry ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    Ya existe
                  </span>
                ) : null}
              </CardTitle>
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
            <div className="flex flex-col gap-3 sm:flex-row">
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
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium tabular-nums">
                          {formatDateKey(entry.fecha.slice(0, 10))}
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
                                    {formatDateKey(entry.fecha.slice(0, 10))}. Esta acción
                                    no se puede deshacer.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="destructive"
                                    onClick={() => eliminarEntradaUI(entry.fecha)}
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

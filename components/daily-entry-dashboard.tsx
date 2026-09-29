"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { eliminarEntradaAction, guardarEntradaAction } from "@/app/actions";
import { calcularTotal, nfInputAValor } from "@/lib/calculos";
import { reportarErrorCliente } from "@/lib/reportar-error-cliente";
import { Badge } from "@/components/ui/badge";
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

const SWITCH_FIELDS: Array<{ key: keyof FormValues; label: string }> = [
  { key: "movil17", label: "Móvil - 17 horas" },
  { key: "movilResto", label: "Móvil resto de día" },
  { key: "np", label: "N. P" },
  { key: "ejercicio", label: "Ejercicio" },
  { key: "formacion", label: "Formación" },
  { key: "leer", label: "Leer" },
  { key: "social", label: "Social" },
];

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

function BoolBadge({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "default" : "secondary"}>{value ? "✓" : "✗"}</Badge>
  );
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
    <main className="container mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-6">
      <section ref={formSectionRef} className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Seguimiento diario de rendimiento
        </h1>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Registro / Edición diaria</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            />
                          }
                        >
                          <CalendarIcon className="mr-2 size-4" />
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
                          <FormLabel>Rendimiento Trabajo</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={24}
                              step="0.1"
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

                  <div className="grid gap-3 md:grid-cols-2">
                    {SWITCH_FIELDS.map((item) => (
                      <FormField
                        key={item.key}
                        control={form.control}
                        name={item.key}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <FormLabel>{item.label}</FormLabel>
                            <FormControl>
                              <Switch
                                checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="nf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N.F</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
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

                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Total en vivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {totalEnVivo === null ? "—" : totalEnVivo.toFixed(6)}
              </p>
              <p className="text-sm text-muted-foreground">
                {totalEnVivo === null
                  ? "Revisa N.F: debe ser un entero mayor o igual que 0."
                  : "Recalculado según los valores del formulario."}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Desde</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Hasta</label>
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

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[520px] overflow-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Rendimiento Trabajo</TableHead>
                    <TableHead>Móvil-17h</TableHead>
                    <TableHead>Móvil Resto</TableHead>
                    <TableHead>N.F</TableHead>
                    <TableHead>N.P</TableHead>
                    <TableHead>Ejercicio</TableHead>
                    <TableHead>Formación</TableHead>
                    <TableHead>Leer</TableHead>
                    <TableHead>Social</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-6 text-center text-muted-foreground">
                        Todavía no hay entradas en este rango de fechas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDateKey(entry.fecha.slice(0, 10))}</TableCell>
                        <TableCell>{entry.rendimientoTrabajo.toFixed(1)}</TableCell>
                        <TableCell>
                          <BoolBadge value={entry.movil17} />
                        </TableCell>
                        <TableCell>
                          <BoolBadge value={entry.movilResto} />
                        </TableCell>
                        <TableCell>{entry.nf}</TableCell>
                        <TableCell>
                          <BoolBadge value={entry.np} />
                        </TableCell>
                        <TableCell>
                          <BoolBadge value={entry.ejercicio} />
                        </TableCell>
                        <TableCell>
                          <BoolBadge value={entry.formacion} />
                        </TableCell>
                        <TableCell>
                          <BoolBadge value={entry.leer} />
                        </TableCell>
                        <TableCell>
                          <BoolBadge value={entry.social} />
                        </TableCell>
                        <TableCell>{entry.total.toFixed(6)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              onClick={() => editarEntrada(entry)}
                            >
                              <Pencil className="size-4" />
                            </Button>

                            <Dialog>
                              <DialogTrigger
                                render={
                                  <Button size="icon-sm" variant="destructive" />
                                }
                              >
                                <Trash2 className="size-4" />
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Eliminar entrada</DialogTitle>
                                  <DialogDescription>
                                    Esta accion no se puede deshacer.
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
                {filteredEntries.length} registros
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

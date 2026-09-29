"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { importarEntradasAction } from "@/app/actions";
import { reportarErrorCliente } from "@/lib/reportar-error-cliente";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EXCEL_HEADERS,
  entriesToExcelRows,
  parseExcelRowsToEntries,
  validarCabeceras,
  type ExportEntry,
  type ImportParseResult,
} from "@/lib/importExport";

type Entry = ExportEntry & { id: string; total: number };

function Cifra({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div
      style={{ "--cifra": color } as CSSProperties}
      className="rounded-xl bg-[color-mix(in_oklch,var(--cifra),transparent_88%)] p-3"
    >
      <p className="font-heading text-2xl font-bold tabular-nums text-[color-mix(in_oklch,var(--cifra),var(--foreground)_30%)]">
        {valor}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ImportExportDashboard({ entries }: { entries: Entry[] }) {
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    skippedExisting: number;
    invalid: number;
  } | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [importing, setImporting] = useState(false);
  const router = useRouter();

  const existingDateSet = useMemo(
    () => new Set(entries.map((entry) => String(entry.fecha).slice(0, 10))),
    [entries],
  );

  const conflictsWithDb = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.validRows.filter((row) => existingDateSet.has(row.fecha)).length;
  }, [existingDateSet, parseResult]);

  const previewRows = useMemo(
    () => (parseResult ? parseResult.preview.slice(0, 30) : []),
    [parseResult],
  );

  const filteredExportEntries = useMemo(() => {
    return entries.filter((entry) => {
      const key = String(entry.fecha).slice(0, 10);
      if (fromDate && key < fromDate) return false;
      if (toDate && key > toDate) return false;
      return true;
    });
  }, [entries, fromDate, toDate]);

  const onFileSelected = async (file: File) => {
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        toast.error("Solo se aceptan archivos .xlsx");
        return;
      }
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const nombreHoja = wb.SheetNames.find((nombre) => wb.Sheets[nombre]?.["!ref"]);
      if (!nombreHoja) {
        toast.error("El archivo no tiene ninguna hoja con datos");
        return;
      }
      const rows = (
        XLSX.utils.sheet_to_json(wb.Sheets[nombreHoja], {
          header: 1,
          raw: true,
          defval: null,
        }) as unknown[][]
      ).map((row) => row.slice(0, EXCEL_HEADERS.length));

      const erroresCabecera = validarCabeceras(rows[0]);
      if (erroresCabecera.length > 0) {
        toast.error("Cabeceras no reconocidas", {
          description: erroresCabecera.slice(0, 3).join(" · "),
        });
        return;
      }

      const result = parseExcelRowsToEntries(rows);
      setParseResult(result);
      setImportSummary(null);
      toast.success(
        `Archivo leido: ${result.validRows.length} filas validas, ${result.invalidCount} invalidas`,
      );
    } catch (error) {
      reportarErrorCliente("importacion.leer_excel", error, { archivo: file.name });
      toast.error("Error leyendo archivo Excel");
    }
  };

  const confirmarImportacion = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;
    setImporting(true);
    try {
      const result = await importarEntradasAction(
        parseResult.validRows,
        overwriteExisting,
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setImportSummary(result.data);
      toast.success("Importación completada");
      router.refresh();
    } catch (error) {
      reportarErrorCliente("accion.importarEntradas", error, {
        filas: parseResult.validRows.length,
      });
      toast.error("No se pudo completar la importación");
    } finally {
      setImporting(false);
    }
  };

  const exportarExcel = () => {
    const rows = entriesToExcelRows(filteredExportEntries);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const file = `rendimiento-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, file);
    toast.success(`Exportacion lista: ${file}`);
  };

  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        icon={FileSpreadsheet}
        title="Importar / Exportar"
        description="Carga tu Excel histórico o descarga tus registros."
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="size-5 text-brand" />
              Importar desde Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[color-mix(in_oklch,var(--brand),transparent_60%)] bg-[color-mix(in_oklch,var(--brand),transparent_94%)] px-6 py-10 text-center transition-colors hover:border-brand hover:bg-[color-mix(in_oklch,var(--brand),transparent_88%)]">
              <span className="bg-brand-gradient grid size-14 place-items-center rounded-2xl text-white shadow-[0_10px_24px_-10px_var(--brand)] transition-transform group-hover:scale-105">
                <FileSpreadsheet className="size-7" />
              </span>
              <span className="font-medium">
                {fileName || "Pulsa para elegir tu archivo .xlsx"}
              </span>
              <span className="text-xs text-muted-foreground">
                Columnas A-K: Fecha, Rendimiento Trabajo, hábitos, N.F. y Total
              </span>
              <input
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileSelected(file);
                  event.target.value = "";
                }}
              />
            </label>

            {parseResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Cifra label="Válidas" valor={parseResult.validRows.length} color="var(--success)" />
                  <Cifra label="Inválidas" valor={parseResult.invalidCount} color="var(--destructive)" />
                  <Cifra label="Duplicadas" valor={parseResult.duplicateInFileCount} color="var(--warning)" />
                  <Cifra label="Ya en BD" valor={conflictsWithDb} color="var(--brand-3)" />
                </div>
                <label className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                  <Switch
                    checked={overwriteExisting}
                    onCheckedChange={(v) => setOverwriteExisting(Boolean(v))}
                  />
                  Sobrescribir fechas que ya existen
                </label>
                <Button
                  size="lg"
                  className="h-10 w-full"
                  onClick={confirmarImportacion}
                  disabled={parseResult.validRows.length === 0 || importing}
                >
                  <Upload className="size-4" />
                  {importing
                    ? "Importando..."
                    : `Importar ${parseResult.validRows.length} registros`}
                </Button>
              </div>
            ) : null}

            {importSummary ? (
              <div className="space-y-3 rounded-xl border border-success/40 bg-success/10 p-4">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 text-success" />
                  Importación completada
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Cifra label="Nuevas" valor={importSummary.imported} color="var(--success)" />
                  <Cifra label="Actualizadas" valor={importSummary.updated} color="var(--brand)" />
                  <Cifra label="Omitidas" valor={importSummary.skippedExisting} color="var(--warning)" />
                  <Cifra label="Con error" valor={importSummary.invalid} color="var(--destructive)" />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="size-5 text-brand" />
              Exportar a Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporta en formato A-K compatible con tu archivo original.
            </p>
            {entries.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Aún no tienes datos guardados. Puedes empezar importando un Excel o crear
                registros diarios en Inicio.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-sm">Desde (opcional)</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm">Hasta (opcional)</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="lg"
              className="h-10 w-full"
              onClick={exportarExcel}
              disabled={filteredExportEntries.length === 0}
            >
              <Download className="size-4" />
              Exportar {filteredExportEntries.length} registros
            </Button>
          </CardContent>
        </Card>
      </section>

      {parseResult ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Vista previa de importación</h2>
          <div className="max-h-[480px] overflow-auto rounded-2xl border bg-card backdrop-blur">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Total Excel</TableHead>
                  <TableHead>Total recalculado</TableHead>
                  <TableHead>Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.fecha ?? "-"}</TableCell>
                    <TableCell>
                      {row.status === "valid" ? (
                        <Badge>Valida</Badge>
                      ) : row.status === "duplicate_in_file" ? (
                        <Badge variant="outline">Duplicada</Badge>
                      ) : (
                        <Badge variant="destructive">Invalida</Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.motivo ?? "-"}</TableCell>
                    <TableCell>
                      {typeof row.excelTotal === "number"
                        ? row.excelTotal.toFixed(2)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {typeof row.totalCalculado === "number"
                        ? row.totalCalculado.toFixed(2)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {typeof row.totalDiff === "number" ? (
                        row.totalDiff > 0.01 ? (
                          <Badge variant="destructive">{row.totalDiff.toFixed(3)}</Badge>
                        ) : (
                          <Badge variant="secondary">{row.totalDiff.toFixed(3)}</Badge>
                        )
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Se muestran las primeras 30 filas detectadas. Columnas desde L en adelante
            se ignoran.
          </p>
        </section>
      ) : null}
    </main>
  );
}

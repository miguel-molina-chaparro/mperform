"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { importarEntradasAction } from "@/app/actions";
import { reportarErrorCliente } from "@/lib/reportar-error-cliente";
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
  entriesToExcelRows,
  parseExcelRowsToEntries,
  type ExportEntry,
  type ImportParseResult,
} from "@/lib/importExport";

type Entry = ExportEntry & { id: string; total: number };

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
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = wb.Sheets.Sheet1;
      if (!sheet) {
        toast.error("No se encontro la hoja 'Sheet1'");
        return;
      }
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null,
        range: "A:K",
      }) as unknown[][];

      if (!rows.length || String(rows[0]?.[0] ?? "").toLowerCase() !== "fecha") {
        toast.error("Formato invalido: cabeceras A-K no reconocidas");
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
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Importar / Exportar</h1>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Importar desde Excel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFileSelected(file);
              }}
            />
            {fileName ? (
              <p className="text-sm text-muted-foreground">Archivo: {fileName}</p>
            ) : null}

            {parseResult ? (
              <div className="space-y-2 text-sm">
                <p>
                  Filas validas: <strong>{parseResult.validRows.length}</strong>
                </p>
                <p>
                  Filas invalidas: <strong>{parseResult.invalidCount}</strong>
                </p>
                <p>
                  Duplicadas en archivo:{" "}
                  <strong>{parseResult.duplicateInFileCount}</strong>
                </p>
                <p>
                  Ya existentes en BD: <strong>{conflictsWithDb}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={overwriteExisting}
                    onCheckedChange={(v) => setOverwriteExisting(Boolean(v))}
                  />
                  <span>Sobrescribir fechas existentes</span>
                </div>
                <Button
                  onClick={confirmarImportacion}
                  disabled={parseResult.validRows.length === 0 || importing}
                >
                  {importing ? "Importando..." : "Confirmar importación"}
                </Button>
              </div>
            ) : null}

            {importSummary ? (
              <div className="rounded-lg border p-3 text-sm">
                <p>
                  Importadas: <strong>{importSummary.imported}</strong>
                </p>
                <p>
                  Actualizadas: <strong>{importSummary.updated}</strong>
                </p>
                <p>
                  Omitidas por existentes: <strong>{importSummary.skippedExisting}</strong>
                </p>
                <p>
                  Omitidas por error: <strong>{importSummary.invalid}</strong>
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exportar a Excel</CardTitle>
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
            <p className="text-sm text-muted-foreground">
              Registros a exportar: {filteredExportEntries.length}
            </p>
            <Button onClick={exportarExcel} disabled={filteredExportEntries.length === 0}>
              Exportar a Excel
            </Button>
          </CardContent>
        </Card>
      </section>

      {parseResult ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Vista previa de importacion</h2>
          <div className="max-h-[480px] overflow-auto rounded-lg border">
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

import { format } from "date-fns";

import { calcularTotal, nfInputAValor, valorANfInput } from "./calculos";

export const EXCEL_HEADERS = [
  "Fecha",
  "Rendimiento Trabajo",
  "Movil - 17 horas",
  "Móvil Resto de día",
  "N.F.",
  "N. P",
  "Ejercicio",
  "Formacion",
  "Leer",
  "Social",
  "Total",
] as const;

export type ImportEntryInput = {
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
};

export type ImportPreviewRow = {
  rowNumber: number;
  fecha?: string;
  status: "valid" | "invalid" | "duplicate_in_file";
  motivo?: string;
  excelTotal?: number;
  totalCalculado?: number;
  totalDiff?: number;
  data?: ImportEntryInput;
};

export type ImportParseResult = {
  validRows: ImportEntryInput[];
  preview: ImportPreviewRow[];
  invalidCount: number;
  duplicateInFileCount: number;
};

const MS_POR_DIA = 86_400_000;
const EPOCH_EXCEL_UTC = Date.UTC(1899, 11, 30);

function normalizarCabecera(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Comprueba las cabeceras A-K. La columna A puede venir vacia (es habitual que
 * la celda de la fecha no tenga titulo); el resto se compara sin tildes,
 * mayusculas, espacios ni signos de puntuacion.
 */
export function validarCabeceras(cabecera: unknown[] | undefined): string[] {
  if (!cabecera) return ["El archivo no tiene filas"];
  const errores: string[] = [];
  const primera = normalizarCabecera(cabecera[0]);
  if (primera !== "" && primera !== "fecha") {
    errores.push(`A: se esperaba "Fecha" o vacía y hay "${String(cabecera[0])}"`);
  }
  EXCEL_HEADERS.forEach((esperada, i) => {
    if (i === 0) return;
    if (normalizarCabecera(cabecera[i]) !== normalizarCabecera(esperada)) {
      const columna = String.fromCharCode(65 + i);
      errores.push(
        `${columna}: se esperaba "${esperada}" y hay "${String(cabecera[i] ?? "")}"`,
      );
    }
  });
  return errores;
}

function normalizarFechaExcel(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const dt = new Date(EPOCH_EXCEL_UTC + Math.floor(raw) * MS_POR_DIA);
    return dt.toISOString().slice(0, 10);
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return format(raw, "yyyy-MM-dd");
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) return format(dt, "yyyy-MM-dd");
  }
  return null;
}

/** Celda vacia = 0 (no cumplido), igual que la formula del Total en Excel. */
function toBinaryBool(raw: unknown): boolean | null {
  if (raw === 1 || raw === "1" || raw === true) return true;
  if (raw === 0 || raw === "0" || raw === false) return false;
  if (raw === null || raw === undefined || raw === "") return false;
  return null;
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function parseExcelRowsToEntries(rows: unknown[][]): ImportParseResult {
  const dataRows = rows.slice(1);
  const seenDates = new Set<string>();
  const preview: ImportPreviewRow[] = [];
  const validRows: ImportEntryInput[] = [];
  let invalidCount = 0;
  let duplicateInFileCount = 0;

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const cols = row.slice(0, 11);
    const isEmpty = cols.every(
      (value) => value === null || value === undefined || value === "",
    );
    if (isEmpty) return;

    const fecha = normalizarFechaExcel(cols[0]);
    const rendimientoTrabajo = toNumber(cols[1]);
    const movil17 = toBinaryBool(cols[2]);
    const movilResto = toBinaryBool(cols[3]);
    const nfValor = toNumber(cols[4]);
    const np = toBinaryBool(cols[5]);
    const ejercicio = toBinaryBool(cols[6]);
    const formacion = toBinaryBool(cols[7]);
    const leer = toBinaryBool(cols[8]);
    const social = toBinaryBool(cols[9]);
    const excelTotal = toNumber(cols[10]);

    if (!fecha) {
      invalidCount += 1;
      preview.push({ rowNumber, status: "invalid", motivo: "Fecha invalida" });
      return;
    }
    if (seenDates.has(fecha)) {
      duplicateInFileCount += 1;
      preview.push({
        rowNumber,
        fecha,
        status: "duplicate_in_file",
        motivo: "Fecha duplicada dentro del mismo archivo",
      });
      return;
    }
    seenDates.add(fecha);

    if (
      rendimientoTrabajo === null ||
      movil17 === null ||
      movilResto === null ||
      nfValor === null ||
      np === null ||
      ejercicio === null ||
      formacion === null ||
      leer === null ||
      social === null
    ) {
      invalidCount += 1;
      preview.push({
        rowNumber,
        fecha,
        status: "invalid",
        motivo:
          rendimientoTrabajo === null
            ? "Rendimiento Trabajo vacío o no numérico"
            : nfValor === null
              ? "N.F. vacío o no numérico"
              : "Los hábitos solo admiten 0, 1 o vacío",
      });
      return;
    }

    let nf: number;
    try {
      nf = valorANfInput(nfValor);
    } catch {
      invalidCount += 1;
      preview.push({
        rowNumber,
        fecha,
        status: "invalid",
        motivo: `N.F. invalido: ${String(nfValor)}`,
      });
      return;
    }

    const totalCalculado = calcularTotal({
      rendimientoTrabajo,
      movil17,
      movilResto,
      np,
      ejercicio,
      formacion,
      leer,
      social,
      nfValor,
    });

    const data: ImportEntryInput = {
      fecha,
      rendimientoTrabajo,
      movil17,
      movilResto,
      nf,
      np,
      ejercicio,
      formacion,
      leer,
      social,
    };

    validRows.push(data);
    preview.push({
      rowNumber,
      fecha,
      status: "valid",
      excelTotal: excelTotal ?? undefined,
      totalCalculado,
      totalDiff:
        excelTotal === null ? undefined : Math.abs(totalCalculado - excelTotal),
      data,
    });
  });

  return {
    validRows,
    preview,
    invalidCount,
    duplicateInFileCount,
  };
}

export type ExportEntry = {
  fecha: string | Date;
  rendimientoTrabajo: number;
  movil17: boolean;
  movilResto: boolean;
  np: boolean;
  ejercicio: boolean;
  formacion: boolean;
  leer: boolean;
  social: boolean;
  nf: number;
};

export function entriesToExcelRows(entries: ExportEntry[]): (string | number | Date)[][] {
  const rows: (string | number | Date)[][] = [Array.from(EXCEL_HEADERS)];

  entries
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .forEach((entry) => {
      const nfValor = nfInputAValor(entry.nf);
      const total = calcularTotal({
        rendimientoTrabajo: entry.rendimientoTrabajo,
        movil17: entry.movil17,
        movilResto: entry.movilResto,
        np: entry.np,
        ejercicio: entry.ejercicio,
        formacion: entry.formacion,
        leer: entry.leer,
        social: entry.social,
        nfValor,
      });

      rows.push([
        new Date(entry.fecha),
        entry.rendimientoTrabajo,
        entry.movil17 ? 1 : 0,
        entry.movilResto ? 1 : 0,
        nfValor,
        entry.np ? 1 : 0,
        entry.ejercicio ? 1 : 0,
        entry.formacion ? 1 : 0,
        entry.leer ? 1 : 0,
        entry.social ? 1 : 0,
        Number(total.toFixed(6)),
      ]);
    });

  return rows;
}

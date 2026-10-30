/**
 * Parser de coordenadas coladas de texto livre (bloco de notas, Excel, e-mail).
 * Aceita por linha: `lat, lon[, h]` em decimais (ponto OU vírgula) ou GMS
 * (`-22°54'28,9" S`, `22 54 28.9 O`), separados por vírgula, ponto-e-vírgula
 * ou tabulação. Linhas não interpretáveis voltam marcadas como inválidas.
 */
import { parseDmsString } from './geodesy';

export interface PastedRow {
  raw: string;
  lat: number | null;
  lon: number | null;
  h: number | null;
}

export interface PasteResult {
  rows: PastedRow[];
  valid: number;
  invalid: number;
}

const FIELD_SPLIT = /\t|;|,|\s{2,}/;

function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!cleaned) return null;
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseCoordinateField(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // GMS quando contém símbolos de grau/minuto/segundo ou hemisfério
  if (/[°º'"′″]/.test(trimmed) || /[nsewol]$/i.test(trimmed.replace(/["\s]/g, ''))) {
    try {
      return parseDmsString(trimmed);
    } catch {
      return null;
    }
  }
  return parseNumber(trimmed);
}

export function parsePastedCoordinates(text: string): PasteResult {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !/^[-,;\t\s]+$/.test(line)); // descarta separadores soltos

  const rows: PastedRow[] = lines.map(raw => {
    const fields = raw.split(FIELD_SPLIT).map(f => f.trim()).filter(f => f.length > 0);
    if (fields.length < 2) return { raw, lat: null, lon: null, h: null };

    const lat = parseCoordinateField(fields[0]);
    const lon = parseCoordinateField(fields[1]);
    const h = fields.length >= 3 ? parseNumber(fields[2]) : null;
    return { raw, lat, lon, h };
  });

  const valid = rows.filter(r => r.lat !== null && r.lon !== null).length;
  return { rows, valid, invalid: rows.length - valid };
}

/** Converte as linhas válidas no formato interno do fluxo de lote. */
export function pasteRowsToDataRows(rows: PastedRow[]): Record<string, string>[] {
  return rows
    .filter(r => r.lat !== null && r.lon !== null)
    .map((r, i) => ({
      latitude: String(r.lat),
      longitude: String(r.lon),
      altitude_elipsoidal: r.h !== null ? String(r.h) : '',
      descricao: `Colado ${i + 1}`,
    }));
}

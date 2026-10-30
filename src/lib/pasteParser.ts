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

const FIELD_SPLIT = /\t+|;/;

/**
 * Divide a linha em campos resolvendo a ambiguidade da vírgula no Brasil
 * (decimal vs separador):
 *  - tab ou ponto-e-vírgula presentes → são os separadores, vírgula é decimal;
 *  - só vírgulas: com até 3 campos é separador (`lat,lon,h` com decimais por
 *    ponto); com mais de 3 são decimais agrupadas sem espaço — reemparelha
 *    (`-22,9068,-43,1729,5` → [-22.9068, -43.1729, 5]).
 */
function splitFields(line: string): string[] {
  if (/\t/.test(line)) return line.split(/\t+/);
  if (line.includes(';')) return line.split(/;/);
  const parts = line.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 3) return parts;
  const merged: string[] = [];
  let i = 0;
  for (; i + 1 < parts.length; i += 2) {
    merged.push(`${parts[i]}.${parts[i + 1]}`);
  }
  if (i < parts.length) merged.push(parts[i]);
  return merged;
}

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
    // Normaliza a vírgula decimal dentro de GMS (ex.: 28,9") antes de dividir
    const normalized = raw.replace(/([°º'′])(\d+),(\d+)/g, '$1$2.$3');
    const fields = splitFields(normalized).map(f => f.trim()).filter(f => f.length > 0);
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

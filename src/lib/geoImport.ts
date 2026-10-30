/**
 * Importação de arquivos GeoJSON, KML e XLSX para o fluxo de lote — todos
 * viram o mesmo Record<string,string>[] que o upload CSV produz.
 */
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson';

export interface GeoImportResult {
  rows: Record<string, string>[];
  source: string;
  warnings: string[];
}

const firstCoord = (geom: Geometry | null): Position | null => {
  if (!geom) return null;
  const dive = (coords: unknown): Position | null => {
    if (!Array.isArray(coords)) return null;
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return coords as Position;
    }
    for (const c of coords) {
      const found = dive(c);
      if (found) return found;
    }
    return null;
  };
  return dive((geom as unknown as { coordinates?: unknown }).coordinates);
};

/** GeoJSON (FeatureCollection, Feature ou Geometry isolada) → pontos. */
export function parseGeoJson(data: unknown, source = 'GeoJSON'): GeoImportResult {
  const rows: Record<string, string>[] = [];
  const warnings: string[] = [];
  const features: Feature[] = [];

  const fc = data as FeatureCollection;
  if (fc && fc.type === 'FeatureCollection' && Array.isArray(fc.features)) {
    features.push(...fc.features);
  } else if (data && typeof data === 'object' && (data as Feature).type === 'Feature') {
    features.push(data as Feature);
  } else if (data && typeof data === 'object' && (data as Geometry).type && 'coordinates' in data) {
    const pos = firstCoord(data as unknown as Geometry);
    if (pos) rows.push(coordToRow(pos, 'Geometria 1'));
  } else {
    return { rows: [], source, warnings: ['Arquivo GeoJSON sem features reconhecíveis.'] };
  }

  features.forEach((f, i) => {
    const pos = firstCoord(f.geometry);
    if (pos) {
      rows.push(coordToRow(pos, featureName(f, i)));
    } else if (f.geometry) {
      warnings.push(`Feature ${i + 1} (${f.geometry.type}) não tem ponto extraível — ignorada.`);
    }
  });

  return { rows, source, warnings };
}

function featureName(f: Feature, index: number): string {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const name = props.name ?? props.nome ?? props.NM_MUN ?? props.description;
  return typeof name === 'string' && name.trim() ? name.trim() : `Feature ${index + 1}`;
}

function coordToRow(pos: Position, name: string): Record<string, string> {
  const [lon, lat, z] = pos;
  return {
    latitude: String(lat),
    longitude: String(lon),
    altitude_elipsoidal: typeof z === 'number' ? String(z) : '',
    descricao: name,
  };
}

/** KML → pontos (Placemarks com Point). */
export function parseKml(xmlText: string, source = 'KML'): GeoImportResult {
  const rows: Record<string, string>[] = [];
  const warnings: string[] = [];

  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    return { rows: [], source, warnings: ['KML inválido (XML mal formado).'] };
  }

  const placemarks = Array.from(doc.getElementsByTagName('Placemark'));
  placemarks.forEach((pm, i) => {
    const nameEl = pm.getElementsByTagName('name')[0];
    const coordEl = pm.getElementsByTagName('coordinates')[0];
    if (!coordEl) {
      warnings.push(`Placemark ${i + 1} sem coordinates — ignorado.`);
      return;
    }
    const parts = coordEl.textContent?.trim().split(/\s+/) ?? [];
    for (const triple of parts) {
      const [lon, lat, z] = triple.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        rows.push({
          latitude: String(lat),
          longitude: String(lon),
          altitude_elipsoidal: Number.isFinite(z) ? String(z) : '',
          descricao: nameEl?.textContent?.trim() || `Placemark ${i + 1}`,
        });
      }
    }
  });

  if (rows.length === 0 && warnings.length === 0) {
    warnings.push('Nenhum Placemark com ponto encontrado no KML.');
  }
  return { rows, source, warnings };
}

/** XLSX (primeira aba não vazia) → linhas equivalentes ao CSV. */
export async function parseXlsx(file: File): Promise<GeoImportResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    if (rows.length === 0) continue;
    return {
      rows: rows.map(row => {
        const typed: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          typed[key] =
            typeof value === 'string'
              ? value
              : typeof value === 'number' || typeof value === 'boolean'
                ? String(value)
                : '';
        }
        return typed;
      }),
      source: `XLSX · aba "${sheetName}"`,
      warnings: workbook.SheetNames.length > 1 ? [`Planilha tem ${workbook.SheetNames.length} abas — importada a primeira não vazia ("${sheetName}").`] : [],
    };
  }
  return { rows: [], source: 'XLSX', warnings: ['Nenhuma aba com dados encontrada.'] };
}

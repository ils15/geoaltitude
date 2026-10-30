/**
 * Projeto OpenGeoaltitude salvável (.geoalt.json) e compartilhável (hash da URL).
 */
import type { HgeoResult } from './api';
import { downloadText } from './export';

export interface GeoAltProject {
  app: 'geoalt';
  version: 1;
  savedAt: string;
  results: HgeoResult[];
}

export function buildProject(results: HgeoResult[]): GeoAltProject {
  return { app: 'geoalt', version: 1, savedAt: new Date().toISOString(), results };
}

export function exportProjectFile(results: HgeoResult[]) {
  downloadText(
    JSON.stringify(buildProject(results), null, 2),
    `projeto_geoalt_${Date.now()}.geoalt.json`,
    'application/json'
  );
}

export function parseProjectFile(text: string): HgeoResult[] {
  const data: unknown = JSON.parse(text);
  if (typeof data !== 'object' || data === null || (data as GeoAltProject).app !== 'geoalt') {
    throw new Error('Arquivo não é um projeto OpenGeoaltitude (.geoalt.json).');
  }
  const results = (data as GeoAltProject).results;
  if (!Array.isArray(results)) throw new Error('Projeto sem resultados.');
  return results;
}

/** Serializa resultados no hash da URL (#p=...) com compressão quando disponível. */
export async function buildShareHash(results: HgeoResult[]): Promise<string> {
  const json = JSON.stringify({ app: 'geoalt', v: 1, results });
  if (typeof CompressionStream === 'undefined' || json.length < 400) {
    return `#p=${encodeURIComponent(json)}`;
  }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `#pg=${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export async function readShareHash(hash: string): Promise<HgeoResult[] | null> {
  const m = hash.match(/^#p[gl]=(.+)$/);
  if (!m) return null;
  try {
    if (hash.startsWith('#pg=')) {
      if (typeof DecompressionStream === 'undefined') return null;
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const json = await new Response(stream).text();
      const parsed: unknown = JSON.parse(json);
      return (parsed as GeoAltProject).results ?? null;
    }
    const parsed: unknown = JSON.parse(decodeURIComponent(m[1]));
    return (parsed as GeoAltProject).results ?? null;
  } catch {
    return null;
  }
}

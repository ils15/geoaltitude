/**
 * Conexão com sistemas abertos na internet (sem chave de API).
 *  - Open-Meteo Elevation: altitude do terreno de modelos digitais abertos
 *    (Copernicus DEM GLO-90) — gratuito e sem chave.
 *  - Nominatim (OSM): geocodificação direta está em src/lib/geocoding.ts.
 */

export interface TerrainElevation {
  elevation: number; // m (aprox. ortométrica)
  source: string;
  model: string;
}

/** Altitude do terreno para um ponto, via DEM aberto do Open-Meteo. */
export async function fetchTerrainElevation(lat: number, lon: number): Promise<TerrainElevation> {
  const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
  if (!response.ok) {
    throw new Error('Falha ao consultar o serviço de elevação aberto (Open-Meteo).');
  }
  const data: unknown = await response.json();
  const elevation = readElevation(data, 0);
  if (elevation === null) {
    throw new Error('Resposta inválida do serviço de elevação.');
  }
  return { elevation, source: 'Open-Meteo', model: 'Copernicus DEM GLO-90' };
}

function readElevation(data: unknown, index: number): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const list: unknown = (data as { elevation?: unknown }).elevation;
  if (!Array.isArray(list)) return null;
  const value: unknown = list[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Altitudes do terreno em lote (Open-Meteo aceita até 100 coordenadas por
 * chamada). A ordem do resultado é a mesma da entrada; pontos sem resposta
 * voltam como null.
 */
export async function fetchTerrainElevationBatch(
  points: Array<{ lat: number; lon: number }>
): Promise<Array<number | null>> {
  const BATCH = 100;
  const result: Array<number | null> = [];

  for (let i = 0; i < points.length; i += BATCH) {
    const chunk = points.slice(i, i + BATCH);
    try {
      const lat = chunk.map((p) => p.lat.toFixed(6)).join(',');
      const lon = chunk.map((p) => p.lon.toFixed(6)).join(',');
      const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
      if (!response.ok) throw new Error('DEM request failed');
      const data: unknown = await response.json();
      for (let j = 0; j < chunk.length; j++) {
        result.push(readElevation(data, j));
      }
    } catch {
      // falha do lote inteiro: mantém o alinhamento com nulls
      for (let j = 0; j < chunk.length; j++) result.push(null);
    }
    if (i + BATCH < points.length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return result;
}

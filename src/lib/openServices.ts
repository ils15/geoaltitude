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
  const elevation =
    typeof data === 'object' && data !== null && Array.isArray((data as { elevation?: unknown }).elevation)
      ? (data as { elevation: unknown[] }).elevation[0]
      : undefined;
  if (typeof elevation !== 'number') {
    throw new Error('Resposta inválida do serviço de elevação.');
  }
  return { elevation, source: 'Open-Meteo', model: 'Copernicus DEM GLO-90' };
}

import { parseFatorConversao } from './geodesy';

export interface HgeoResult {
  fator_conversao: number | string;
  incerteza: number | string;
  lat: string;
  long: string;
  modelo: string;
  h?: number; // Altitude geométrica
  H?: number; // Altitude ortométrica (modelo hgeoHNOR / IBGE)
  address?: string; // Endereço aproximado
  N_egm96?: number; // Ondulação do modelo global EGM96 (comparação offline)
  H_egm96?: number; // Altitude ortométrica segundo o EGM96
}

export interface LatLonInput {
  lat: number;
  lon: number;
}

export interface HgeoSummary {
  /** Ondulação geoidal N (m). null quando o ponto está fora da grade do modelo. */
  N: number | null;
  /** Incerteza do modelo no ponto (m). */
  incerteza: number | null;
  modelo: string;
  foraDaGrade: boolean;
}

export async function getPontoDec(lat: number, lon: number): Promise<HgeoResult> {
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/hgeohnor/ponto_dec?lat=${lat}&lon=${lon}`);
  if (!response.ok) {
    throw new Error('Failed to fetch from IBGE API');
  }
  return response.json();
}

export async function getPontoGms(
  glat: number, mlat: number, slat: number,
  glon: number, mlon: number, slon: number
): Promise<HgeoResult> {
  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/hgeohnor/ponto_gms?glat=${glat}&mlat=${mlat}&slat=${slat}&glon=${glon}&mlon=${mlon}&slon=${slon}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch from IBGE API');
  }
  return response.json();
}

/**
 * Consulta em lote ao modelo geoidal (GET /hgeohnor/pontos). A ordem do
 * resultado é a mesma da entrada. Pontos fora da grade do modelo voltam com
 * fator_conversao/incerteza/modelo = "fora_grid" (N nulo em summarizeHgeoResult).
 */
export async function getPontosBatch(points: LatLonInput[]): Promise<HgeoResult[]> {
  if (points.length === 0) return [];
  const params = encodeURIComponent(JSON.stringify(points.map(p => ({ lat: p.lat, lon: p.lon }))));
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/hgeohnor/pontos?pontos=${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch batch from IBGE API');
  }
  return response.json();
}

/**
 * Normaliza o resultado da API hgeoHNOR: extrai N e incerteza como números,
 * identifica pontos fora da grade ("fora_grid") e expõe o nome do modelo
 * (ex.: "hgeoHNOR_IMBITUBA", referido ao RN2015/Imbituba via REALT-2018).
 */
export function summarizeHgeoResult(res: HgeoResult): HgeoSummary {
  const N = parseFatorConversao(res.fator_conversao);
  return {
    N,
    incerteza: parseFatorConversao(res.incerteza),
    modelo: res.modelo ?? '',
    foraDaGrade: N === null,
  };
}

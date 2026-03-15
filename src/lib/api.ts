export interface HgeoResult {
  fator_conversao: number | string;
  incerteza: number | string;
  lat: string;
  long: string;
  modelo: string;
  h?: number; // Altitude geométrica
  H?: number; // Altitude ortométrica
  address?: string; // Endereço aproximado
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

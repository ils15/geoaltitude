/**
 * Dataset de demonstração do GeoAlt — 13 pontos pelo Brasil com altitudes
 * elipsoidais (h) derivadas de altitudes ortométricas (H) realistas:
 *
 *   h = H + N, com N consultado no modelo geoidal oficial do IBGE (hgeoHNOR,
 *   capturado em 10/2026). Por isso, quando o app calcular H = h − N, os
 *   valores voltam exatamente para as altitudes ortométricas esperadas.
 *
 * Observações pedagógicas embutidas nos dados:
 *  - Belém: N ≈ −25,7 m (a depressão do geóide na foz do Amazonas) → o h
 *    elipsoidal fica NEGATIVO no litoral norte;
 *  - Sul (Curitiba/Porto Alegre): N é POSITIVO (+4 a +5 m), geóide acima do
 *    elipsoide;
 *  - Pico da Neblina: a API responde com o modelo MAPGEO2015_OESTE (região
 *    oeste usa MAPGEO2015 como fallback).
 */

export interface DemoPoint {
  latitude: number;
  longitude: number;
  altitude_elipsoidal: number;
  descricao: string;
}

export const DEMO_POINTS: DemoPoint[] = [
  {
    latitude: -22.9492,
    longitude: -43.1545,
    altitude_elipsoidal: -1.07,
    descricao: 'Rio de Janeiro - Pão de Açúcar (RJ)',
  },
  { latitude: -23.5505, longitude: -46.6333, altitude_elipsoidal: 756.84, descricao: 'São Paulo - Praça da Sé (SP)' },
  {
    latitude: -15.7939,
    longitude: -47.8828,
    altitude_elipsoidal: 1157.24,
    descricao: 'Brasília - Eixo Monumental (DF)',
  },
  { latitude: -8.0631, longitude: -34.8711, altitude_elipsoidal: -2.86, descricao: 'Recife - Marco Zero (PE)' },
  { latitude: -12.9718, longitude: -38.51, altitude_elipsoidal: 28.94, descricao: 'Salvador - Elevador Lacerda (BA)' },
  { latitude: -3.1187, longitude: -60.0233, altitude_elipsoidal: 32.48, descricao: 'Manaus - Teatro Amazonas (AM)' },
  { latitude: -1.4558, longitude: -48.4902, altitude_elipsoidal: -17.74, descricao: 'Belém - Ver-o-Peso (PA)' },
  {
    latitude: -25.4423,
    longitude: -49.2746,
    altitude_elipsoidal: 924.08,
    descricao: 'Curitiba - Jardim Botânico (PR)',
  },
  {
    latitude: -30.0277,
    longitude: -51.2287,
    altitude_elipsoidal: 10.17,
    descricao: 'Porto Alegre - Mercado Público (RS)',
  },
  {
    latitude: -19.9345,
    longitude: -43.9331,
    altitude_elipsoidal: 843.56,
    descricao: 'Belo Horizonte - Praça da Liberdade (MG)',
  },
  { latitude: -16.6799, longitude: -49.255, altitude_elipsoidal: 739.96, descricao: 'Goiânia - Praça Cívica (GO)' },
  { latitude: -3.7187, longitude: -38.543, altitude_elipsoidal: -7.26, descricao: 'Fortaleza - Praia de Iracema (CE)' },
  { latitude: -0.6814, longitude: -66.844, altitude_elipsoidal: 2999.36, descricao: 'Pico da Neblina (AM)' },
];

/** Linhas no mesmo formato que o PapaParse produz ao ler o CSV de exemplo. */
export const DEMO_ROWS: Record<string, string>[] = DEMO_POINTS.map((p) => ({
  latitude: String(p.latitude),
  longitude: String(p.longitude),
  altitude_elipsoidal: String(p.altitude_elipsoidal),
  descricao: p.descricao,
}));

/** CSV do exemplo (mesmas colunas do template de upload em lote). */
export function demoCsv(): string {
  const rows = DEMO_POINTS.map((p) => `${p.latitude},${p.longitude},${p.altitude_elipsoidal},"${p.descricao}"`);
  return ['latitude,longitude,altitude_elipsoidal,descricao', ...rows].join('\n');
}

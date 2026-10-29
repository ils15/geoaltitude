/**
 * Núcleo geodésico do GeoAlt — funções puras de conversão de medidas.
 *
 * Tudo aqui é puro (sem DOM, sem fetch) para poder ser testado isoladamente.
 * Referências:
 *  - UTM: série de Krüger de 6ª ordem (Karney, "Transverse Mercator with an
 *    accuracy of a few nanometers", 2011) — erro < 1 mm dentro do fuso.
 *  - Datum: Helmert de 3 parâmetros em coordenadas geocêntricas. Parâmetros
 *    oficiais do IBGE (EPSG:15485) para SAD69(96) → SIRGAS2000.
 *  - Área geodésica: fórmula do excesso esférico (a mesma usada pelo Turf.js).
 */

// ===== Elipsoides e constantes =====

export interface Ellipsoid {
  name: string;
  a: number; // semieixo maior (m)
  f: number; // achatamento
}

export const WGS84: Ellipsoid = { name: 'WGS84', a: 6378137, f: 1 / 298.257223563 };
export const GRS80: Ellipsoid = { name: 'SIRGAS2000 (GRS80)', a: 6378137, f: 1 / 298.257222101 };
export const SOUTH_AMERICAN_1969: Ellipsoid = { name: 'South American 1969', a: 6378160, f: 1 / 298.25 };

export const EARTH_RADIUS_MEAN = 6371008.8; // raio médio IUGG (m)
export const UTM_SCALE_FACTOR = 0.9996;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeLon(lon: number): number {
  return (((lon + 180) % 360) + 360) % 360 - 180;
}

// ===== Graus sexagesimais (GMS) ↔ graus decimais =====

/**
 * Converte graus, minutos e segundos em graus decimais.
 * O sinal vem dos graus; minutos e segundos devem estar em [0, 60).
 */
export function gmsToDec(g: number, m: number, s: number): number {
  if (!Number.isFinite(g) || !Number.isFinite(m) || !Number.isFinite(s)) {
    throw new Error('Graus, minutos e segundos devem ser números válidos.');
  }
  if (m < 0 || m >= 60 || s < 0 || s >= 60) {
    throw new Error('Minutos e segundos devem estar entre 0 e 60 (ex.: 59.999).');
  }
  const sign = g < 0 ? -1 : 1;
  return sign * (Math.abs(g) + m / 60 + s / 3600);
}

/**
 * Decompõe graus decimais em graus/minutos/segundos + hemisfério.
 * Arredonda os segundos para 2 casas e propaga o estouro (59.999" → 1'00").
 */
export function decToDmsParts(
  value: number,
  isLatitude: boolean
): { degrees: number; minutes: number; seconds: number; hemisphere: 'N' | 'S' | 'E' | 'W' } {
  const hemisphere = isLatitude ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const absolute = Math.abs(value);
  let degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 6000) / 100;
  if (seconds >= 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes = 0;
    degrees += 1;
  }
  return { degrees, minutes, seconds, hemisphere };
}

/** Formata graus decimais como GMS (usa decToDmsParts). */
export function decToDms(value: number, isLatitude: boolean): string {
  const { degrees, minutes, seconds, hemisphere } = decToDmsParts(value, isLatitude);
  return `${degrees}° ${String(minutes).padStart(2, '0')}' ${seconds.toFixed(2).padStart(5, '0')}" ${hemisphere}`;
}

/**
 * Interpreta uma coordenada em texto, aceitando graus decimais ou GMS
 * nos formatos mais comuns no Brasil:
 *   "-22.908" | "-22,908" | "-22° 54' 28.9\"" | "22 54 28.9 S" | "22°54'28,9\" O"
 * Hemisphere S/Sul, W/O (Oeste) tornam o valor negativo; um "-" inicial também.
 */
export function parseDmsString(input: string): number {
  let text = input.trim().toUpperCase().replace(/−/g, '-');
  if (!text) throw new Error('Coordenada vazia.');

  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).trim();
  }

  const trailingHemi = text.match(/([NSEWOL])\s*$/);
  const leadingHemi = text.match(/^([NSEWOL])\s*(?=[\d°])/);
  let hemisphere: string | null = null;
  if (trailingHemi) {
    hemisphere = trailingHemi[1];
    text = text.slice(0, trailingHemi.index).trim();
  } else if (leadingHemi) {
    hemisphere = leadingHemi[1];
    text = text.slice(leadingHemi[0].length).trim();
  }
  if (hemisphere === 'S' || hemisphere === 'W' || hemisphere === 'O') negative = true;

  text = text.replace(/,/g, '.').replace(/[º°d]/g, '°').replace(/[′´]/g, "'").replace(/[″]/g, '"');
  const parts = text.split(/[°'"\s]+/).filter(Boolean).map(parseFloat);
  if (parts.length === 0 || parts.length > 3 || parts.some(p => Number.isNaN(p))) {
    throw new Error(`Não foi possível interpretar a coordenada: "${input}"`);
  }

  const [g, m = 0, s = 0] = parts;
  const value = gmsToDec(Math.abs(g), m, s);
  return negative ? -value : value;
}

// ===== UTM (série de Krüger, 6ª ordem) =====

export interface UTMCoordinate {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number; // m
  northing: number; // m
}

/** Fuso UTM (1–60) de uma longitude. -48° pertence ao fuso 23. */
export function lonToUtmZone(lon: number): number {
  return Math.floor((normalizeLon(lon) + 180) / 6) + 1;
}

export function utmZoneCentralMeridian(zone: number): number {
  return zone * 6 - 183;
}

function krugerSeries(n: number): { alpha: number[]; beta: number[] } {
  const n2 = n * n, n3 = n2 * n, n4 = n2 * n2, n5 = n4 * n, n6 = n3 * n3;
  return {
    alpha: [
      n / 2 - (2 / 3) * n2 + (5 / 16) * n3 + (41 / 180) * n4 - (127 / 288) * n5 + (7891 / 37800) * n6,
      (13 / 48) * n2 - (3 / 5) * n3 + (557 / 1440) * n4 + (281 / 630) * n5 - (1983433 / 1935360) * n6,
      (61 / 240) * n3 - (103 / 140) * n4 + (15061 / 26880) * n5 + (167603 / 181440) * n6,
      (49561 / 161280) * n4 - (179 / 168) * n5 + (6601661 / 7257600) * n6,
      (34729 / 80640) * n5 - (3418889 / 1995840) * n6,
      (212378941 / 319334400) * n6,
    ],
    beta: [
      n / 2 - (2 / 3) * n2 + (37 / 96) * n3 - (1 / 360) * n4 - (81 / 512) * n5 + (96199 / 604800) * n6,
      (1 / 48) * n2 + (1 / 15) * n3 - (437 / 1440) * n4 + (46 / 105) * n5 - (1118711 / 3870720) * n6,
      (17 / 480) * n3 - (37 / 840) * n4 - (209 / 4480) * n5 + (5569 / 90720) * n6,
      (4397 / 161280) * n4 - (11 / 504) * n5 - (830251 / 7257600) * n6,
      (4583 / 161280) * n5 - (108847 / 3991680) * n6,
      (20648693 / 638668800) * n6,
    ],
  };
}

function krugerConstant(ellipsoid: Ellipsoid, n: number): number {
  const n2 = n * n, n4 = n2 * n2, n6 = n4 * n2;
  return (ellipsoid.a / (1 + n)) * (1 + n2 / 4 + n4 / 64 + n6 / 256);
}

/** Converte latitude/longitude (graus decimais) em UTM. */
export function geographicToUTM(lat: number, lon: number, ellipsoid: Ellipsoid = WGS84): UTMCoordinate {
  if (Math.abs(lat) >= 90) throw new Error('Latitude deve estar entre -90° e 90°.');
  const zone = lonToUtmZone(lon);
  const hemisphere: 'N' | 'S' = lat < 0 ? 'S' : 'N';

  const f = ellipsoid.f;
  const e = Math.sqrt(f * (2 - f));
  const n = f / (2 - f);
  const A = krugerConstant(ellipsoid, n);
  const { alpha } = krugerSeries(n);

  const φ = toRad(lat);
  const λ = toRad(normalizeLon(lon - utmZoneCentralMeridian(zone)));

  // Latitude isométrica → esfera conforme
  const t = Math.sinh(Math.atanh(Math.sin(φ)) - e * Math.atanh(e * Math.sin(φ)));
  const ξʹ = Math.atan2(t, Math.cos(λ));
  const ηʹ = Math.asinh(Math.sin(λ) / Math.hypot(t, Math.cos(λ)));

  let ξ = ξʹ;
  let η = ηʹ;
  for (let j = 1; j <= 6; j++) {
    const a = alpha[j - 1];
    ξ += a * Math.sin(2 * j * ξʹ) * Math.cosh(2 * j * ηʹ);
    η += a * Math.cos(2 * j * ξʹ) * Math.sinh(2 * j * ηʹ);
  }

  const easting = UTM_SCALE_FACTOR * A * η + 500000;
  const northing = UTM_SCALE_FACTOR * A * ξ + (hemisphere === 'S' ? 10000000 : 0);
  return { zone, hemisphere, easting, northing };
}

/** Converte UTM em latitude/longitude (graus decimais). */
export function utmToGeographic(utm: UTMCoordinate, ellipsoid: Ellipsoid = WGS84): { lat: number; lon: number } {
  if (utm.easting < 100000 || utm.easting > 900000) {
    throw new Error(`Easting fora do intervalo de um fuso UTM (100000–900000 m): ${utm.easting}`);
  }
  if (utm.northing < 0 || utm.northing > 10000000) {
    throw new Error(`Northing fora do intervalo UTM (0–10000000 m): ${utm.northing}`);
  }

  const f = ellipsoid.f;
  const e = Math.sqrt(f * (2 - f));
  const n = f / (2 - f);
  const A = krugerConstant(ellipsoid, n);
  const { beta } = krugerSeries(n);

  const ξ = (utm.northing - (utm.hemisphere === 'S' ? 10000000 : 0)) / (UTM_SCALE_FACTOR * A);
  const η = (utm.easting - 500000) / (UTM_SCALE_FACTOR * A);

  let ξʹ = ξ;
  let ηʹ = η;
  for (let j = 1; j <= 6; j++) {
    const b = beta[j - 1];
    ξʹ -= b * Math.sin(2 * j * ξ) * Math.cosh(2 * j * η);
    ηʹ -= b * Math.cos(2 * j * ξ) * Math.sinh(2 * j * η);
  }

  // Latitudes conforme (χ) e longitude na esfera auxiliar
  const sinχ = Math.sin(ξʹ) / Math.cosh(ηʹ);
  const cosχ = Math.sqrt(Math.cosh(ηʹ) * Math.cosh(ηʹ) - Math.sin(ξʹ) * Math.sin(ξʹ));
  const ψ = Math.atanh(sinχ); // isométrica da esfera conforme
  const lon = toDeg(Math.atan2(Math.sinh(ηʹ), Math.cos(ξʹ)));

  // Inversão da latitude isométrica: sin φ = tanh(ψ + e·atanh(e·sin φ))
  let sinφ = sinχ;
  for (let i = 0; i < 6; i++) {
    sinφ = Math.tanh(ψ + e * Math.atanh(e * sinφ));
  }

  return { lat: toDeg(Math.asin(sinφ)), lon: utmZoneCentralMeridian(utm.zone) + lon };
}

/** Rótulo no formato usado no Brasil: "23S", "22K" etc. (letra = hemisfério). */
export function formatUTM(utm: UTMCoordinate, decimals = 2): string {
  return `${utm.zone}${utm.hemisphere} E ${utm.easting.toFixed(decimals)} N ${utm.northing.toFixed(decimals)}`;
}

// ===== Datums (Helmert de 3 parâmetros) =====

export type DatumId = 'SIRGAS2000' | 'WGS84' | 'SAD69_96' | 'SAD69_CLASSICO';

export interface DatumDefinition {
  id: DatumId;
  label: string;
  ellipsoid: Ellipsoid;
  /** ΔX, ΔY, ΔZ (m) para levar o datum ao SIRGAS2000 (geocêntrico). */
  helmertToSIRGAS2000: [number, number, number];
  note: string;
}

/**
 * Parâmetros oficiais (IBGE / EPSG:15485, acurácia 5 m):
 * SAD69(96) → SIRGAS2000: ΔX=-67.35, ΔY=+3.88, ΔZ=-38.22.
 * WGS84 ≈ SIRGAS2000: coincidem a ~poucos cm — transformação nula.
 */
export const DATUMS: Record<DatumId, DatumDefinition> = {
  SIRGAS2000: {
    id: 'SIRGAS2000',
    label: 'SIRGAS2000',
    ellipsoid: GRS80,
    helmertToSIRGAS2000: [0, 0, 0],
    note: 'Sistema de referência oficial do Brasil (Marco Geodésico Brasileiro).',
  },
  WGS84: {
    id: 'WGS84',
    label: 'WGS84 (GPS)',
    ellipsoid: WGS84,
    helmertToSIRGAS2000: [0, 0, 0],
    note: 'Sistema do GPS. Coincide com o SIRGAS2000 a poucos centímetros — para trabalhos em campo podem ser tratados como equivalentes.',
  },
  SAD69_96: {
    id: 'SAD69_96',
    label: 'SAD69 (96)',
    ellipsoid: SOUTH_AMERICAN_1969,
    helmertToSIRGAS2000: [-67.35, 3.88, -38.22],
    note: 'Realização 1996 do SAD69. Transformação oficial IBGE para SIRGAS2000 (Helmert 3 parâmetros, acurácia ~5 m).',
  },
  SAD69_CLASSICO: {
    id: 'SAD69_CLASSICO',
    label: 'SAD69 (clássico 1969)',
    ellipsoid: SOUTH_AMERICAN_1969,
    helmertToSIRGAS2000: [-57, 1, -41],
    note: 'SAD69 original com os parâmetros clássicos para WGS84 (ΔX=-57, ΔY=+1, ΔZ=-41, registro histórico EPSG; acurácia ~10 m). Útil para resgatar levantamentos antigos.',
  },
};

function geodeticToECEF(ellipsoid: Ellipsoid, lat: number, lon: number, h = 0): { x: number; y: number; z: number } {
  const e2 = ellipsoid.f * (2 - ellipsoid.f);
  const φ = toRad(lat), λ = toRad(lon);
  const N = ellipsoid.a / Math.sqrt(1 - e2 * Math.sin(φ) * Math.sin(φ));
  return {
    x: (N + h) * Math.cos(φ) * Math.cos(λ),
    y: (N + h) * Math.cos(φ) * Math.sin(λ),
    z: (N * (1 - e2) + h) * Math.sin(φ),
  };
}

function ecefToGeodetic(ellipsoid: Ellipsoid, x: number, y: number, z: number): { lat: number; lon: number; h: number } {
  const e2 = ellipsoid.f * (2 - ellipsoid.f);
  const p = Math.hypot(x, y);
  if (p === 0 && z === 0) return { lat: 0, lon: 0, h: 0 };
  const lon = Math.atan2(y, x);
  let lat = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 4; i++) {
    const N = ellipsoid.a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
    const h = p / Math.cos(lat) - N;
    lat = Math.atan2(z, p * (1 - (e2 * N) / (N + h)));
  }
  const N = ellipsoid.a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  const h = p / Math.cos(lat) - N;
  return { lat: toDeg(lat), lon: toDeg(lon), h };
}

/**
 * Transforma coordenadas geodésicas entre datums suportados via Helmert
 * de 3 parâmetros (geocêntrico). WGS84 ↔ SIRGAS2000 é tratado como nulo.
 */
export function transformDatum(lat: number, lon: number, from: DatumId, to: DatumId): { lat: number; lon: number } {  if (!DATUMS[from] || !DATUMS[to]) throw new Error('Datum não suportado.');
  if (from === to) return { lat, lon };

  const source = DATUMS[from];
  const target = DATUMS[to];
  // WGS84 ↔ SIRGAS2000: helmerts nulos dos dois lados — tratados como equivalentes
  if (source.helmertToSIRGAS2000.every(v => v === 0) && target.helmertToSIRGAS2000.every(v => v === 0)) {
    return { lat, lon };
  }
  const ecef = geodeticToECEF(source.ellipsoid, lat, lon);
  const [dx, dy, dz] = source.helmertToSIRGAS2000;
  const [tx, ty, tz] = target.helmertToSIRGAS2000;
  const x = ecef.x + dx - tx;
  const y = ecef.y + dy - ty;
  const z = ecef.z + dz - tz;
  return ecefToGeodetic(target.ellipsoid, x, y, z);
}

/** Coordenadas geodésicas → ECEF (XYZ geocêntrico, metros). */
export function geodeticToEcef(lat: number, lon: number, ellipsoid: Ellipsoid = WGS84, h = 0) {
  return geodeticToECEF(ellipsoid, lat, lon, h);
}

/** ECEF (XYZ geocêntrico, metros) → coordenadas geodésicas. */
export function ecefToGeodeticCoords(x: number, y: number, z: number, ellipsoid: Ellipsoid = WGS84) {
  return ecefToGeodetic(ellipsoid, x, y, z);
}

// ===== Altimetria: h (elipsoidal), N (ondulação geoidal), H (ortométrica) =====

/** Altitude ortométrica H = h − N (h em relação ao elipsoide, N = geóide − elipsoide). */
export function orthometricHeight(h: number, N: number): number {
  return h - N;
}

/** Altitude elipsoidal h = H + N. */
export function ellipsoidalHeight(H: number, N: number): number {
  return H + N;
}

/**
 * Normaliza o campo `fator_conversao` da API do IBGE (pode vir como number,
 * string com ponto ou vírgula decimal, ou inválido). Retorna null se inválido.
 */
export function parseFatorConversao(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

// ===== Unidades de comprimento =====

export type LengthUnit = 'm' | 'km' | 'ft' | 'ftUS' | 'mi';

/** Fatores exatos em metros. ft = 0,3048 exato; ftUS (survey) = 1200/3937 exato. */
export const LENGTH_UNIT_METERS: Record<LengthUnit, number> = {
  m: 1,
  km: 1000,
  ft: 0.3048,
  ftUS: 1200 / 3937,
  mi: 1609.344,
};

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  m: 'metros (m)',
  km: 'quilômetros (km)',
  ft: 'pés internacionais (ft)',
  ftUS: 'pés americ. survey (ftUS)',
  mi: 'milhas (mi)',
};

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  return (value * LENGTH_UNIT_METERS[from]) / LENGTH_UNIT_METERS[to];
}

// ===== Medidas geodésicas =====

export interface LatLon {
  lat: number;
  lon: number;
}

/** Distância de grande círculo (Haversine) em metros. */
export function haversineDistance(a: LatLon, b: LatLon, earthRadius = EARTH_RADIUS_MEAN): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

/** Comprimento total de uma polilinha (m). */
export function polylineLength(points: LatLon[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

/** Área geodésica de um polígono (m²), pelo excesso esférico. O anel é fechado automaticamente. */
export function polygonArea(points: LatLon[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += (toRad(p2.lon) - toRad(p1.lon)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((total * EARTH_RADIUS_MEAN * EARTH_RADIUS_MEAN) / 2);
}

/** Perímetro de um polígono (m). */
export function polygonPerimeter(points: LatLon[]): number {
  if (points.length < 3) return 0;
  return polylineLength([...points, points[0]]);
}

/** Comprimento em metros de 1 grau (× deg) ao longo de um paralelo ou meridiano. */
export function degreesToMeters(deg: number, lat: number, axis: 'lat' | 'lon'): number {
  const e2 = WGS84.f * (2 - WGS84.f);
  const sinφ = Math.sin(toRad(lat));
  const M = (WGS84.a * (1 - e2)) / (1 - e2 * sinφ * sinφ) ** 1.5; // raio meridiano
  const N = WGS84.a / Math.sqrt(1 - e2 * sinφ * sinφ); // raio do primeiro vertical
  const rad = toRad(deg);
  return axis === 'lat' ? M * rad : N * Math.cos(toRad(lat)) * rad;
}

/** Projeção local (plano tangente) com raios de curvatura exatos, em metros. */
export function projectLocalEN(
  points: LatLon[],
  origin: LatLon
): Array<LatLon & { easting: number; northing: number }> {
  const e2 = WGS84.f * (2 - WGS84.f);
  const sinφ0 = Math.sin(toRad(origin.lat));
  const M0 = (WGS84.a * (1 - e2)) / (1 - e2 * sinφ0 * sinφ0) ** 1.5;
  const N0 = WGS84.a / Math.sqrt(1 - e2 * sinφ0 * sinφ0);
  return points.map(p => ({
    ...p,
    easting: toRad(p.lon - origin.lon) * N0 * Math.cos(toRad(origin.lat)),
    northing: toRad(p.lat - origin.lat) * M0,
  }));
}

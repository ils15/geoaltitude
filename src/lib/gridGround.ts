/**
 * Fator k — conversão entre distância plana na grade UTM e distância no
 * terreno, o clássico "fator k" do levantamento topográfico brasileiro:
 *
 *   dist_terreno = dist_grade × k        (com k = k_UTM × k_altitude)
 *
 *  - k_altitude = R / (R + H): reduz do elipsoide ao terreno (geodésico,
 *    usa o raio médio do ponto via fórmula de Clairaut simplificada);
 *  - k_UTM é derivado NUMERICAMENTE do próprio núcleo de projeção
 *    (razão entre distância projetada e distância geodésica de um par de
 *    pontos de teste em torno do ponto dado) — sem reimplementar a série
 *    de escala pontual.
 */
import { geographicToUTM, utmToGeographic, geodesicDistance, UTMCoordinate, EARTH_RADIUS_MEAN } from './geodesy';

export interface GridGroundFactor {
  /** Fator de escala do sistema UTM no ponto (≈ 0.9996 + distorção). */
  kUtm: number;
  /** Fator de altitude R/(R+H). */
  kAltitude: number;
  /** Fator combinado k = kUtm × kAltitude. */
  k: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Fator combinado no ponto (lat, lon) com altitude ortométrica H.
 * O fator UTM é medido numericamente com um par de pontos de teste a ~500 m
 * (escala típica de poligonais topográficas) orientado leste-oeste.
 */
export function gridGroundFactor(lat: number, lon: number, H: number): GridGroundFactor {
  const half = 500; // metros do par de teste (orientado leste-oeste)
  const dLon = half / (111320 * Math.cos(toRad(lat)));

  const utm = geographicToUTM(lat, lon);
  const utmE = geographicToUTM(lat, lon + dLon);
  const projDist = Math.hypot(utmE.easting - utm.easting, utmE.northing - utm.northing);
  const geoDist = geodesicDistance({ lat, lon }, { lat, lon: lon + dLon });

  const kUtm = projDist / geoDist;
  const kAltitude = altitudeFactorWithLat(lat, H);
  return { kUtm, kAltitude, k: kUtm * kAltitude };
}

/** Fator de altitude com raio de curvatura médio real na latitude. */
export function altitudeFactorWithLat(lat: number, H: number): number {
  const a = 6378137;
  const e2 = 0.00669437999014; // WGS84
  const sinφ2 = Math.sin(toRad(lat)) ** 2;
  // Raio médio R = sqrt(M·N)
  const M = (a * (1 - e2)) / (1 - e2 * sinφ2) ** 1.5;
  const N = a / Math.sqrt(1 - e2 * sinφ2);
  const R = Math.sqrt(M * N);
  return R / (R + H);
}

/** Converte uma distância plana (grade UTM) para distância no terreno. */
export function gridToGround(distGrid: number, factor: GridGroundFactor): number {
  return distGrid * factor.k;
}

/** Converte uma distância no terreno para distância plana (grade UTM). */
export function groundToGrid(distGround: number, factor: GridGroundFactor): number {
  return distGround / factor.k;
}

/**
 * Converte coordenadas UTM → geográficas (para apoiar fluxos que começam
 * na planimetria da planta).
 */
export function utmToLatLon(utm: UTMCoordinate): { lat: number; lon: number } {
  return utmToGeographic(utm);
}

export { EARTH_RADIUS_MEAN };

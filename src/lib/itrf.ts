/**
 * Transformação ITRF2000 ↔ ITRF2014 com época (Helmert de 14 parâmetros).
 *
 * Parâmetros oficiais do ITRF/proj.db ("ITRF2000 to ITRF2014 (1)", EPSG,
 * época de referência t0 = 2010.0):
 *   T  = (−0.7, −1.2, +26.1) mm          Ṫ  = (−0.1, −0.1, +1.9) mm/ano
 *   R  = (0, 0, 0) mas                   Ṙ  = (0, 0, 0) mas/ano
 *   DS = −2.12 ppb                       ḊS = −0.11 ppb/ano
 *
 * SIRGAS2000/WGS84 são tratados como ITRF2000 (coincidem a poucos cm) —
 * paradados GNSS de campanha devem informar a época de observação.
 * Convenção: position vector (a mesma do PROJ/helmert).
 */
import { geodeticToEcef, ecefToGeodeticCoords, GRS80 } from './geodesy';

const MAS_TO_RAD = Math.PI / (180 * 3600 * 1000);
const PPB = 1e-9;

const T0: [number, number, number] = [-0.7, -1.2, 26.1]; // mm
const T_RATE: [number, number, number] = [-0.1, -0.1, 1.9]; // mm/ano
const R0: [number, number, number] = [0, 0, 0]; // mas
const R_RATE: [number, number, number] = [0, 0, 0]; // mas/ano
const DS0 = -2.12; // ppb
const DS_RATE = -0.11; // ppb/ano
const EPOCH_REF = 2010.0;

/**
 * ITRF2000 → ITRF2014 na época informada. `inverse = true` faz a volta.
 * Retorna lat/lon em graus (elipsoide GRS80/WGS84 — diferem só no achatamento,
 * efeito < 1 cm aqui).
 */
export function transformItrf2000To2014(lat: number, lon: number, epoch: number, inverse = false): { lat: number; lon: number } {
  const dt = epoch - EPOCH_REF;

  const T: [number, number, number] = [
    (T0[0] + T_RATE[0] * dt) / 1000,
    (T0[1] + T_RATE[1] * dt) / 1000,
    (T0[2] + T_RATE[2] * dt) / 1000,
  ]; // m
  const R: [number, number, number] = [
    (R0[0] + R_RATE[0] * dt) * MAS_TO_RAD,
    (R0[1] + R_RATE[1] * dt) * MAS_TO_RAD,
    (R0[2] + R_RATE[2] * dt) * MAS_TO_RAD,
  ]; // rad
  const scale = 1 + (DS0 + DS_RATE * dt) * PPB;

  const ecef = geodeticToEcef(lat, lon, GRS80);
  let { x, y, z } = ecef;

  const apply = (sx: number, sy: number, sz: number, k: number, Rx: number, Ry: number, Rz: number, Tx: number, Ty: number, Tz: number) => {
    // position vector: [x'] = [T] + k·[[1,−Rz,Ry],[Rz,1,−Rx],[−Ry,Rx,1]]·[x]
    const xr = sx * (1 * x - Rz * y + Ry * z);
    const yr = sy * (Rz * x + 1 * y - Rx * z);
    const zr = sz * (-Ry * x + Rx * y + 1 * z);
    return { x: xr + Tx, y: yr + Ty, z: zr + Tz };
  };

  if (!inverse) {
    ({ x, y, z } = apply(1, 1, 1, scale, R[0], R[1], R[2], T[0], T[1], T[2]));
  } else {
    // inversa exata: x = R⁻¹·(x' − T)/k com R⁻¹ = transposta
    const k = scale;
    const xt = x - T[0];
    const yt = y - T[1];
    const zt = z - T[2];
    const [Rx, Ry, Rz] = R;
    x = (1 * xt + Rz * yt - Ry * zt) / k;
    y = (-Rz * xt + 1 * yt + Rx * zt) / k;
    z = (Ry * xt - Rx * yt + 1 * zt) / k;
  }

  const geo = ecefToGeodeticCoords(x, y, z, GRS80);
  return { lat: geo.lat, lon: geo.lon };
}

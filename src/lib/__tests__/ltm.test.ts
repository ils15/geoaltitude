import { describe, it, expect } from 'vitest';
import { geographicToLTM, ltmToGeographic, ltmParams } from '../geodesy';

/**
 * Vetores gerados com pyproj: +proj=tmerc +lon_0=-46 +k=1 +x_0=50000
 * +y_0=10000000 +ellps=GRS80 (LTM típica paulista).
 */
const LTM = ltmParams(-46, 'S');

describe('LTM — Transversa Local (fuso sob medida)', () => {
  it.each([
    ['SP (perto do MC)', -23.5505, -46.6333, -14662.1445, 7394352.9236],
    ['Brasília (a ~1.9° do MC)', -15.7939, -47.8828, -151760.7633, 8252260.7908],
    ['leste do MC', -22.9068, -45.5, 101296.8506, 7465696.5809],
  ])('%s → E/N bate com PROJ', (_nome, lat, lon, E, N) => {
    const r = geographicToLTM(lat, lon, LTM);
    expect(r.easting).toBeCloseTo(E, 1);
    expect(r.northing).toBeCloseTo(N, 1);
  });

  it('inversa: LTM → geográfica a < 1 mm', () => {
    const geo = ltmToGeographic(-14662.1445, 7394352.9236, LTM);
    expect(geo.lat).toBeCloseTo(-23.5505, 8);
    expect(geo.lon).toBeCloseTo(-46.6333, 8);
  });

  it('round-trip numa grade ampla ao redor do MC', () => {
    for (let lat = -26; lat <= -18; lat += 2) {
      for (let lon = -48.5; lon <= -43.5; lon += 1) {
        const r = geographicToLTM(lat, lon, LTM);
        const geo = ltmToGeographic(r.easting, r.northing, LTM);
        expect(geo.lat).toBeCloseTo(lat, 8);
        expect(geo.lon).toBeCloseTo(lon, 8);
      }
    }
  });
});

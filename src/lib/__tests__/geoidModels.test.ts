import { describe, it, expect } from 'vitest';
import { meanSeaLevel } from 'egm96-universal';

/**
 * Âncoras independentes obtidas do GeoidEval (GeographicLib, EGM96 grade 5′
 * bicúbica). O pacote usa a grade 15′ bilinear da NGA — concordância observada
 * nos testes: ≤ 7 cm. Tolerância de 15 cm cobre a diferença de resolução.
 */
describe('EGM96 (dados locais NGA via egm96-universal)', () => {
  it.each([
    ['equador/meridiano de Greenwich', 0, 0, 17.163],
    ['Belém (PA)', -1.4558, -48.4902, -23.9628],
    ['São Paulo (SP)', -23.5505, -46.6333, -2.235],
  ])('%s: N ≈ referência independente', (_nome, lat, lon, ref) => {
    const value = meanSeaLevel(lat, lon);
    expect(Math.abs(value - ref)).toBeLessThan(0.15);
  });

  it('N do EGM96 difere do hgeoHNOR em São Paulo (modelos são distintos)', () => {
    // hgeoHNOR/IBGE em SP: −3,16 m; EGM96: ≈ −2,31 m — não são o mesmo modelo
    expect(meanSeaLevel(-23.5505, -46.6333)).toBeGreaterThan(-2.6);
    expect(meanSeaLevel(-23.5505, -46.6333)).toBeLessThan(-2.0);
  });
});

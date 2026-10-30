import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createEgm2008Model } from '../egm2008';

/**
 * Âncoras do GeoidEval (GeographicLib, EGM2008 5′ oficial). O arquivo servido
 * pelo app é a grade 10′ reamostrada com bilinear — tolerância 0,3 m cobre a
 * diferença de resolução.
 */
const PATH = 'public/geoid/egm2008-10.bin';

describe('EGM2008 (grade local reamostrada da oficial NGA 5′)', () => {
  const model = createEgm2008Model(readFileSync(PATH).buffer);

  it.each([
    ['equador/meridiano de Greenwich', 0, 0, 17.226],
    ['São Paulo (SP)', -23.5505, -46.6333, -3.2549],
    ['Belém (PA)', -1.4558, -48.4902, -25.1782],
  ])('%s: N ≈ referência independente (±0,3 m)', (_nome, lat, lon, ref) => {
    const value = model.undulation(lat, lon);
    expect(Math.abs(value - ref)).toBeLessThan(0.3);
  });

  it('rejeita grade com cabeçalho errado', () => {
    const bad = new ArrayBuffer(64);
    expect(() => createEgm2008Model(bad)).toThrow(/cabeçalho/);
  });

  it('rejeita latitude fora do intervalo', () => {
    expect(() => model.undulation(91, 0)).toThrow(/Latitude/);
  });

  it('continuidade: pontos vizinhos diferem pouco (sem salto de emenda 360°/0°)', () => {
    const a = model.undulation(10, 359.99);
    const b = model.undulation(10, 0.01);
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });
});

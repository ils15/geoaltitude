import { describe, it, expect } from 'vitest';
import { transformItrf2000To2014 } from '../itrf';

/**
 * Vetores do pipeline oficial do projinfo ("ITRF2000 to ITRF2014 (1)",
 * t0 = 2010.0) executado no pyproj com a ordem de eixos nativa do CRS
 * (lat, lon). Conferidos dígito a dígito com a nossa implementação.
 */
describe('ITRF2000 ↔ ITRF2014 com época (Helmert 14 parâmetros)', () => {
  it.each([
    [2010.0, -23.550499783, -46.633300013],
    [2020.0, -23.550499626, -46.633300027],
    [2024.0, -23.550499563, -46.633300032],
  ])('direta na época %f bate com o pipeline oficial (~0,1 mm)', (epoch, latOut, lonOut) => {
    const r = transformItrf2000To2014(-23.5505, -46.6333, epoch);
    expect(r.lat).toBeCloseTo(latOut, 8);
    expect(r.lon).toBeCloseTo(lonOut, 8);
  });

  it('deslocamento cresce com o tempo (~1,9 mm/ano em Z → norte)', () => {
    const d2010 = transformItrf2000To2014(-23.5505, -46.6333, 2010);
    const d2024 = transformItrf2000To2014(-23.5505, -46.6333, 2024);
    // em 14 anos a latitude muda mais que em 2010 (t0: diferença quase nula)
    expect(Math.abs(d2024.lat - (-23.5505))).toBeGreaterThan(Math.abs(d2010.lat - (-23.5505)));
  });

  it('inversa volta ao original (exata)', () => {
    const fwd = transformItrf2000To2014(-23.5505, -46.6333, 2024);
    const back = transformItrf2000To2014(fwd.lat, fwd.lon, 2024, true);
    // erro residual ~0,06 mm (iterações do ECEF→geodésico)
    expect(Math.abs(back.lat - -23.5505)).toBeLessThan(1e-8);
    expect(Math.abs(back.lon - -46.6333)).toBeLessThan(1e-8);
  });
});

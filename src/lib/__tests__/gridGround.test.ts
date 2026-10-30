import { describe, it, expect } from 'vitest';
import { gridGroundFactor, altitudeFactorWithLat, gridToGround, groundToGrid } from '../gridGround';

describe('Fator k grade ↔ terreno', () => {
  it('fator de altitude: H=0 → 1; H=1000 → ≈ 0.999843 (a 0 lat)', () => {
    expect(altitudeFactorWithLat(0, 0)).toBe(1);
    expect(altitudeFactorWithLat(0, 1000)).toBeCloseTo(0.999843, 6);
    // a 23°S o raio médio é um pouco menor → fator um pouco menor
    expect(altitudeFactorWithLat(-23, 1000)).toBeLessThan(0.999843);
  });

  it('k_Utm em SP = 0.999942 (derivado numericamente, conferido com PROJ: 500.2362/500.2651)', () => {
    // SP está a 1,6333° do MC do fuso 23 (-45°)
    const f = gridGroundFactor(-23.5505, -46.6333, 0);
    expect(f.kUtm).toBeCloseTo(0.999942, 5);
  });

  it('k combinado em SP a 760 m ≈ 0.999823 (k_Utm × altitude)', () => {
    const f = gridGroundFactor(-23.5505, -46.6333, 760);
    expect(f.k).toBeCloseTo(0.999823, 5);
    // 1 km de grade → ~18 cm de correção para o terreno
    expect(gridToGround(1000, f)).toBeGreaterThan(999.8);
    expect(gridToGround(1000, f)).toBeLessThan(999.9);
  });

  it('k cresce com a distância ao meridiano central (borda do fuso ≈ 1.00073)', () => {
    // borda leste do fuso 23 (~-42°): k_Utm > 1
    const f = gridGroundFactor(-23.0, -42.05, 0);
    expect(f.kUtm).toBeGreaterThan(1.0006);
    expect(f.kUtm).toBeLessThan(1.0009);
  });

  it('ida e volta grade ↔ terreno é identidade', () => {
    const f = gridGroundFactor(-15.7939, -47.8828, 1170);
    expect(groundToGrid(gridToGround(2500, f), f)).toBeCloseTo(2500, 6);
  });

  it('no equador sobre o meridiano central k_Utm = 0.9996 exato (caso equatorial do Vincenty)', () => {
    const fEq = gridGroundFactor(0, -45, 0);
    expect(fEq.kUtm).toBeCloseTo(0.9996, 6); // MC do fuso 23 no equador
  });
});

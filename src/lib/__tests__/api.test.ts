import { describe, it, expect } from 'vitest';
import { summarizeHgeoResult } from '../api';
import type { HgeoResult } from '../api';

/**
 * Fixtures copiadas de respostas reais da API hgeoHNOR do IBGE
 * (GET /v1/hgeohnor/pontos, capturadas em 2026-10).
 */
describe('summarizeHgeoResult — contrato real da API hgeoHNOR (IBGE)', () => {
  it('ponto na grade: N, incerteza e modelo numéricos', () => {
    const res: HgeoResult = {
      fator_conversao: -3.16,
      incerteza: 0.07,
      lat: '-23.5505',
      long: '-46.6333',
      modelo: 'hgeoHNOR_IMBITUBA',
    };
    const s = summarizeHgeoResult(res);
    expect(s.N).toBe(-3.16);
    expect(s.incerteza).toBe(0.07);
    expect(s.modelo).toBe('hgeoHNOR_IMBITUBA');
    expect(s.foraDaGrade).toBe(false);
  });

  it('ponto fora da grade: fator_conversao/incerteza/modelo = "fora_grid"', () => {
    const res = {
      fator_conversao: 'fora_grid',
      incerteza: 'fora_grid',
      lat: '50',
      long: '10',
      modelo: 'fora_grid',
    } as unknown as HgeoResult;
    const s = summarizeHgeoResult(res);
    expect(s.N).toBeNull();
    expect(s.incerteza).toBeNull();
    expect(s.foraDaGrade).toBe(true);
  });

  it('valores numéricos como string (com vírgula decimal)', () => {
    const res = {
      fator_conversao: '-3,16',
      incerteza: '0,07',
      lat: '-23.5505',
      long: '-46.6333',
      modelo: 'hgeoHNOR_IMBITUBA',
    } as unknown as HgeoResult;
    const s = summarizeHgeoResult(res);
    expect(s.N).toBeCloseTo(-3.16, 9);
    expect(s.incerteza).toBeCloseTo(0.07, 9);
    expect(s.foraDaGrade).toBe(false);
  });

  it('campos ausentes não quebram', () => {
    const s = summarizeHgeoResult({} as unknown as HgeoResult);
    expect(s.N).toBeNull();
    expect(s.modelo).toBe('');
    expect(s.foraDaGrade).toBe(true);
  });
});

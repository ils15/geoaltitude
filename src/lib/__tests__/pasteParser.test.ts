import { describe, it, expect } from 'vitest';
import { parsePastedCoordinates, pasteRowsToDataRows } from '../pasteParser';

describe('parsePastedCoordinates (modo colar)', () => {
  it('decimais com ponto e vírgula decimal misturados', () => {
    const r = parsePastedCoordinates('-23.5505,-46.6333,760\n-22,9068;-43,1729;5');
    expect(r.valid).toBe(2);
    expect(r.invalid).toBe(0);
    expect(r.rows[0].lat).toBeCloseTo(-23.5505, 6);
    expect(r.rows[0].h).toBe(760);
    expect(r.rows[1].lat).toBeCloseTo(-22.9068, 6);
    expect(r.rows[1].lon).toBeCloseTo(-43.1729, 6);
    expect(r.rows[1].h).toBe(5);
  });

  it('colado do Excel com tabulação e cabeçalho inválido', () => {
    const r = parsePastedCoordinates('lat\tlon\th\n-15.7939\t-47.8828\t1170');
    expect(r.valid).toBe(1);
    expect(r.invalid).toBe(1); // cabeçalho
    expect(r.rows[0].lat).toBeNull();
    expect(r.rows[1].lat).toBeCloseTo(-15.7939, 6);
  });

  it('GMS com hemisfério e vírgula nos segundos', () => {
    const r = parsePastedCoordinates(`22°54'28,9"S;43°10'22,4"W;-1\n23 33 1.8 S, 46 37 59.9 W`);
    expect(r.valid).toBe(2);
    expect(r.rows[0].lat).toBeCloseTo(-22.90803, 5);
    expect(r.rows[0].lon).toBeCloseTo(-43.17289, 5);
    expect(r.rows[1].lat).toBeCloseTo(-23.5505, 5);
  });

  it('linhas vazias e separadores soltos são ignorados', () => {
    const r = parsePastedCoordinates('\n\n-23.5, -46.6\n---\n \n');
    expect(r.rows).toHaveLength(1);
    expect(r.valid).toBe(1);
  });

  it('linha com apenas uma coluna é inválida, não quebra', () => {
    const r = parsePastedCoordinates('-23.5505');
    expect(r.valid).toBe(0);
    expect(r.invalid).toBe(1);
  });

  it('texto lixo não vira coordenada', () => {
    const r = parsePastedCoordinates('banana, prata\n-23.5505, -46.6333');
    expect(r.valid).toBe(1);
    expect(r.rows[0].lat).toBeNull();
  });

  it('pasteRowsToDataRows só exporta válidas no formato do lote', () => {
    const parsed = parsePastedCoordinates('-23.5505,-46.6333,760\nlixo');
    const rows = pasteRowsToDataRows(parsed.rows);
    expect(rows).toHaveLength(1);
    expect(rows[0].latitude).toBe('-23.5505');
    expect(rows[0].altitude_elipsoidal).toBe('760');
    expect(rows[0].descricao).toBe('Colado 1');
  });
});

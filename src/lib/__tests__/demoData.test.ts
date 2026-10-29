import { describe, it, expect } from 'vitest';
import { DEMO_POINTS, DEMO_ROWS, demoCsv } from '../demoData';
import { isValidCoordinate } from '../validation';
import Papa from 'papaparse';

/**
 * Guarda de regressão do fluxo "Usar dados de exemplo": as linhas têm que
 * passar exatamente pelos mesmos passos do upload de arquivo (parse das
 * colunas mapeadas, validação de bbox do Brasil e h numérico).
 */
describe('Dados de demonstração (botão "Usar dados de exemplo")', () => {
  it('todas as linhas são coordenadas válidas no Brasil com h numérico', () => {
    expect(DEMO_ROWS.length).toBe(DEMO_POINTS.length);
    for (const row of DEMO_ROWS) {
      const lat = parseFloat(row.latitude);
      const lon = parseFloat(row.longitude);
      expect(Number.isNaN(lat), `latitude de "${row.descricao}"`).toBe(false);
      expect(Number.isNaN(lon), `longitude de "${row.descricao}"`).toBe(false);
      expect(isValidCoordinate(lat, lon), `bbox para "${row.descricao}"`).toBe(true);
      expect(Number.isNaN(parseFloat(row.altitude_elipsoidal)), `h de "${row.descricao}"`).toBe(false);
    }
  });

  it('CSV gerado é parseável e preserva as 13 linhas', () => {
    const parsed = Papa.parse(demoCsv(), { header: true, skipEmptyLines: true });
    expect(parsed.data).toHaveLength(DEMO_POINTS.length);
    const first = parsed.data[0] as Record<string, string>;
    expect(first.latitude).toBe(String(DEMO_POINTS[0].latitude));
    expect(first.descricao).toBe(DEMO_POINTS[0].descricao);
  });

  it('cobre os extremos pedagógicos: h negativo no litoral e Pico da Neblina', () => {
    const altitudes = DEMO_POINTS.map(p => p.altitude_elipsoidal);
    expect(Math.min(...altitudes)).toBeLessThan(0);
    expect(Math.max(...altitudes)).toBeGreaterThan(2900);
  });
});

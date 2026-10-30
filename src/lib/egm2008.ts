/**
 * Grade geoidal global EGM2008 (NGA) em formato próprio compacto (.bin):
 *   magic "GE1A" · uint32 LE largura · uint32 LE altura · int16 LE unidade (cm)
 *   seguido de int16 LE altura (cm), linha 0 = 90°N … última = 90°S,
 *   coluna 0 = 0° … última = 360° (repete o primeiro meridiano).
 * Grade 10′ reamostrada da oficial 5′ (egm2008-5.pgm do NGA) na conversão —
 * acurácia interpolada típica ≤ 0,2 m em áreas suaves.
 */
export interface Egm2008Model {
  undulation(lat: number, lon: number): number;
}

export function createEgm2008Model(buffer: ArrayBuffer): Egm2008Model {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'GE1A') throw new Error('Grade EGM2008 inválida (cabeçalho).');
  const w = view.getUint32(4, true);
  const h = view.getUint32(8, true);
  const unitMeters = view.getInt16(12, true) / 100;
  const dataOffset = 14;

  const cmAt = (row: number, col: number): number =>
    view.getInt16(dataOffset + (row * w + col) * 2, true);

  return {
    undulation(lat: number, lon: number): number {
      if (Math.abs(lat) > 90) throw new Error('Latitude deve estar entre -90° e 90°.');
      // coordenadas contínuas na grade
      const y = ((90 - lat) / 180) * (h - 1);
      const lonNorm = (((lon % 360) + 360) % 360);
      const x = (lonNorm / 360) * (w - 1);

      const y0 = Math.min(Math.floor(y), h - 2);
      const x0 = Math.min(Math.floor(x), w - 2);
      const fy = y - y0;
      const fx = x - x0;

      const c00 = cmAt(y0, x0);
      const c10 = cmAt(y0, x0 + 1);
      const c01 = cmAt(y0 + 1, x0);
      const c11 = cmAt(y0 + 1, x0 + 1);

      const cm =
        c00 * (1 - fx) * (1 - fy) +
        c10 * fx * (1 - fy) +
        c01 * (1 - fx) * fy +
        c11 * fx * fy;
      return cm * unitMeters;
    },
  };
}

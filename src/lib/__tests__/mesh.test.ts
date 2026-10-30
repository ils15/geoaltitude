import { describe, it, expect } from 'vitest';
import { triangulate } from '../mesh';

const edgeLengths = (points: ReadonlyArray<readonly [number, number]>, triangles: number[]) => {
  const lengths: number[] = [];
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [triangles[t], triangles[t + 1], triangles[t + 2]];
    lengths.push(
      Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1]),
      Math.hypot(points[b][0] - points[c][0], points[b][1] - points[c][1]),
      Math.hypot(points[c][0] - points[a][0], points[c][1] - points[a][1])
    );
  }
  return lengths;
};

describe('triangulate (Delaunay + filtro de pontes)', () => {
  it('quadrado unitário → 2 triângulos, nenhum descartado', () => {
    const r = triangulate([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    expect(r.triangles).toHaveLength(6); // 2 triângulos × 3 índices
    expect(r.droppedTriangles).toBe(0);
    expect(
      Math.max(
        ...edgeLengths(
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ] as const,
          r.triangles
        )
      )
    ).toBeCloseTo(Math.SQRT2, 6);
  });

  it('grade 3×3 → 8 triângulos completos', () => {
    const pts: Array<readonly [number, number]> = [];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) pts.push([x * 10, y * 10]);
    const r = triangulate(pts);
    expect(r.triangles).toHaveLength(24);
    expect(r.droppedTriangles).toBe(0);
  });

  it('pontos colineares → nenhum triângulo (degenerado)', () => {
    const r = triangulate([
      [0, 0],
      [1, 0],
      [2, 0],
    ] as const);
    expect(r.triangles).toHaveLength(0);
  });

  it('dois aglomerados distantes: nenhuma aresta-ponte sobrevive ao filtro', () => {
    const pts: Array<readonly [number, number]> = [];
    // aglomerados 2×2 (não colineares) separados por ~140 km
    for (const [dx, dy] of [
      [0, 0],
      [10, 0],
      [0, 10],
      [10, 10],
    ] as const)
      pts.push([dx, dy]);
    for (const [dx, dy] of [
      [0, 0],
      [10, 0],
      [0, 10],
      [10, 10],
    ] as const)
      pts.push([100000 + dx, 100000 + dy]);
    const r = triangulate(pts);
    expect(r.triangles.length).toBeGreaterThan(0);
    expect(r.droppedTriangles).toBeGreaterThan(0);
    // todas as arestas remanescentes são locais (nenhuma atravessa os 140 km)
    const maxEdge = Math.max(...edgeLengths(pts, r.triangles));
    expect(maxEdge).toBeLessThan(100);
  });

  it('menos de 3 pontos → vazio', () => {
    expect(triangulate([]).triangles).toHaveLength(0);
    expect(triangulate([[0, 0]] as const).triangles).toHaveLength(0);
  });
});

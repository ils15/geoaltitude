/**
 * Triangulação de Delaunay (delaunator) com filtragem de triângulos-ponte:
 * triângulos cujas arestas são muito maiores que a mediana são descartados,
 * para não "amarrar" aglomerados distantes numa superfície sem sentido.
 */
import Delaunator from 'delaunator';

export interface MeshResult {
  /** Índices dos vértices por triângulo, achatado: [i0, j0, k0, i1, j1, k1, ...] */
  triangles: number[];
  /** Triângulos descartados por aresta acima do limite (pontes). */
  droppedTriangles: number;
}

export function triangulate(
  points: ReadonlyArray<readonly [number, number]>,
  bridgeFactor = 3
): MeshResult {
  if (points.length < 3) return { triangles: [], droppedTriangles: 0 };

  const del = Delaunator.from(points as unknown as number[][]);
  const raw = Array.from(del.triangles);

  const dist = (i: number, j: number) =>
    Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);

  // Limite baseado na distância mediana ao vizinho mais próximo: é a escala
  // local real dos dados. A mediana global das arestas falha quando a
  // distribuição é bimodal (ex.: dois aglomerados distantes → a mediana vira
  // uma aresta-ponte e nada seria filtrado).
  const nn: number[] = points.map((_, i) => {
    let best = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (j !== i) best = Math.min(best, dist(i, j));
    }
    return best;
  });
  nn.sort((a, b) => a - b);
  const nnMedian = nn[Math.floor(nn.length / 2)] || 1;
  const limit = nnMedian * bridgeFactor;

  const triangles: number[] = [];
  let droppedTriangles = 0;
  for (let t = 0; t < raw.length; t += 3) {
    const a = raw[t];
    const b = raw[t + 1];
    const c = raw[t + 2];
    if (dist(a, b) <= limit && dist(b, c) <= limit && dist(c, a) <= limit) {
      triangles.push(a, b, c);
    } else {
      droppedTriangles++;
    }
  }
  return { triangles, droppedTriangles };
}

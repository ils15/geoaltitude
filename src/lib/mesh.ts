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
  bridgeFactor = 2.2
): MeshResult {
  if (points.length < 3) return { triangles: [], droppedTriangles: 0 };

  const del = Delaunator.from(points as unknown as number[][]);
  const raw = Array.from(del.triangles);

  const dist = (i: number, j: number) =>
    Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);

  const edges: number[] = [];
  for (let t = 0; t < raw.length; t += 3) {
    edges.push(dist(raw[t], raw[t + 1]), dist(raw[t + 1], raw[t + 2]), dist(raw[t + 2], raw[t]));
  }
  edges.sort((a, b) => a - b);
  const median = edges[Math.floor(edges.length / 2)] || 1;
  const limit = median * bridgeFactor;

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

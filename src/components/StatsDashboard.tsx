import React, { useState } from 'react';
import { HgeoResult } from '../lib/api';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Plot from 'react-plotly.js';
import type { Config, Data, Layout } from 'plotly.js';
import { TrendingUp, ArrowUp, ArrowDown, Activity, Box, Map as MapIcon } from 'lucide-react';

export function StatsDashboard({ results }: { results: HgeoResult[] }) {
  const [viewMode, setViewMode] = useState<'plan' | 'vertical'>('vertical');

  if (results.length < 2) return null;

  const validH = results.filter(r => r.H !== undefined).map(r => r.H as number);
  const avgH = validH.length > 0 ? validH.reduce((a, b) => a + b, 0) / validH.length : 0;
  const maxH = validH.length > 0 ? Math.max(...validH) : 0;
  const minH = validH.length > 0 ? Math.min(...validH) : 0;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const normalizedData = results.map((r, idx) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.long);
    const h = r.h;
    const H = r.H;
    const N = typeof r.fator_conversao === 'string' ? parseFloat(r.fator_conversao) : r.fator_conversao;

    return {
      index: idx + 1,
      lat,
      lon,
      h,
      H,
      N,
      name: `Ponto ${idx + 1}`,
      colorAltitude: H ?? h ?? 0,
    };
  });

  let cumulativeKm = 0;
  const profileData = normalizedData.map((point, index, all) => {
    if (index === 0) {
      return { ...point, distanceKm: 0, segmentKm: 0 };
    }

    const prev = all[index - 1];
    const segmentKm = haversineKm(prev.lat, prev.lon, point.lat, point.lon);
    cumulativeKm += segmentKm;
    return { ...point, distanceKm: cumulativeKm, segmentKm };
  });

  const points3D = normalizedData.map(point => ({
    lon: point.lon,
    lat: point.lat,
    z: point.colorAltitude,
    ...point,
  }));

  const altitudes = points3D.map(point => point.z);
  const minAltitude = altitudes.length > 0 ? Math.min(...altitudes) : 0;
  const maxAltitude = altitudes.length > 0 ? Math.max(...altitudes) : 1;

  const meanLat = points3D.reduce((acc, point) => acc + point.lat, 0) / points3D.length;
  const meanLon = points3D.reduce((acc, point) => acc + point.lon, 0) / points3D.length;
  const meanLatRad = toRad(meanLat);

  // Local tangent-plane projection in meters for bounded cartographic surface rendering.
  const pointsMeters = points3D.map(point => {
    const eastMeters = (point.lon - meanLon) * 111320 * Math.cos(meanLatRad);
    const northMeters = (point.lat - meanLat) * 110540;

    return {
      ...point,
      xMeters: eastMeters,
      yMeters: northMeters,
    };
  });

  const xValues = pointsMeters.map(point => point.xMeters);
  const yValues = pointsMeters.map(point => point.yMeters);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xPadding = Math.max((maxX - minX) * 0.08, 20);
  const yPadding = Math.max((maxY - minY) * 0.08, 20);
  const boundedMinX = minX - xPadding;
  const boundedMaxX = maxX + xPadding;
  const boundedMinY = minY - yPadding;
  const boundedMaxY = maxY + yPadding;

  const gridSize = pointsMeters.length > 150 ? 28 : 34;
  const xGrid = Array.from({ length: gridSize }, (_, i) => boundedMinX + ((boundedMaxX - boundedMinX) * i) / (gridSize - 1));
  const yGrid = Array.from({ length: gridSize }, (_, i) => boundedMinY + ((boundedMaxY - boundedMinY) * i) / (gridSize - 1));

// Delaunay triangulation for continuous mesh surface
  const generateMesh3D = () => {
    if (pointsMeters.length < 3) {
      return { vertices: [], triangles: [], empty: true };
    }

    // Simple Delaunay-like algorithm: use convex hull + internal triangulation
    const vertices = pointsMeters.map((p, idx) => ({
      x: p.xMeters,
      y: p.yMeters,
      z: p.z,
      idx,
    }));

    // For 2D Delaunay, sort by x then y
    const sorted = [...vertices].sort((a, b) => a.x - b.x || a.y - b.y);

    // Simple approach: connect each point to 3-4 nearest neighbors
    const triangles: number[] = [];
    const edgeSet = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const distances = sorted
        .map((v, idx) => ({ ...v, dist: Math.hypot(v.x - current.x, v.y - current.y) }))
        .filter(v => v.dist > 0.1)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 4);

      for (let j = 0; j < distances.length; j++) {
        for (let k = j + 1; k < distances.length; k++) {
          const p0 = current.idx;
          const p1 = distances[j].idx;
          const p2 = distances[k].idx;

          const edge1 = `${Math.min(p0, p1)}-${Math.max(p0, p1)}`;
          const edge2 = `${Math.min(p1, p2)}-${Math.max(p1, p2)}`;
          const edge3 = `${Math.min(p2, p0)}-${Math.max(p2, p0)}`;

          if (!edgeSet.has(edge1) || !edgeSet.has(edge2) || !edgeSet.has(edge3)) {
            if (triangles.length < sorted.length * 6) {
              triangles.push(p0, p1, p2);
              edgeSet.add(edge1);
              edgeSet.add(edge2);
              edgeSet.add(edge3);
            }
          }
        }
      }
    }

    return { vertices, triangles, empty: false };
  };

  const mesh = generateMesh3D();

  const meshTrace: Data = mesh.empty ? {
    type: 'scatter3d',
    mode: 'markers',
    x: [],
    y: [],
    z: [],
    name: 'Superfície',
  } : {
    type: 'mesh3d',
    x: mesh.vertices.map(v => v.x),
    y: mesh.vertices.map(v => v.y),
    z: mesh.vertices.map(v => v.z),
    i: new Float32Array(mesh.triangles.filter((_, idx) => idx % 3 === 0)),
    j: new Float32Array(mesh.triangles.filter((_, idx) => idx % 3 === 1)),
    k: new Float32Array(mesh.triangles.filter((_, idx) => idx % 3 === 2)),
    opacity: 0.72,
    color: mesh.vertices.map(v => v.z),
    colorscale: [
      [0, '#1e3a8a'],
      [0.33, '#059669'],
      [0.66, '#f59e0b'],
      [1, '#dc2626'],
    ],
    showscale: true,
    colorbar: {
      title: { text: 'Altitude (m)', side: 'right' },
    },
    flatshading: false,
    name: 'Superfície 3D (Mesh)',
    hovertemplate: 'X: %{x:.1f} m<br>Y: %{y:.1f} m<br>H: %{z:.1f} m<extra></extra>',
  } as Data;

  const controlPointsTrace: Data = {
    type: 'scatter3d',
    mode: 'markers',
    x: pointsMeters.map(point => point.xMeters),
    y: pointsMeters.map(point => point.yMeters),
    z: pointsMeters.map(point => point.z),
    text: pointsMeters.map(point => {
      const hValue = point.h ?? 0;
      const hOrto = point.H ?? 0;
      const nValue = point.N ?? 0;
      return `${point.name}<br>Lat: ${point.lat.toFixed(6)}°<br>Lon: ${point.lon.toFixed(6)}°<br>H: ${hOrto.toFixed(3)} m<br>h: ${hValue.toFixed(3)} m<br>N: ${nValue.toFixed(3)} m`;
    }),
    hovertemplate: '%{text}<extra></extra>',
    marker: {
      size: 6,
      color: pointsMeters.map(point => point.z),
      cmin: minAltitude,
      cmax: maxAltitude,
      colorscale: [
        [0, '#1e3a8a'],
        [0.33, '#059669'],
        [0.66, '#f59e0b'],
        [1, '#dc2626'],
      ],
      opacity: 1,
      line: {
        color: '#ffffff',
        width: 1.2,
      },
      symbol: 'circle',
    },
    showlegend: true,
    name: 'Pontos medidos',
  };

  const scatter3DLayout: Partial<Layout> = {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 0, r: 0, b: 0, t: 0 },
    scene: {
      xaxis: {
        title: { text: 'Leste/Oeste (m)' },
        showgrid: true,
        gridcolor: 'rgba(148,163,184,0.15)',
        tickformat: '.2f',
        range: [boundedMinX, boundedMaxX],
      },
      yaxis: {
        title: { text: 'Norte/Sul (m)' },
        showgrid: true,
        gridcolor: 'rgba(148,163,184,0.15)',
        tickformat: '.2f',
        range: [boundedMinY, boundedMaxY],
      },
      zaxis: {
        title: { text: 'Altitude (H) m' },
        showgrid: true,
        gridcolor: 'rgba(148,163,184,0.15)',
        tickformat: '.2f',
        range: [Math.min(...pointsMeters.map(p => p.z)) - 0.5, Math.max(...pointsMeters.map(p => p.z)) + 0.5],
      },
      aspectmode: 'data',
      camera: {
        eye: { x: 1.35, y: 1.2, z: 0.85 },
      },
    },
    uirevision: 'terrain3d-static',
  };

  const scatter3DConfig: Partial<Config> = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'resetScale2d', 'autoScale2d'],
    scrollZoom: true,
  };

  const ProfileTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
          <p className="font-bold mb-2 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">{data.name}</p>
          <div className="space-y-1">
            <p><span className="text-slate-500">Distância acumulada:</span> <span className="font-mono font-bold">{data.distanceKm.toFixed(2)} km</span></p>
            <p><span className="text-ibge-green">Altitude Ortométrica (H):</span> <span className="font-mono font-bold">{(data.H ?? 0).toFixed(3)}m</span></p>
            <p><span className="text-slate-500">Altitude Elipsoidal (h):</span> <span className="font-mono font-bold">{(data.h ?? 0).toFixed(3)}m</span></p>
            <p><span className="text-ibge-blue">Ondulação Geoidal (N):</span> <span className="font-mono font-bold">{(data.N ?? 0).toFixed(3)}m</span></p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Média Ortométrica (H)</span>
          </div>
          <p className="text-2xl font-bold text-ibge-green">
            {avgH.toFixed(2)} <span className="text-sm font-normal text-slate-500">m</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2 text-ibge-blue mb-2">
            <ArrowUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Ponto Mais Alto (H)</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {maxH.toFixed(2)} <span className="text-sm font-normal text-slate-500">m</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2 text-ibge-gold mb-2">
            <ArrowDown className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Ponto Mais Baixo (H)</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {minH.toFixed(2)} <span className="text-sm font-normal text-slate-500">m</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-ibge-blue" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Análise Espacial de Pontos</h3>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'vertical' ? 'bg-white dark:bg-slate-800 text-ibge-blue shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Perfil H
            </button>
            <button
              onClick={() => setViewMode('plan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'plan' ? 'bg-white dark:bg-slate-800 text-ibge-blue shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Espacial 3D
            </button>
          </div>
        </div>

        <div className="h-80 w-full">
          {viewMode === 'vertical' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 12 }} data={profileData}>
                <defs>
                  <linearGradient id="hProfileFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a859" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#00a859" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.14} />
                <XAxis
                  type="number"
                  dataKey="distanceKm"
                  name="Distância"
                  unit=" km"
                  domain={[0, 'dataMax']}
                  tickFormatter={(value: number) => value.toFixed(2)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  type="number"
                  name="Altitude"
                  unit=" m"
                  domain={['auto', 'auto']}
                  tickFormatter={(value: number) => value.toFixed(2)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip content={<ProfileTooltip />} cursor={{ stroke: '#1e293b', strokeOpacity: 0.22 }} />
                <Legend verticalAlign="top" height={34} iconType="line" />
                <Area
                  type="monotone"
                  name="Altitude Ortométrica (H)"
                  dataKey="H"
                  fill="url(#hProfileFill)"
                  stroke="#00a859"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#00a859', fill: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive
                />
                <Line
                  type="monotone"
                  name="Altitude Elipsoidal (h)"
                  dataKey="h"
                  stroke="#475569"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3.5, stroke: '#475569', fill: '#ffffff', strokeWidth: 1.5 }}
                  connectNulls
                  isAnimationActive
                />
                <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.25} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 overflow-hidden">
              <Plot
                data={[meshTrace, controlPointsTrace]}
                layout={scatter3DLayout}
                config={scatter3DConfig}
                useResizeHandler
                className="h-full w-full"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
        </div>
        
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
            Nota Técnica: Representação 3D com {(viewMode === 'plan' ? 'mesh contínuo conectando os pontos medidos em superfície, com coordenadas em metros (projeção cartográfica local). H (Altitude Ortométrica) é a altura acima do Geóide.' : 'perfil vertical (Z) por distância acumulada em km')}. A diferença entre h (Elips.) e H (Ortom.) é a Ondulação Geoidal (N).
          </p>
        </div>
      </div>
    </div>
  );
}

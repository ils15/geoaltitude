import React, { Suspense, lazy, useState } from 'react';
import { HgeoResult } from '../lib/api';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Config, Data, Layout } from 'plotly.js';
import { TrendingUp, ArrowUp, ArrowDown, Activity, BarChart3, Box, Map as MapIcon } from 'lucide-react';
import { haversineDistance, parseFatorConversao, projectLocalEN } from '../lib/geodesy';
import { triangulate } from '../lib/mesh';

// plotly.js é pesado (~5 MB) e só é usado na visão 3D — carregado sob demanda
const Plot = lazy(() => import('react-plotly.js'));

const N_COLOR_NEGATIVE = '#00a1e4'; // N < 0 (geóide abaixo do elipsoide)
const N_COLOR_POSITIVE = '#fdb913'; // N ≥ 0 (geóide acima do elipsoide)

const CAMERA_EYES = {
  iso: { x: 1.35, y: 1.2, z: 0.85 },
  topo: { x: 0.0001, y: -0.0001, z: 2.4 },
  perfil: { x: 2.4, y: 0.0001, z: 0.18 },
} as const;

type CameraPreset = keyof typeof CAMERA_EYES;

export function StatsDashboard({ results }: { results: HgeoResult[] }) {
  const [viewMode, setViewMode] = useState<'vertical' | 'discrepancia' | 'plan'>('vertical');
  const [exaggeration, setExaggeration] = useState(1);
  const [showSurface, setShowSurface] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');

  if (results.length < 2) return null;

  const validH = results.filter(r => r.H !== undefined).map(r => r.H as number);
  const avgH = validH.length > 0 ? validH.reduce((a, b) => a + b, 0) / validH.length : 0;
  const maxH = validH.length > 0 ? Math.max(...validH) : 0;
  const minH = validH.length > 0 ? Math.min(...validH) : 0;

  const normalizedData = results.map((r, idx) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.long);
    const h = r.h;
    const H = r.H;
    const N = parseFatorConversao(r.fator_conversao) ?? 0;

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
    const segmentKm = haversineDistance(prev, point) / 1000;
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

  // Plano de base e exagero vertical (estica o Z relativo ao plano XY)
  const zBase = minAltitude - Math.max(2, (maxAltitude - minAltitude) * 0.06);
  const zr = (z: number) => zBase + (z - zBase) * exaggeration;

  const meanLat = points3D.reduce((acc, point) => acc + point.lat, 0) / points3D.length;
  const meanLon = points3D.reduce((acc, point) => acc + point.lon, 0) / points3D.length;

  // Projeção local (plano tangente com raios de curvatura exatos) em metros
  const localEN = projectLocalEN(
    points3D.map(point => ({ lat: point.lat, lon: point.lon })),
    { lat: meanLat, lon: meanLon }
  );
  const pointsMeters = points3D.map((point, i) => ({
    ...point,
    xMeters: localEN[i].easting,
    yMeters: localEN[i].northing,
  }));

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

  // Malha Delaunay real com filtragem de triângulos-ponte (lib/mesh.ts)
  const meshData = triangulate(pointsMeters.map(p => [p.xMeters, p.yMeters] as const));
  const mesh = {
    vertices: pointsMeters.map((p, idx) => ({ x: p.xMeters, y: p.yMeters, z: p.z, idx })),
    triangles: meshData.triangles,
    empty: meshData.triangles.length < 3,
  };

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
    z: mesh.vertices.map(v => zr(v.z)),
    i: new Float32Array(mesh.triangles.filter((_, idx) => idx % 3 === 0)),
    j: new Float32Array(mesh.triangles.filter((_, idx) => idx % 3 === 1)),
    k: new Float32Array(mesh.triangles.filter((_, idx) => idx % 3 === 2)),
    opacity: 0.82,
    lighting: { ambient: 0.55, diffuse: 0.85, specular: 0.12, roughness: 0.9, fresnel: 0.1 },
    lightposition: { x: 1000, y: 1000, z: 5000 },
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

  // Hastes verticais (estilo sondagem/topografia) do plano de base até cada ponto
  const stemX: (number | null)[] = [];
  const stemY: (number | null)[] = [];
  const stemZ: (number | null)[] = [];
  pointsMeters.forEach(point => {
    stemX.push(point.xMeters, point.xMeters, null);
    stemY.push(point.yMeters, point.yMeters, null);
    stemZ.push(zr(zBase), zr(point.z), null);
  });

  const stemsTrace: Data = {
    type: 'scatter3d',
    mode: 'lines',
    x: stemX,
    y: stemY,
    z: stemZ,
    line: {
      color: pointsMeters.map(point => point.z),
      colorscale: [
        [0, '#1e3a8a'],
        [0.33, '#059669'],
        [0.66, '#f59e0b'],
        [1, '#dc2626'],
      ],
      cmin: minAltitude,
      cmax: maxAltitude,
      width: 4,
    },
    showlegend: false,
    hoverinfo: 'skip',
  } as Data;

  const basePlaneTrace: Data = {
    type: 'surface',
    x: [boundedMinX, boundedMaxX],
    y: [boundedMinY, boundedMaxY],
    z: [[zr(zBase), zr(zBase)], [zr(zBase), zr(zBase)]],
    opacity: 0.15,
    showscale: false,
    colorscale: [[0, '#64748b'], [1, '#64748b']],
    hoverinfo: 'skip',
    name: 'Plano de base',
  } as Data;

  const controlPointsTrace: Data = {
    type: 'scatter3d',
    mode: 'markers',
    x: pointsMeters.map(point => point.xMeters),
    y: pointsMeters.map(point => point.yMeters),
    z: pointsMeters.map(point => zr(point.z)),
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
        title: { text: exaggeration > 1 ? `Altitude (H) m · exagero ×${exaggeration.toFixed(1)}` : 'Altitude (H) m' },
        showgrid: true,
        gridcolor: 'rgba(148,163,184,0.15)',
        tickformat: '.2f',
        range: [zr(zBase) - 0.5, Math.max(...pointsMeters.map(p => zr(p.z))) + 0.5],
      },
      aspectmode: 'data',
      camera: {
        eye: CAMERA_EYES[cameraPreset],
      },
    },
    uirevision: `cam-${cameraPreset}`,
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

  const DiscrepancyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
          <p className="font-bold mb-1 text-slate-900 dark:text-white">{data.name}</p>
          <p><span className="text-ibge-blue">Ondulação (N):</span> <span className="font-mono font-bold">{(data.N ?? 0).toFixed(3)} m</span></p>
          <p className="text-slate-400 mt-1">h − H = N · a discrepância entre o elipsoide e o nível médio do mar</p>
        </div>
      );
    }
    return null;
  };

  const nAxisDomain: [number | ((min: number) => number), number | ((max: number) => number)] = [
    (min: number) => Math.min(-2, Math.floor(min)) - 1,
    (max: number) => Math.max(2, Math.ceil(max)) + 1,
  ];

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
              onClick={() => setViewMode('discrepancia')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'discrepancia' ? 'bg-white dark:bg-slate-800 text-ibge-blue shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Discrepância N
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

        {viewMode === 'plan' && (
          <div className="flex items-center gap-3 mb-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider shrink-0">Exagero vertical</span>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={exaggeration}
              onChange={e => setExaggeration(parseFloat(e.target.value))}
              className="w-32 accent-ibge-blue"
              aria-label="Exagero vertical"
            />
            <span className="font-mono font-bold text-ibge-blue dark:text-ibge-light-blue">×{exaggeration.toFixed(1)}</span>

            <label className="flex items-center gap-1.5 ml-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSurface}
                onChange={e => setShowSurface(e.target.checked)}
                className="accent-ibge-blue"
              />
              Superfície
            </label>

            <div className="flex items-center gap-0.5 ml-auto bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg" role="group" aria-label="Vista da câmera">
              {([['iso', 'Iso'], ['topo', 'Planta'], ['perfil', 'Perfil']] as Array<[CameraPreset, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCameraPreset(id)}
                  aria-pressed={cameraPreset === id}
                  className={`px-2 py-1 rounded-md font-bold transition-colors ${
                    cameraPreset === id
                      ? 'bg-white dark:bg-slate-800 text-ibge-blue dark:text-white shadow-sm'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={viewMode === 'plan' ? 'h-[440px] w-full' : 'h-80 w-full'}>
          {viewMode === 'vertical' ? (
            <div className="h-full flex flex-col">
              {/* Perfil absoluto: H (área) e h (linha) */}
              <ResponsiveContainer width="100%" height="59%">
                <ComposedChart margin={{ top: 8, right: 20, bottom: 0, left: 12 }} data={profileData} syncId="perfil-alt">
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
                    tick={false}
                  />
                  <YAxis
                    type="number"
                    name="Altitude"
                    unit=" m"
                    domain={['auto', 'auto']}
                    tickFormatter={(value: number) => value.toFixed(0)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    width={52}
                  />
                  <Tooltip content={<ProfileTooltip />} cursor={{ stroke: '#1e293b', strokeOpacity: 0.22 }} />
                  <Legend verticalAlign="top" height={24} iconType="line" wrapperStyle={{ fontSize: 10 }} />
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
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-[9px] uppercase tracking-widest font-bold text-ibge-blue dark:text-ibge-light-blue px-3 py-0.5">
                Discrepância ao longo do traçado: ondulação geoidal N = h − H (m) · mesma distância
              </p>
              {/* Faixa de N com escala própria — a discrepância é o protagonista */}
              <ResponsiveContainer width="100%" height="33%">
                <ComposedChart margin={{ top: 4, right: 20, bottom: 0, left: 12 }} data={profileData} syncId="perfil-alt">
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
                    tick={{ fontSize: 9, fill: '#64748b' }}
                  />
                  <YAxis
                    type="number"
                    name="Ondulação (N)"
                    domain={nAxisDomain}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#00a1e4' }}
                    tickFormatter={(value: number) => value.toFixed(0)}
                    width={52}
                  />
                  <Tooltip content={<ProfileTooltip />} cursor={{ stroke: '#1e293b', strokeOpacity: 0.22 }} />
                  <ReferenceLine y={0} stroke="#334155" strokeOpacity={0.6} />
                  <Area
                    type="monotone"
                    name="Ondulação (N = h − H)"
                    dataKey="N"
                    stroke="#00a1e4"
                    strokeWidth={1.5}
                    fill="#00a1e4"
                    fillOpacity={0.4}
                    baseLine={0}
                    connectNulls
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : viewMode === 'discrepancia' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart margin={{ top: 20, right: 20, bottom: 10, left: 12 }} data={profileData}>
                <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.14} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  type="number"
                  name="Ondulação (N)"
                  unit=" m"
                  domain={nAxisDomain}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => value.toFixed(1)}
                />
                <Tooltip content={<DiscrepancyTooltip />} cursor={{ fill: 'rgba(0,74,142,0.06)' }} />
                <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.5} />
                <Bar name="Ondulação geoidal (N)" dataKey="N" radius={[3, 3, 0, 0]} maxBarSize={44}>
                  {profileData.map((entry, i) => (
                    <Cell key={i} fill={(entry.N ?? 0) >= 0 ? N_COLOR_POSITIVE : N_COLOR_NEGATIVE} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 overflow-hidden">
              <Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Carregando visualização 3D…
                  </div>
                }
              >
              <Plot
                data={[basePlaneTrace, ...(showSurface ? [meshTrace] : []), stemsTrace, controlPointsTrace]}
                  layout={scatter3DLayout}
                  config={scatter3DConfig}
                  useResizeHandler
                  className="h-full w-full"
                  style={{ width: '100%', height: '100%' }}
                />
              </Suspense>
            </div>
          )}
        </div>
        
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
            Nota Técnica: {(viewMode === 'plan'
              ? 'representação 3D geoespacial: malha de Delaunay com filtragem de triângulos-ponte, hastes verticais até o plano de base, exagero vertical ajustável e vistas Iso/Planta/Perfil. Com dados esparsos, desative a superfície e leia o relevo pelas hastes. '
              : viewMode === 'discrepancia'
                ? 'discrepância altimétrica por ponto: cada barra é a ondulação geoidal N = h − H (azul: geóide abaixo do elipsoide; âmbar: acima). '
                : 'perfil vertical com distância acumulada (km): H (área), h (linha) e N (barras no eixo secundário) — a diferença entre as duas curvas é a ondulação geoidal. ')}
            Coordenadas XY em metros (projeção local, plano tangente).
          </p>
        </div>
      </div>
    </div>
  );
}

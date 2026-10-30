import React, { useState } from 'react';
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
import { TrendingUp, ArrowUp, ArrowDown, Activity, BarChart3 } from 'lucide-react';
import { haversineDistance, parseFatorConversao } from '../lib/geodesy';

const N_COLOR_NEGATIVE = '#00a1e4'; // N < 0 (geóide abaixo do elipsoide)
const N_COLOR_POSITIVE = '#fdb913'; // N ≥ 0 (geóide acima do elipsoide)

// ===== Tooltips (escopo de módulo: componentes estáveis, fora do render) =====

interface ProfileDatum {
  name: string;
  distanceKm: number;
  H?: number | null;
  h?: number | null;
  N?: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ProfileDatum }>;
}

function ProfileTooltip({ active, payload }: TooltipProps) {
  const data = active ? payload?.[0]?.payload : undefined;
  if (!data) return null;
  return (
    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
      <p className="font-bold mb-2 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
        {data.name}
      </p>
      <div className="space-y-1">
        <p>
          <span className="text-slate-500">Distância acumulada:</span>{' '}
          <span className="font-mono font-bold">{data.distanceKm.toFixed(2)} km</span>
        </p>
        <p>
          <span className="text-ibge-green">Altitude Ortométrica (H):</span>{' '}
          <span className="font-mono font-bold">{(data.H ?? 0).toFixed(3)}m</span>
        </p>
        <p>
          <span className="text-slate-500">Altitude Elipsoidal (h):</span>{' '}
          <span className="font-mono font-bold">{(data.h ?? 0).toFixed(3)}m</span>
        </p>
        <p>
          <span className="text-ibge-blue">Ondulação Geoidal (N):</span>{' '}
          <span className="font-mono font-bold">{(data.N ?? 0).toFixed(3)}m</span>
        </p>
      </div>
    </div>
  );
}

function DiscrepancyTooltip({ active, payload }: TooltipProps) {
  const data = active ? payload?.[0]?.payload : undefined;
  if (!data) return null;
  return (
    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
      <p className="font-bold mb-1 text-slate-900 dark:text-white">{data.name}</p>
      <p>
        <span className="text-ibge-blue">Ondulação (N):</span>{' '}
        <span className="font-mono font-bold">{(data.N ?? 0).toFixed(3)} m</span>
      </p>
      <p className="text-slate-400 mt-1">h − H = N · a discrepância entre o elipsoide e o nível médio do mar</p>
    </div>
  );
}

export function StatsDashboard({ results }: { results: HgeoResult[] }) {
  const [viewMode, setViewMode] = useState<'vertical' | 'discrepancia'>('vertical');

  if (results.length < 2) return null;

  const validH = results.filter((r): r is HgeoResult & { H: number } => r.H !== undefined).map((r) => r.H);
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

  // Distâncias por segmento + acumulada (sem mutação durante o render)
  const segmentKmList = normalizedData.map((point, index) =>
    index === 0 ? 0 : haversineDistance(normalizedData[index - 1], point) / 1000
  );
  const profileData = normalizedData.map((point, index) => ({
    ...point,
    segmentKm: segmentKmList[index],
    distanceKm: segmentKmList.slice(0, index + 1).reduce((a, b) => a + b, 0),
  }));

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
            <BarChart3 className="w-5 h-5 text-ibge-blue" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Análise Espacial de Pontos</h3>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'vertical'
                  ? 'bg-white dark:bg-slate-800 text-ibge-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Perfil H
            </button>
            <button
              onClick={() => setViewMode('discrepancia')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'discrepancia'
                  ? 'bg-white dark:bg-slate-800 text-ibge-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Discrepância N
            </button>
          </div>
        </div>

        <div className="h-80 w-full">
          {viewMode === 'vertical' ? (
            <div className="h-full flex flex-col">
              {/* Perfil absoluto: H (área) e h (linha) */}
              <ResponsiveContainer width="100%" height="59%">
                <ComposedChart
                  margin={{ top: 8, right: 20, bottom: 0, left: 12 }}
                  data={profileData}
                  syncId="perfil-alt"
                >
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
                <ComposedChart
                  margin={{ top: 4, right: 20, bottom: 0, left: 12 }}
                  data={profileData}
                  syncId="perfil-alt"
                >
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
          ) : (
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
          )}
        </div>

        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
            Nota Técnica:{' '}
            {viewMode === 'discrepancia'
              ? 'discrepância altimétrica por ponto: cada barra é a ondulação geoidal N = h − H (azul: geóide abaixo do elipsoide; âmbar: acima). '
              : 'perfil vertical com distância acumulada (km): H (área), h (linha) e, abaixo, a faixa de N com escala própria — a discrepância fica sempre visível, independentemente da amplitude de altitude. '}
          </p>
        </div>
      </div>
    </div>
  );
}

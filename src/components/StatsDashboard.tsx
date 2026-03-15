import React, { useState } from 'react';
import { HgeoResult } from '../lib/api';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { TrendingUp, ArrowUp, ArrowDown, Activity, Box, Map as MapIcon } from 'lucide-react';

export function StatsDashboard({ results }: { results: HgeoResult[] }) {
  const [viewMode, setViewMode] = useState<'plan' | 'vertical'>('vertical');

  if (results.length < 2) return null;

  const validH = results.filter(r => r.H !== undefined).map(r => r.H as number);
  const avgH = validH.length > 0 ? validH.reduce((a, b) => a + b, 0) / validH.length : 0;
  const maxH = validH.length > 0 ? Math.max(...validH) : 0;
  const minH = validH.length > 0 ? Math.min(...validH) : 0;

  // Optimized data mapping
  const scatterData = results.map((r, idx) => ({
    x: viewMode === 'plan' ? parseFloat(r.long) : idx + 1,
    y: viewMode === 'plan' ? parseFloat(r.lat) : r.H ?? 0,
    h: r.h ?? 0,
    N: typeof r.fator_conversao === 'string' ? parseFloat(r.fator_conversao) : r.fator_conversao,
    H: r.H ?? 0,
    name: `Ponto ${idx + 1}`
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
          <p className="font-bold mb-2 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">{data.name}</p>
          <div className="space-y-1">
            <p><span className="text-slate-500">Altitude Geométrica (h):</span> <span className="font-mono font-bold">{data.h.toFixed(3)}m</span></p>
            <p><span className="text-ibge-blue">Ondulação Geoidal (N):</span> <span className="font-mono font-bold">{data.N.toFixed(3)}m</span></p>
            <p><span className="text-ibge-green">Altitude Ortométrica (H):</span> <span className="font-mono font-bold">{data.H.toFixed(3)}m</span></p>
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
              Planimetria (XY)
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis 
                type="number" 
                dataKey="x" 
                name={viewMode === 'plan' ? 'Longitude' : 'Index'} 
                unit={viewMode === 'plan' ? '°' : ''}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{fontSize: 10, fill: '#64748b'}}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name={viewMode === 'plan' ? 'Latitude' : 'Altitude H'} 
                unit={viewMode === 'plan' ? '°' : 'm'}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{fontSize: 10, fill: '#64748b'}}
              />
              <ZAxis type="number" range={[40, 400]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Scatter 
                name={viewMode === 'plan' ? "Distribuição Espacial" : "Altitude Ortométrica (H)"} 
                data={scatterData} 
                fill="#00a859"
              >
                {scatterData.map((entry, index) => (
                   <Cell 
                    key={`cell-${index}`} 
                    fill={viewMode === 'plan' ? '#0078d4' : '#00a859'} 
                   />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
            Nota Técnica: Representação de pontos isolados no espaço {(viewMode === 'plan' ? 'Planimétrico (X,Y)' : 'Vertical (Z)')}. A diferença entre h e H representa a Ondulação Geoidal (N).
          </p>
        </div>
      </div>
    </div>
  );
}

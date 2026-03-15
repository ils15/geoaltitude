import React from 'react';
import { HgeoResult } from '../lib/api';
import { StatsDashboard } from './StatsDashboard';
import { ReportButton } from './ReportButton';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Download, Map as MapIcon, Table2, Layers, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { Toaster, toast } from 'react-hot-toast';

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800/50">
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
  </tr>
);

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function ResultsView({ results }: { results: HgeoResult[] }) {
  const [view, setView] = React.useState<'table' | 'map'>('table');

  if (results.length === 0) return null;

  const centerLat = results.reduce((acc, curr) => acc + parseFloat(curr.lat), 0) / results.length;
  const centerLon = results.reduce((acc, curr) => acc + parseFloat(curr.long), 0) / results.length;

  const downloadResults = () => {
    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `resultados_geoaltitude_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  const singleResultWithH = results.length === 1 && results[0].h !== undefined ? results[0] : null;

  return (
    <div id="report-content" className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resultados ({results.length})</h2>
        <div className="flex items-center gap-4">
          <ReportButton results={results} elementId="report-content" />
          <button
            onClick={downloadResults}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-ibge-blue dark:text-ibge-light-blue border border-ibge-blue/20 dark:border-ibge-blue/50 hover:bg-ibge-blue/5 dark:hover:bg-ibge-blue/10 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors duration-200">
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${
                view === 'table' ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Ver Tabela"
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('map')}
              className={`p-1.5 rounded-md transition-colors ${
                view === 'map' ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Ver Mapa"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {results.length > 1 && (
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <StatsDashboard results={results} />
        </div>
      )}

      {singleResultWithH && (
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-ibge-light-blue" />
            Comparação de Altitudes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Altitude Geométrica (h)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{singleResultWithH.h?.toFixed(3)} <span className="text-sm font-normal text-slate-500">m</span></p>
              <p className="text-xs text-slate-400 mt-1">Referência: Elipsoide</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Ondulação Geoidal (N)</p>
              <p className="text-2xl font-bold text-ibge-blue dark:text-ibge-light-blue">{singleResultWithH.fator_conversao} <span className="text-sm font-normal text-ibge-light-blue">m</span></p>
              <p className="text-xs text-slate-400 mt-1">Modelo: {singleResultWithH.modelo}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-ibge-green/30 dark:border-ibge-green/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-ibge-green/20 dark:bg-ibge-green/30 rounded-bl-full -mr-8 -mt-8 z-0"></div>
              <div className="relative z-10">
                <p className="text-xs text-ibge-green dark:text-ibge-green font-medium mb-1">Altitude Ortométrica (H)</p>
                <p className="text-2xl font-bold text-ibge-green dark:text-ibge-green">{singleResultWithH.H?.toFixed(3)} <span className="text-sm font-normal text-ibge-green">m</span></p>
                <p className="text-xs text-ibge-green/80 dark:text-ibge-green/80 mt-1">Referência: Nível Médio do Mar (Geóide)</p>
              </div>
            </div>
          </div>

          {/* Graphic Schematic */}
          <div className="relative h-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center p-4">
             <div className="relative w-full max-w-md h-full flex flex-col justify-center">
                {/* Superfície Terrestre */}
                <div className="absolute top-[20%] left-0 w-full border-t-2 border-ibge-green border-dashed"></div>
                <span className="absolute top-[10%] left-2 text-xs font-medium text-ibge-green">Superfície Terrestre (Ponto)</span>
                
                {/* Geóide */}
                <div className="absolute top-[50%] left-0 w-full border-t-2 border-ibge-light-blue"></div>
                <span className="absolute top-[40%] left-2 text-xs font-medium text-ibge-light-blue">Geóide (NMM)</span>
                
                {/* Elipsoide */}
                <div className="absolute top-[80%] left-0 w-full border-t-2 border-slate-400"></div>
                <span className="absolute top-[70%] left-2 text-xs font-medium text-slate-500 dark:text-slate-400">Elipsoide</span>

                {/* Setas e Valores */}
                <div className="absolute left-1/2 -translate-x-1/2 h-full w-px">
                  {/* h (Elipsoide até Superfície) */}
                  <div className="absolute top-[20%] bottom-[20%] left-8 w-px bg-slate-400 flex items-center justify-center">
                    <div className="w-2 h-px bg-slate-400 absolute top-0"></div>
                    <div className="w-2 h-px bg-slate-400 absolute bottom-0"></div>
                    <span className="bg-white dark:bg-slate-800 px-1 text-xs font-bold text-slate-600 dark:text-slate-300">h = {singleResultWithH.h?.toFixed(2)}m</span>
                  </div>

                  {/* H (Geóide até Superfície) */}
                  <div className="absolute top-[20%] bottom-[50%] -left-8 w-px bg-ibge-green flex items-center justify-center">
                    <div className="w-2 h-px bg-ibge-green absolute top-0"></div>
                    <div className="w-2 h-px bg-ibge-green absolute bottom-0"></div>
                    <span className="bg-white dark:bg-slate-800 px-1 text-xs font-bold text-ibge-green">H = {singleResultWithH.H?.toFixed(2)}m</span>
                  </div>

                  {/* N (Elipsoide até Geóide) */}
                  <div className="absolute top-[50%] bottom-[20%] -left-8 w-px bg-ibge-blue flex items-center justify-center">
                    <div className="w-2 h-px bg-ibge-blue absolute top-0"></div>
                    <div className="w-2 h-px bg-ibge-blue absolute bottom-0"></div>
                    <span className="bg-white dark:bg-slate-800 px-1 text-xs font-bold text-ibge-blue">N = {singleResultWithH.fator_conversao}m</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3">Latitude</th>
                <th className="px-6 py-3">Longitude</th>
                <th className="px-6 py-3">Altitude (h)</th>
                <th className="px-6 py-3">Ondulação (N)</th>
                 <th className="px-6 py-3">Altitude (H)</th>
                <th className="px-6 py-3">Endereço</th>
                <th className="px-6 py-3">Incerteza (m)</th>
                <th className="px-6 py-3">Modelo</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {results.length === 0 ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs">{res.lat}</td>
                  <td className="px-6 py-3 font-mono text-xs">{res.long}</td>
                  <td className="px-6 py-3 font-mono text-xs">{res.h !== undefined ? `${res.h.toFixed(3)}m` : '-'}</td>
                  <td className="px-6 py-3 font-medium text-ibge-blue dark:text-ibge-light-blue">{res.fator_conversao}{typeof res.fator_conversao === 'number' ? 'm' : ''}</td>
                   <td className="px-6 py-3 font-mono text-xs font-medium text-ibge-green">{res.H !== undefined ? `${res.H.toFixed(3)}m` : '-'}</td>
                  <td className="px-6 py-3 text-xs max-w-xs truncate" title={res.address}>{res.address || '-'}</td>
                  <td className="px-6 py-3">{res.incerteza}{typeof res.incerteza === 'number' ? 'm' : ''}</td>
                  <td className="px-6 py-3 text-xs">{res.modelo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[500px] w-full relative z-0">
          <MapContainer 
            center={[centerLat, centerLon]} 
            zoom={results.length === 1 ? 13 : 5} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {results.map((res, idx) => (
              <Marker 
                key={idx} 
                position={[parseFloat(res.lat), parseFloat(res.long)]}
              >
                <Popup>
                  <div className="text-sm dark:text-slate-800">
                    <p className="font-semibold mb-1">Ponto {idx + 1}</p>
                    <p><strong>Lat:</strong> {res.lat}</p>
                    <p><strong>Lon:</strong> {res.long}</p>
                    {res.h !== undefined && <p><strong>Alt. Geométrica (h):</strong> {res.h.toFixed(3)}m</p>}
                    <p><strong>Ondulação (N):</strong> <span className="text-ibge-blue font-medium">{res.fator_conversao}{typeof res.fator_conversao === 'number' ? 'm' : ''}</span></p>
                     {res.H !== undefined && <p><strong>Alt. Ortométrica (H):</strong> <span className="text-ibge-green font-medium">{res.H.toFixed(3)}m</span></p>}
                    {res.address && <p><strong>Localização:</strong> {res.address}</p>}
                    <p><strong>Incerteza:</strong> {res.incerteza}{typeof res.incerteza === 'number' ? 'm' : ''}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

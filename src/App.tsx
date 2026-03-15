import React, { useState } from 'react';
import { SinglePointForm } from './components/SinglePointForm';
import { BatchUpload } from './components/BatchUpload';
import { ShapefileUpload } from './components/ShapefileUpload';
import { ResultsView } from './components/ResultsView';
import { Explanation } from './components/Explanation';
import { MapPreview } from './components/MapPreview';
import { getPontoDec, HgeoResult } from './lib/api';
import { useHistory } from './hooks/useHistory';
import { Compass, Globe2, UploadCloud, Calculator, Info, Map as MapIcon, History, Trash2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';

type Tab = 'map' | 'upload' | 'manual' | 'about';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [results, setResults] = useState<HgeoResult[]>([]);
  const [shapefileData, setShapefileData] = useState<any>(null);
  const { history, addPoint, clearHistory } = useHistory();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSingleResult = (result: HgeoResult) => {
    setResults([result]);
    addPoint(result);
  };

  const handleBatchResult = (batchResults: HgeoResult[]) => {
    setResults(batchResults);
    // Stay on current tab to show results dashboard
    // setActiveTab('map');
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col transition-colors duration-200">
      <Toaster position="top-right" />
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-ibge-blue p-2 rounded-xl shadow-sm">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GeoAlt</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:block">Conversão de Altitude hgeoHNOR</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors duration-200">
            <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<UploadCloud className="w-4 h-4" />} label="Lote (CSV)" />
            <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapIcon className="w-4 h-4" />} label="Mapa" />
            <TabButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<Calculator className="w-4 h-4" />} label="Manual" />
            <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info className="w-4 h-4" />} label="Entenda" />
          </nav>

          <a
            href="https://servicodados.ibge.gov.br/api/docs/hgeohnor?versao=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-ibge-blue dark:hover:text-ibge-light-blue transition-colors"
          >
            <Globe2 className="w-4 h-4" />
            <span className="hidden sm:inline">API do IBGE</span>
          </a>
        </div>
        
        {/* Mobile Nav */}
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 flex overflow-x-auto gap-2 hide-scrollbar transition-colors duration-200">
            <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<UploadCloud className="w-4 h-4" />} label="Lote" />
            <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapIcon className="w-4 h-4" />} label="Mapa" />
            <TabButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<Calculator className="w-4 h-4" />} label="Manual" />
            <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info className="w-4 h-4" />} label="Entenda" />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Visualização no Mapa</h2>
                <p className="text-slate-600 dark:text-slate-400">Visualize os pontos processados, altere camadas e desenhe polígonos.</p>
              </div>
              <MapPreview points={results} shapefileData={shapefileData} />
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Processamento em Lote</h2>
                  <p className="text-slate-600 dark:text-slate-400">Faça upload de um CSV com milhares de pontos.</p>
                </div>
                <BatchUpload onBatchResult={handleBatchResult} />
                <ShapefileUpload onShapefileLoaded={setShapefileData} />
              </div>
              <div className="lg:col-span-8">
                {results.length > 0 ? (
                  <ResultsView results={results} />
                ) : (
                  <EmptyState icon={<UploadCloud className="w-8 h-8 text-slate-300" />} message="Faça upload de um arquivo para ver os resultados aqui." />
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'manual' && (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calculadora Manual</h2>
                  <p className="text-slate-600 dark:text-slate-400">Insira coordenadas exatas em graus decimais ou sexagesimais.</p>
                </div>
                <SinglePointForm onResult={handleSingleResult} />
              </div>
              <div className="lg:col-span-7">
                {results.length > 0 ? (
                  <ResultsView results={results} />
                ) : (
                  <EmptyState icon={<Calculator className="w-8 h-8 text-slate-300" />} message="Calcule um ponto para ver o resultado detalhado." />
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Explanation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Panel */}
        {history.length > 0 && activeTab !== 'about' && (
          <div className="mt-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-ibge-blue" />
                Histórico de Sessão
              </h3>
              <button
                onClick={clearHistory}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Latitude</th>
                    <th className="px-4 py-3">Longitude</th>
                    <th className="px-4 py-3">Alt. Geométrica (h)</th>
                    <th className="px-4 py-3">Ondulação (N)</th>
                    <th className="px-4 py-3">Alt. Ortométrica (H)</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.lat}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.long}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.h !== undefined ? `${item.h.toFixed(3)} m` : '-'}</td>
                      <td className="px-4 py-3 font-mono font-medium text-ibge-blue dark:text-ibge-light-blue">{item.fator_conversao} m</td>
                      <td className="px-4 py-3 font-mono font-medium text-ibge-green dark:text-ibge-green">{item.H !== undefined ? `${item.H.toFixed(3)} m` : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyToClipboard(`Lat: ${item.lat}, Lon: ${item.long}, h: ${item.h !== undefined ? item.h.toFixed(3) : '-'}, N: ${item.fator_conversao}m, H: ${item.H !== undefined ? item.H.toFixed(3) : '-'}`, index)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                          title="Copiar resultado"
                        >
                          {copiedIndex === index ? <Check className="w-4 h-4 text-ibge-green" /> : <Check className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
        active 
          ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode, message: string }) {
  return (
    <div className="h-full min-h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center p-8 text-center transition-colors duration-200">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Aguardando dados</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
    </div>
  );
}


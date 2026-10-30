import React, { useEffect, useState } from 'react';
import { SinglePointForm } from './components/SinglePointForm';
import { BatchUpload } from './components/BatchUpload';
import { ShapefileUpload } from './components/ShapefileUpload';
import { ResultsView } from './components/ResultsView';
import { Explanation } from './components/Explanation';
import { ConversionsPanel } from './components/ConversionsPanel';
import { MapPreview } from './components/MapPreview';
import { useHistory } from './hooks/useHistory';
import { useTheme } from './hooks/useTheme';
import { ThemeToggle } from './components/ThemeToggle';
import { HgeoResult } from './lib/api';
import { readShareHash } from './lib/project';
import {
  Compass,
  Globe2,
  UploadCloud,
  Calculator,
  Info,
  Map as MapIcon,
  History,
  Trash2,
  Copy,
  Check,
  Ruler,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';

type Tab = 'map' | 'upload' | 'convert' | 'about';

const TAB_FROM_HASH: Record<string, Tab> = {
  '#/mapa': 'map',
  '#/lote': 'upload',
  '#/conversoes': 'convert',
  '#/entenda': 'about',
};
const HASH_FROM_TAB: Record<Tab, string> = {
  map: '#/mapa',
  upload: '#/lote',
  convert: '#/conversoes',
  about: '#/entenda',
};

export default function App() {
  const [activeTab, setActiveTabState] = useState<Tab>(() => TAB_FROM_HASH[window.location.hash] ?? 'upload');
  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    // deep-link simples: mantém o hash do compartilhamento (#p/#pg) intacto
    if (!window.location.hash.startsWith('#p')) {
      window.history.replaceState(null, '', HASH_FROM_TAB[tab]);
    }
  };
  const [results, setResults] = useState<HgeoResult[]>([]);
  const [shapefileData, setShapefileData] = useState<GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[] | null>(
    null
  );
  const { history, addPoint, clearHistory } = useHistory();
  const theme = useTheme();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSingleResult = (result: HgeoResult) => {
    setResults([result]);
    addPoint(result);
  };

  const handleBatchResult = (batchResults: HgeoResult[]) => {
    setResults(batchResults);
    // Permanece na aba atual para exibir o painel de resultados
  };

  // Sessão compartilhada por link (#p= / #pg=)
  const [sharedNotice, setSharedNotice] = useState<string | null>(null);
  useEffect(() => {
    const onHashChange = () => {
      if (!window.location.hash.startsWith('#p')) {
        const tab = TAB_FROM_HASH[window.location.hash];
        if (tab) setActiveTabState(tab);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#p')) return;
    void readShareHash(hash).then((shared) => {
      if (shared && shared.length > 0) {
        setResults(shared);
        setActiveTab('map');
        setSharedNotice(
          `Sessão compartilhada restaurada (${shared.length} ponto(s)). Salve o projeto para não perder.`
        );
      }
    });
  }, []);

  const copyToClipboard = (text: string, index: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-200 selection:text-indigo-900 flex flex-col transition-colors duration-200">
      <Toaster position="top-right" />
      <header className="sticky top-0 z-50 transition-colors duration-200 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-white/20 dark:border-slate-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-ibge-blue to-ibge-light-blue p-2 rounded-xl shadow-md shadow-ibge-blue/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GeoAlt</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
                Conversão de Altitude hgeoHNOR
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl transition-colors duration-200 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            <TabButton
              active={activeTab === 'upload'}
              onClick={() => setActiveTab('upload')}
              icon={<UploadCloud className="w-4 h-4" />}
              label="Lote (CSV)"
            />
            <TabButton
              active={activeTab === 'map'}
              onClick={() => setActiveTab('map')}
              icon={<MapIcon className="w-4 h-4" />}
              label="Mapa"
            />
            <TabButton
              active={activeTab === 'convert'}
              onClick={() => setActiveTab('convert')}
              icon={<Calculator className="w-4 h-4" />}
              label="Ponto Único & Conversões"
            />
            <TabButton
              active={activeTab === 'about'}
              onClick={() => setActiveTab('about')}
              icon={<Info className="w-4 h-4" />}
              label="Entenda"
            />
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle preference={theme.preference} onChange={theme.setTheme} />
            <a
              href="https://servicodados.ibge.gov.br/api/docs/hgeohnor?versao=1"
              target="_blank"
              rel="noopener noreferrer"
              title="Documentação da API hgeoHNOR (IBGE)"
              className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-ibge-blue dark:hover:text-ibge-light-blue transition-colors"
            >
              <Globe2 className="w-4 h-4" />
              <span className="hidden sm:inline">API do IBGE</span>
            </a>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-3 flex overflow-x-auto gap-2 hide-scrollbar transition-colors duration-200">
          <TabButton
            active={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            icon={<UploadCloud className="w-4 h-4" />}
            label="Lote"
          />
          <TabButton
            active={activeTab === 'map'}
            onClick={() => setActiveTab('map')}
            icon={<MapIcon className="w-4 h-4" />}
            label="Mapa"
          />
          <TabButton
            active={activeTab === 'convert'}
            onClick={() => setActiveTab('convert')}
            icon={<Calculator className="w-4 h-4" />}
            label="Conversões"
          />
          <TabButton
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
            icon={<Info className="w-4 h-4" />}
            label="Entenda"
          />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sharedNotice && (
          <div className="mb-6 p-3 bg-ibge-blue/5 dark:bg-ibge-blue/10 border border-ibge-blue/20 rounded-xl text-sm text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
            <span>{sharedNotice}</span>
            <button
              type="button"
              onClick={() => setSharedNotice(null)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              fechar
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Visualização no Mapa</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Visualize os pontos processados, altere camadas e desenhe polígonos.
                </p>
              </div>
              <MapPreview points={results} shapefileData={shapefileData} />
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Processamento em Lote</h2>
                <p className="text-slate-600 dark:text-slate-400">Faça upload de um CSV com milhares de pontos.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <BatchUpload onBatchResult={handleBatchResult} />
                </div>

                <div className="space-y-6">
                  <ShapefileUpload onShapefileLoaded={setShapefileData} />
                </div>
              </div>

              <div>
                {results.length > 0 ? (
                  <ResultsView results={results} onImportResults={setResults} />
                ) : (
                  <EmptyState
                    icon={<UploadCloud className="w-8 h-8 text-slate-300" />}
                    message="Faça upload de um arquivo para ver os resultados aqui."
                  />
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'convert' && (
            <motion.div
              key="convert"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ponto Único & Conversões</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Calcule um ponto por endereço ou coordenadas (API hgeoHNOR do IBGE) e use os conversores offline.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5">
                  <SinglePointForm onResult={handleSingleResult} />
                </div>
                <div className="lg:col-span-7">
                  {results.length === 1 ? (
                    <ResultsView results={results} onImportResults={setResults} />
                  ) : (
                    <EmptyState
                      icon={<Calculator className="w-8 h-8 text-slate-300" />}
                      message="Busque um endereço ou insira coordenadas para calcular a altitude ortométrica (H) com o modelo geoidal."
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-ibge-blue" />
                  Conversores offline
                </h3>
                <ConversionsPanel />
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Explanation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Panel */}
        {history.length > 0 && activeTab !== 'about' && activeTab !== 'convert' && (
          <div className="mt-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 p-6 transition-colors duration-200">
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
                    <tr
                      key={index}
                      className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.lat}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.long}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        {item.h !== undefined ? `${item.h.toFixed(3)} m` : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-ibge-blue dark:text-ibge-light-blue">
                        {item.fator_conversao} m
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-ibge-green dark:text-ibge-green">
                        {item.H !== undefined ? `${item.H.toFixed(3)} m` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `Lat: ${item.lat}, Lon: ${item.long}, h: ${item.h !== undefined ? item.h.toFixed(3) : '-'}, N: ${item.fator_conversao}m, H: ${item.H !== undefined ? item.H.toFixed(3) : '-'}`,
                              index
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                          title="Copiar resultado"
                          aria-label="Copiar resultado"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-ibge-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
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

      <footer className="border-t border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>
            GeoAlt · conversão de altitudes com o modelo geoidal{' '}
            <a
              href="https://servicodados.ibge.gov.br/api/docs/hgeohnor?versao=1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ibge-blue dark:text-ibge-light-blue hover:underline font-medium"
            >
              hgeoHNOR (IBGE)
            </a>{' '}
            · mapas © OpenStreetMap
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-ibge-green animate-pulse" aria-hidden="true" />
            núcleo geodésico validado por 554 testes ·{' '}
            <a
              href="https://github.com/ils15/geoaltitude"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ibge-blue dark:text-ibge-light-blue hover:underline font-medium"
            >
              código aberto
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap ${
        active
          ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-md'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="h-full min-h-[400px] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border-2 border-slate-200/70 dark:border-slate-800/70 border-dashed flex flex-col items-center justify-center p-8 text-center transition-colors duration-200 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700/50 hover:bg-white/70 dark:hover:bg-slate-900/70">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl rotate-3 flex items-center justify-center mb-4 shadow-sm text-slate-400 dark:text-slate-500 transition-transform duration-300 hover:rotate-6 hover:scale-110">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Aguardando dados</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
    </div>
  );
}

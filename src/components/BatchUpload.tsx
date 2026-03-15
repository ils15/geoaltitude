import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';
import { getPontoDec, HgeoResult } from '../lib/api';
import { isValidCoordinate } from '../lib/validation';

export function BatchUpload({ onBatchResult }: { onBatchResult: (results: HgeoResult[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ lat: '', lon: '', h: '' });
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [stats, setStats] = useState({ valid: 0, ignored: 0 });
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setHeaders([]);
      setParsedData([]);
      setMapping({ lat: '', lon: '', h: '' });
      setStep('upload');
    }
  };

  const parseFile = () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const fields = results.meta.fields || [];
        
        if (data.length === 0 || fields.length === 0) {
          setError('O arquivo está vazio ou mal formatado.');
          setLoading(false);
          return;
        }

        setHeaders(fields);
        setParsedData(data);

        // Auto-detect columns
        const lowerFields = fields.map(f => f.toLowerCase().trim());
        const latIdx = lowerFields.findIndex(f => ['lat', 'latitude', 'y'].includes(f));
        const lonIdx = lowerFields.findIndex(f => ['lon', 'long', 'longitude', 'lng', 'x'].includes(f));
        const hIdx = lowerFields.findIndex(f => ['h', 'alt', 'altitude', 'elev', 'elevacao', 'z', 'altitude_elipsoidal'].includes(f));

        setMapping({
          lat: latIdx !== -1 ? fields[latIdx] : '',
          lon: lonIdx !== -1 ? fields[lonIdx] : '',
          h: hIdx !== -1 ? fields[hIdx] : ''
        });
        
        setStep('mapping');
        setLoading(false);
      },
      error: (err) => {
        setError(`Erro ao ler arquivo: ${err.message}`);
        setLoading(false);
      }
    });
  };

  const processFile = async () => {
    if (parsedData.length === 0 || !mapping.lat || !mapping.lon) {
      setError('Selecione ao menos as colunas de Latitude e Longitude.');
      return;
    }

    setStep('processing');
    setLoading(true);
    setProgress(0);
    setStats({ valid: 0, ignored: 0 });

    const validPoints: {lat: number, lon: number, h?: number}[] = [];
    let ignoredCount = 0;

    for (const row of parsedData) {
      const lat = parseFloat(row[mapping.lat]);
      const lon = parseFloat(row[mapping.lon]);
      let h: number | undefined = undefined;
      
      if (mapping.h && row[mapping.h]) {
        const parsedH = parseFloat(row[mapping.h]);
        if (!isNaN(parsedH)) h = parsedH;
      }

      if (!isNaN(lat) && !isNaN(lon)) {
        if (isValidCoordinate(lat, lon)) {
          validPoints.push({ lat, lon, h });
        } else {
          ignoredCount++;
        }
      }
    }

    setStats({ valid: validPoints.length, ignored: ignoredCount });

    if (validPoints.length === 0) {
      setError(`Nenhum ponto válido na área de cobertura do Brasil. ${ignoredCount > 0 ? `(${ignoredCount} pontos ignorados)` : ''}`);
      setLoading(false);
      setStep('mapping');
      return;
    }

    const processedResults: HgeoResult[] = [];
    let completed = 0;

    const chunkSize = 5; // Reduced chunk size for geocoding stability
    for (let i = 0; i < validPoints.length; i += chunkSize) {
      const chunk = validPoints.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (point, idx) => {
        try {
          // Add artificial delay per point in chunk to respect Nominatim rate limit (1req/s)
          await new Promise(resolve => setTimeout(resolve, idx * 1000));
          
          const res = await getPontoDec(point.lat, point.lon);
          
          // Add Geocoding
          try {
            const addressRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lon}`, {
               headers: { 'Accept-Language': 'pt-BR' }
            });
            const addressData = await addressRes.json();
            res.address = addressData.display_name || 'Endereço não encontrado';
          } catch (geoErr) {
            console.error('Geocoding error:', geoErr);
          }

          if (point.h !== undefined) {
            const N = typeof res.fator_conversao === 'string' ? parseFloat(res.fator_conversao) : res.fator_conversao;
            res.h = point.h;
            res.H = point.h - N;
          }
          return res;
        } catch (err) {
          console.error('Error processing point:', point, err);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      processedResults.push(...chunkResults.filter(Boolean) as HgeoResult[]);
      
      completed += chunk.length;
      setProgress(Math.round((completed / validPoints.length) * 100));
    }

    onBatchResult(processedResults);
    setLoading(false);
  };

  const downloadTemplate = () => {
    const csvContent = "lat,lon\n-23.5505,-46.6333\n-22.9068,-43.1729";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_pontos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-ibge-blue" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Processamento em Lote</h2>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-sm text-ibge-blue dark:text-ibge-light-blue hover:text-ibge-blue/80 dark:hover:text-ibge-light-blue/80 font-medium flex items-center gap-1 transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar Template CSV
        </button>
      </div>

      <div className="space-y-6">
        {step === 'upload' && (
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file 
                ? 'border-ibge-blue/30 dark:border-ibge-blue/50 bg-ibge-blue/5 dark:bg-ibge-blue/20' 
                : 'border-slate-300 dark:border-slate-700 hover:border-ibge-blue/50 dark:hover:border-ibge-blue/50 bg-slate-50 dark:bg-slate-800/50'
            }`}
          >
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileText className="w-10 h-10 text-ibge-blue" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <UploadCloud className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Apenas arquivos CSV ou TXT</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Procurar Arquivo
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-ibge-blue dark:text-ibge-light-blue uppercase tracking-wider mb-2">Mapeamento de Colunas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Latitude</label>
                <select 
                  value={mapping.lat}
                  onChange={(e) => setMapping({...mapping, lat: e.target.value})}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-ibge-blue outline-none"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Longitude</label>
                <select 
                  value={mapping.lon}
                  onChange={(e) => setMapping({...mapping, lon: e.target.value})}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-ibge-blue outline-none"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Altitude (h)</label>
                <select 
                  value={mapping.h}
                  onChange={(e) => setMapping({...mapping, h: e.target.value})}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-ibge-blue outline-none"
                >
                  <option value="">Pular / Não usar</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              * Identificamos {parsedData.length} linhas prontas para conversão.
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-6 bg-ibge-blue/5 dark:bg-ibge-blue/20 rounded-xl border border-ibge-blue/10 dark:border-ibge-blue/30 transition-colors">
            <div className="flex justify-between text-sm font-medium text-ibge-blue dark:text-ibge-light-blue mb-3">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando {stats.valid} pontos...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-ibge-blue/10 dark:bg-ibge-blue/20 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-ibge-blue dark:bg-ibge-light-blue h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {stats.ignored > 0 && (
              <p className="text-xs text-ibge-blue dark:text-ibge-light-blue mt-3 font-medium">
                * {stats.ignored} pontos ignorados (fora do Brasil)
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-lg text-sm transition-colors">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {step === 'mapping' && (
          <button
            onClick={() => setStep('upload')}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Voltar
          </button>
        )}
        
        <button
          onClick={step === 'upload' ? parseFile : processFile}
          disabled={!file || loading}
          className="flex-[2] bg-ibge-blue hover:bg-ibge-blue/90 dark:bg-ibge-blue dark:hover:bg-ibge-blue/80 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            step === 'upload' ? 'Ler Arquivo' : 'Processar Agora'
          )}
        </button>
      </div>
    </div>
  );
}

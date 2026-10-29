import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';
import { getPontosBatch, HgeoResult } from '../lib/api';
import { isValidCoordinate } from '../lib/validation';
import { orthometricHeight, parseFatorConversao } from '../lib/geodesy';
import { reverseGeocode } from '../lib/geocoding';
import { downloadText } from '../lib/export';

export function BatchUpload({ onBatchResult }: { onBatchResult: (results: HgeoResult[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ lat: '', lon: '', h: '' });
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [stats, setStats] = useState({ valid: 0, ignored: 0, failed: 0 });
  const [seekAddresses, setSeekAddresses] = useState(false);
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
    setStats({ valid: 0, ignored: 0, failed: 0 });

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

    setStats({ valid: validPoints.length, ignored: ignoredCount, failed: 0 });

    if (validPoints.length === 0) {
      setError(`Nenhum ponto válido na área de cobertura do Brasil. ${ignoredCount > 0 ? `(${ignoredCount} pontos ignorados)` : ''}`);
      setLoading(false);
      setStep('mapping');
      return;
    }

    const processedResults: HgeoResult[] = [];
    let completed = 0;
    let failed = 0;

    // Modelo geoidal em lote: uma única chamada ao /pontos do IBGE por ~200 pontos
    // (o ponto-a-ponto com intervalo de 1 s inviabilizava arquivos grandes)
    const BATCH_SIZE = 200;
    for (let i = 0; i < validPoints.length; i += BATCH_SIZE) {
      const chunk = validPoints.slice(i, i + BATCH_SIZE);
      try {
        const batch = await getPontosBatch(chunk.map(p => ({ lat: p.lat, lon: p.lon })));
        const count = Math.min(batch.length, chunk.length);
        for (let j = 0; j < count; j++) {
          const res = batch[j];
          const point = chunk[j];
          if (parseFatorConversao(res.fator_conversao) === null) {
            failed++; // "fora_grid": ponto fora da grade do modelo geoidal
            continue;
          }
          if (point.h !== undefined) {
            res.h = point.h;
            const N = parseFatorConversao(res.fator_conversao);
            if (N !== null) res.H = orthometricHeight(point.h, N);
          }
          processedResults.push(res);
        }
      } catch (err) {
        console.error('Erro na consulta em lote ao IBGE:', err);
        failed += chunk.length;
      }

      completed += chunk.length;
      setProgress(Math.round((completed / validPoints.length) * 100));
      if (i + BATCH_SIZE < validPoints.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Endereços (Nominatim) são opcionais: ~1 req/s, limitado aos 100 primeiros
    if (seekAddresses) {
      const limit = Math.min(processedResults.length, 100);
      for (let i = 0; i < limit; i++) {
        const res = processedResults[i];
        const addr = await reverseGeocode(parseFloat(res.lat), parseFloat(res.long));
        if (addr) res.address = addr.displayName;
      }
    }

    setStats(s => ({ ...s, failed }));
    if (processedResults.length === 0) {
      setError('Nenhum ponto retornou ondulação geoidal (fora da grade do modelo hgeoHNOR ou erro na consulta).');
    }
    onBatchResult(processedResults);
    setLoading(false);
  };

  const downloadTemplate = () => {
    downloadText('lat,lon\n-23.5505,-46.6333\n-22.9068,-43.1729', 'template_pontos.csv', 'text/csv;charset=utf-8;');
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

            <label className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={seekAddresses}
                onChange={e => setSeekAddresses(e.target.checked)}
                className="mt-0.5 accent-ibge-blue"
              />
              <span>
                Buscar endereços aproximados (Nominatim/OSM). Opcional e lento (~1 ponto/s, até 100 pontos) — a
                ondulação geoidal N não depende disso.
              </span>
            </label>
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
            {stats.failed > 0 && (
              <p className="text-xs text-ibge-gold mt-3 font-medium">
                * {stats.failed} pontos sem resultado (fora da grade do modelo geoidal ou erro na consulta)
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

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
  const [stats, setStats] = useState({ valid: 0, ignored: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    setError(null);
    setStats({ valid: 0, ignored: 0 });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        
        if (data.length === 0) {
          setError('O arquivo está vazio ou mal formatado.');
          setLoading(false);
          return;
        }

        const fields = results.meta.fields || [];
        const lowerFields = fields.map(f => f.toLowerCase().trim());
        
        const latIndex = lowerFields.findIndex(f => ['lat', 'latitude', 'y'].includes(f));
        const lonIndex = lowerFields.findIndex(f => ['lon', 'long', 'longitude', 'lng', 'x'].includes(f));
        const hIndex = lowerFields.findIndex(f => ['h', 'alt', 'altitude', 'elev', 'elevacao', 'z'].includes(f));

        if (latIndex === -1 || lonIndex === -1) {
          setError('Não foi possível identificar as colunas. Certifique-se de usar cabeçalhos como "lat" e "lon" ou "latitude" e "longitude".');
          setLoading(false);
          return;
        }

        const latKey = fields[latIndex];
        const lonKey = fields[lonIndex];
        const hKey = hIndex !== -1 ? fields[hIndex] : null;

        const validPoints: {lat: number, lon: number, h?: number}[] = [];
        let ignoredCount = 0;

        for (const row of data) {
          const lat = parseFloat(row[latKey]);
          const lon = parseFloat(row[lonKey]);
          let h: number | undefined = undefined;
          
          if (hKey && row[hKey]) {
            const parsedH = parseFloat(row[hKey]);
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
          return;
        }

        const processedResults: HgeoResult[] = [];
        let completed = 0;

        // Process in chunks to avoid overwhelming the API
        const chunkSize = 10;
        for (let i = 0; i < validPoints.length; i += chunkSize) {
          const chunk = validPoints.slice(i, i + chunkSize);
          
          const chunkPromises = chunk.map(async (point) => {
            try {
              const res = await getPontoDec(point.lat, point.lon);
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
      },
      error: (err) => {
        setError(`Erro ao ler arquivo: ${err.message}`);
        setLoading(false);
      }
    });
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
          <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Processamento em Lote</h2>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar Template CSV
        </button>
      </div>

      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          file 
            ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-900/20' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50'
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
            <FileText className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium mt-2 transition-colors"
            >
              Remover arquivo
            </button>
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

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-lg text-sm transition-colors">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 transition-colors">
          <div className="flex justify-between text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-3">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando {stats.valid} pontos...
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-indigo-200/50 dark:bg-indigo-800/50 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {stats.ignored > 0 && (
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-3 font-medium">
              * {stats.ignored} pontos ignorados (fora do Brasil)
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={processFile}
          disabled={!file}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          Processar Arquivo
        </button>
      )}
    </div>
  );
}

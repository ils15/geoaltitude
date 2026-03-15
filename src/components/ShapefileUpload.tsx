import React, { useState, useRef } from 'react';
import { Upload, FileCode, Loader2, X, FolderArchive } from 'lucide-react';
import shp from 'shpjs';
import { toast } from 'react-hot-toast';

interface ShapefileUploadProps {
  onShapefileLoaded: (geoJson: any) => void;
}

export function ShapefileUpload({ onShapefileLoaded }: ShapefileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.zip')) {
        toast.error('Por favor, selecione um arquivo .zip contendo o Shapefile.');
        return;
      }
      setFile(selected);
      await processShapefile(selected);
    }
  };

  const processShapefile = async (zipFile: File) => {
    setLoading(true);
    try {
      const buffer = await zipFile.arrayBuffer();
      const geoJson = await shp(buffer);
      onShapefileLoaded(geoJson);
      toast.success('Shapefile carregado com sucesso!');
    } catch (error) {
      console.error('Error processing shapefile:', error);
      toast.error('Erro ao processar o Shapefile. Verifique se o .zip contém os arquivos .shp, .dbf, etc.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-4">
        <FolderArchive className="w-5 h-5 text-ibge-gold" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sobrepor Shapefile</h2>
      </div>

      <div 
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
          file 
            ? 'border-ibge-gold/30 bg-ibge-gold/5 dark:bg-ibge-gold/10' 
            : 'border-slate-300 dark:border-slate-700 hover:border-ibge-gold/50 bg-slate-50 dark:bg-slate-800/50'
        } ${loading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input
          type="file"
          accept=".zip"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-ibge-gold animate-spin" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">Processando Shapefile...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-3">
            <FileCode className="w-10 h-10 text-ibge-gold" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                onShapefileLoaded(null);
              }}
              className="text-xs text-red-600 hover:text-red-700 font-bold mt-2 uppercase tracking-tight"
            >
              Remover Camada
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Clique para subir um Shapefile (.zip)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">O ZIP deve conter .shp, .shx, .dbf e .prj</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

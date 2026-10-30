import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { HgeoResult } from '../lib/api';
import { downloadReport } from '../lib/report';
import { toast } from 'react-hot-toast';

export function ReportButton({ results }: { results: HgeoResult[]; elementId?: string }) {
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    try {
      downloadReport(results);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-1.5 bg-ibge-blue dark:bg-ibge-blue text-white hover:bg-ibge-blue/90 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer shadow-md shadow-ibge-blue/20 active:scale-95 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      <span>Gerar Relatório</span>
    </button>
  );
}

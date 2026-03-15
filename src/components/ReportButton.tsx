import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FileText, Loader2, Download } from 'lucide-react';
import { HgeoResult } from '../lib/api';
import { toast } from 'react-hot-toast';

export function ReportButton({ results, elementId }: { results: HgeoResult[], elementId: string }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Add Header
      pdf.setFontSize(22);
      pdf.setTextColor(79, 70, 229); // indigo-600
      pdf.text('Relatório GeoAlt', 20, 20);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
      pdf.text(`Total de Pontos: ${results.length}`, 20, 35);
      
      pdf.addImage(imgData, 'PNG', 0, 45, pdfWidth, pdfHeight);
      
      // Add Footer
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(8);
      pdf.text('Gerado por GeoAlt - Inteligência de Localização', pdfWidth / 2, pageHeight - 10, { align: 'center' });
      
      toast.success('Relatório PDF gerado com sucesso!');
      pdf.save(`relatorio_geoalt_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-1.5 bg-ibge-blue dark:bg-ibge-blue text-white hover:bg-ibge-blue/90 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer shadow-md shadow-ibge-blue/20 active:scale-95 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      <span>Gerar Relatório</span>
    </button>
  );
}

/**
 * Relatório técnico em PDF gerado programaticamente (jsPDF puro, sem
 * screenshot de DOM — imune ao problema oklch do Tailwind v4).
 */
import { jsPDF } from 'jspdf';
import type { HgeoResult } from './api';
import { parseFatorConversao } from './geodesy';

const MARGIN = 15;
const BLUE: [number, number, number] = [0, 74, 142];
const GREEN: [number, number, number] = [0, 168, 89];
const GRAY: [number, number, number] = [100, 116, 139];

export function generateReport(results: HgeoResult[]): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;

  // ===== Capa / cabeçalho =====
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, pageW, 34, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('OpenGeoaltitude · Relatório de Conversão Altimétrica', MARGIN, 16);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('modelos hgeoHNOR (IBGE) e globais · H = h − N', MARGIN, 24);
  pdf.setTextColor(...GRAY);
  pdf.setFontSize(9);
  const models = [...new Set(results.map((r) => r.modelo).filter(Boolean))].join(', ');
  pdf.text(`Data: ${new Date().toLocaleString('pt-BR')}`, MARGIN, 42);
  pdf.text(`Total de pontos: ${results.length}`, MARGIN, 48);
  if (models) pdf.text(`Modelo(s): ${models}`, MARGIN, 54);
  const withDem = results.filter((r) => r.h_estimada === 'DEM').length;
  if (withDem > 0) pdf.text(`Altitudes estimadas por DEM: ${withDem} ponto(s)`, MARGIN, 60);

  // ===== Resumo (quando houver H) =====
  const hs = results.filter((r): r is HgeoResult & { H: number } => r.H !== undefined).map((r) => r.H);
  let y = withDem > 0 ? 70 : 64;
  if (hs.length > 0) {
    const min = Math.min(...hs);
    const max = Math.max(...hs);
    const avg = hs.reduce((a, b) => a + b, 0) / hs.length;
    pdf.setDrawColor(...GRAY);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(MARGIN, y, contentW, 18, 2, 2, 'FD');
    pdf.setTextColor(...GREEN);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`H média: ${avg.toFixed(2)} m`, MARGIN + 6, y + 7);
    pdf.text(`H mín: ${min.toFixed(2)} m`, MARGIN + 70, y + 7);
    pdf.text(`H máx: ${max.toFixed(2)} m`, MARGIN + 134, y + 7);
    pdf.setTextColor(...GRAY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Altitudes ortométricas referidas ao RN2015 (Imbituba), realização REALT-2018.', MARGIN + 6, y + 14);
    y += 26;
  } else {
    y += 4;
  }

  // ===== Tabela de pontos =====
  pdf.setTextColor(0, 0, 0);
  const cols = ['#', 'Lat (dec)', 'Lon (dec)', 'h (m)', 'N (m)', 'H (m)'];
  const colX = [MARGIN, MARGIN + 10, MARGIN + 46, MARGIN + 82, MARGIN + 108, MARGIN + 134];
  const drawHeader = () => {
    pdf.setFillColor(...BLUE);
    pdf.rect(MARGIN, y, contentW, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    cols.forEach((c, i) => pdf.text(c, colX[i] + 1, y + 5));
    y += 9;
  };
  drawHeader();

  pdf.setFont('helvetica', 'normal');
  results.forEach((r, i) => {
    if (y > pageH - 18) {
      pdf.addPage();
      y = MARGIN;
      drawHeader();
      pdf.setFont('helvetica', 'normal');
    }
    if (i % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, y - 4, contentW, 6, 'F');
    }
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(7.5);
    const N = parseFatorConversao(r.fator_conversao);
    const hTxt = r.h !== undefined ? r.h.toFixed(2) : '-';
    const nTxt = N !== null ? N.toFixed(2) : String(r.fator_conversao);
    const hEstTxt = r.h_estimada === 'DEM' ? '*' : '';
    const row = [
      String(i + 1),
      Number(r.lat).toFixed(6),
      Number(r.long).toFixed(6),
      hTxt + hEstTxt,
      nTxt,
      r.H !== undefined ? r.H.toFixed(2) : '-',
    ];
    row.forEach((cell, c) => pdf.text(cell, colX[c] + 1, y));
    y += 6;
  });

  if (results.some((r) => r.h_estimada === 'DEM')) {
    if (y > pageH - 14) {
      pdf.addPage();
      y = MARGIN;
    }
    pdf.setFontSize(7.5);
    pdf.setTextColor(...GRAY);
    pdf.text('* altitude elipsoidal estimada pelo DEM Copernicus GLO-90 (não medida por GNSS).', MARGIN, y);
  }

  // ===== Rodapé em todas as páginas =====
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7.5);
    pdf.setTextColor(...GRAY);
    pdf.text(
      `Gerado por OpenGeoaltitude em ${new Date().toLocaleDateString('pt-BR')} · ils15.github.io/geoaltitude`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }
  return pdf;
}

export function downloadReport(results: HgeoResult[]) {
  const pdf = generateReport(results);
  pdf.save(`relatorio_geoalt_${Date.now()}.pdf`);
}

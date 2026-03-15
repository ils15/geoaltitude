import { HgeoResult } from './api';

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(points: HgeoResult[]) {
  const hasH = points.some(p => p.h !== undefined);
  const header = hasH ? 'lat,lon,h,N,H' : 'lat,lon,fator_conversao';
  const csv = [header];
  points.forEach(p => {
    if (hasH) {
      csv.push(`${p.lat},${p.long},${p.h ?? ''},${p.fator_conversao},${p.H ?? ''}`);
    } else {
      csv.push(`${p.lat},${p.long},${p.fator_conversao}`);
    }
  });
  download(csv.join('\n'), 'geoalt_export.csv', 'text/csv');
}

export function exportKML(points: HgeoResult[]) {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GeoAlt Export</name>
    ${points.map((p, i) => `
    <Placemark>
      <name>Ponto ${i + 1}</name>
      <description>
        Ondulação Geoidal (N): ${p.fator_conversao}m
        ${p.h !== undefined ? `\nAltitude Geométrica (h): ${p.h}m` : ''}
        ${p.H !== undefined ? `\nAltitude Ortométrica (H): ${p.H}m` : ''}
      </description>
      <Point>
        <coordinates>${p.long},${p.lat},${p.H !== undefined ? p.H : 0}</coordinates>
      </Point>
    </Placemark>`).join('')}
  </Document>
</kml>`;
  download(kml, 'geoalt_export.kml', 'application/vnd.google-earth.kml+xml');
}

export function exportDXF(points: HgeoResult[]) {
  let dxf = `  0\nSECTION\n  2\nENTITIES\n`;
  points.forEach(p => {
    const z = p.H !== undefined ? p.H : p.fator_conversao;
    dxf += `  0\nPOINT\n  8\n0\n 10\n${p.long}\n 20\n${p.lat}\n 30\n${z}\n`;
  });
  dxf += `  0\nENDSEC\n  0\nEOF\n`;
  download(dxf, 'geoalt_export.dxf', 'application/dxf');
}

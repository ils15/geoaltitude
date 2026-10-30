import { HgeoResult } from './api';
import { geographicToUTM, lonToUtmZone, orthometricHeight, parseFatorConversao } from './geodesy';

export function downloadText(content: string, filename: string, type: string) {
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
  const hasH = points.some((p) => p.h !== undefined);
  const header = hasH ? 'lat,lon,h,N,H' : 'lat,lon,fator_conversao';
  const csv = [header];
  points.forEach((p) => {
    if (hasH) {
      csv.push(`${p.lat},${p.long},${p.h ?? ''},${p.fator_conversao},${p.H ?? ''}`);
    } else {
      csv.push(`${p.lat},${p.long},${p.fator_conversao}`);
    }
  });
  downloadText(csv.join('\n'), 'geoalt_export.csv', 'text/csv');
}

export function exportKML(points: HgeoResult[]) {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GeoAlt Export</name>
    ${points
      .map(
        (p, i) => `
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
    </Placemark>`
      )
      .join('')}
  </Document>
</kml>`;
  downloadText(kml, 'geoalt_export.kml', 'application/vnd.google-earth.kml+xml');
}

/**
 * DXF em coordenadas projetadas (UTM), utilizável em CAD.
 * Todos os pontos são convertidos para o fuso do centroide para evitar
 * emenda de fuso dentro do mesmo desenho. Z = H (ortométrica) quando
 * disponível; caso contrário h − N, ou h.
 */
export function exportDXF(points: HgeoResult[], options?: { withLabels?: boolean; withRoute?: boolean }) {
  const { withLabels = true, withRoute = true } = options ?? {};
  const parsed = points
    .map((p) => ({ lat: parseFloat(p.lat), lon: parseFloat(p.long), point: p }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (parsed.length === 0) return;

  const centerLon = parsed.reduce((acc, p) => acc + p.lon, 0) / parsed.length;
  const zone = lonToUtmZone(centerLon);

  const projected = parsed.map(({ lat, lon, point }, index) => {
    const utm = geographicToUTM(lat, lon);
    const N = parseFatorConversao(point.fator_conversao);
    const z =
      point.H !== undefined
        ? point.H
        : point.h !== undefined && N !== null
          ? orthometricHeight(point.h, N)
          : (point.h ?? 0);
    return { ...utm, z, name: `P${index + 1}` };
  });

  let dxf = `999\nGeoAlt - UTM fuso ${zone} (datum SIRGAS2000/WGS84) - Z ortometrica (H) quando disponivel\n`;
  dxf += `  0\nSECTION\n  2\nENTITIES\n`;

  projected.forEach((p) => {
    dxf += `  0\nPOINT\n  8\nGEOALT_PONTOS\n 10\n${p.easting.toFixed(3)}\n 20\n${p.northing.toFixed(3)}\n 30\n${p.z.toFixed(3)}\n`;
    if (withLabels) {
      dxf += `  0\nTEXT\n  8\nGEOALT_ROTULOS\n 10\n${(p.easting + 3).toFixed(3)}\n 20\n${p.northing.toFixed(3)}\n 30\n0\n 40\n1.5\n  1\n${p.name}\n`;
    }
  });

  if (withRoute && projected.length > 1) {
    dxf += `  0\nLWPOLYLINE\n  8\nGEOALT_ROTA\n  6\nDASHED\n 90\n${projected.length}\n 70\n0\n`;
    for (const p of projected) {
      dxf += ` 10\n${p.easting.toFixed(3)}\n 20\n${p.northing.toFixed(3)}\n`;
    }
  }

  dxf += `  0\nENDSEC\n  0\nEOF\n`;
  downloadText(dxf, `geoalt_export_utm${zone}.dxf`, 'application/dxf');
}

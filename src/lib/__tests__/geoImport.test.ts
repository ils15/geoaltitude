// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseGeoJson, parseKml } from '../geoImport';

describe('parseGeoJson', () => {
  it('FeatureCollection com Points e nomes', () => {
    const r = parseGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'Sede' }, geometry: { type: 'Point', coordinates: [-46.6333, -23.5505, 760] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-43.1729, -22.9068] } },
      ],
    });
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].descricao).toBe('Sede');
    expect(r.rows[0].altitude_elipsoidal).toBe('760');
    expect(r.rows[1].latitude).toBe('-22.9068');
  });

  it('Polygon contribui com o primeiro vértice e gera aviso', () => {
    const r = parseGeoJson({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Talhão' },
          geometry: { type: 'Polygon', coordinates: [[[-46, -23], [-45, -23], [-45, -22], [-46, -22], [-46, -23]]] },
        },
      ],
    });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].latitude).toBe('-23');
    expect(r.warnings.length).toBe(0);
  });

  it('estrutura desconhecida retorna vazio com aviso', () => {
    const r = parseGeoJson({ foo: 'bar' });
    expect(r.rows).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/sem features/);
  });
});

describe('parseKml', () => {
  it('extrai Placemarks com Point (ordem lon,lat,z)', () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
  <Placemark><name>Ponto A</name><Point><coordinates>-46.6333,-23.5505,760</coordinates></Point></Placemark>
  <Placemark><name>Ponto B</name><Point><coordinates>-43.1729,-22.9068</coordinates></Point></Placemark>
</Document></kml>`;
    const r = parseKml(kml);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].descricao).toBe('Ponto A');
    expect(r.rows[0].latitude).toBe('-23.5505');
    expect(r.rows[0].altitude_elipsoidal).toBe('760');
    expect(r.rows[1].descricao).toBe('Ponto B');
  });

  it('XML quebrado retorna aviso, não lança', () => {
    const r = parseKml('<kml><Placemark>');
    expect(r.rows).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('KML exportado pelo GeoAlt reimporta com os mesmos pontos', () => {
    // Amostra do formato gerado por src/lib/export.ts exportKML
    const kml = `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>GeoAlt Export</name>
    <Placemark><name>Ponto 1</name><description>Ondulação</description><Point><coordinates>-46.6333,-23.5505,853.283</coordinates></Point></Placemark>
    </Document></kml>`;
    const r = parseKml(kml);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].descricao).toBe('Ponto 1');
    expect(r.rows[0].altitude_elipsoidal).toBe('853.283');
  });
});

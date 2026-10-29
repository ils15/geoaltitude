import { describe, it, expect } from 'vitest';
import {
  gmsToDec,
  decToDms,
  parseDmsString,
  geographicToUTM,
  utmToGeographic,
  formatUTM,
  lonToUtmZone,
  transformDatum,
  geodeticToEcef,
  ecefToGeodeticCoords,
  orthometricHeight,
  ellipsoidalHeight,
  parseFatorConversao,
  convertLength,
  haversineDistance,
  polylineLength,
  polygonArea,
  degreesToMeters,
  projectLocalEN,
  GRS80,
  WGS84,
} from '../geodesy';

/**
 * Vetores de referência gerados com PROJ 9 (pyproj 3.7):
 *  - EPSG:327xx (WGS84/UTM) e EPSG:319xx (SIRGAS2000/UTM, fuso 18S–25S);
 *  - EPSG:15485 (SAD69(96) → SIRGAS2000, Helmert -67.35/3.88/-38.22).
 * Valores em metros com 4 casas decimais.
 */
const UTM_WGS84_VECTORS: Array<{ name: string; lat: number; lon: number; zone: number; hemi: 'N' | 'S'; E: number; N: number }> = [
  { name: 'Brasília', lat: -15.7939, lon: -47.8828, zone: 23, hemi: 'S', E: 191138.7431, N: 8251745.9056 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, zone: 23, hemi: 'S', E: 687394.5933, N: 7465634.1277 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, zone: 23, hemi: 'S', E: 333287.9151, N: 7394588.3186 },
  { name: 'Recife', lat: -8.0476, lon: -34.877, zone: 25, hemi: 'S', E: 293144.3963, N: 9109965.4171 },
  { name: 'Salvador', lat: -12.9777, lon: -38.5016, zone: 24, hemi: 'S', E: 554052.6134, N: 8565277.5522 },
  { name: 'Porto Alegre', lat: -30.0346, lon: -51.2177, zone: 22, hemi: 'S', E: 479010.601, N: 6677360.7184 },
  { name: 'Manaus', lat: -3.119, lon: -60.0217, zone: 20, hemi: 'S', E: 831071.8223, N: 9654784.8641 },
  { name: 'Belém', lat: -1.4558, lon: -48.4902, zone: 22, hemi: 'S', E: 779278.1747, N: 9838934.5337 },
  { name: 'Equador/Primeiro Meridiano', lat: 0.0, lon: 0.0, zone: 31, hemi: 'N', E: 166021.4431, N: 0 },
  { name: 'Meridiano central fuso 31', lat: 0.0, lon: 3.0, zone: 31, hemi: 'N', E: 500000, N: 0 },
  { name: 'MC fuso 23 a 20°S', lat: -20.0, lon: -45.0, zone: 23, hemi: 'S', E: 500000, N: 7788518.6923 },
  { name: 'White House (N)', lat: 38.8977, lon: -77.0365, zone: 18, hemi: 'N', E: 323394.2964, N: 4307395.6338 },
  { name: 'Fronteira fusos 22/23 (-48°)', lat: -20.0, lon: -48.0, zone: 23, hemi: 'S', E: 186073.6796, N: 7785705.9737 },
  { name: 'Malha teste P1', lat: -22.9414, lon: -43.887, zone: 23, hemi: 'S', E: 614116.148, N: 7462535.1426 },
  { name: 'Malha teste P10', lat: -23.0051, lon: -44.1961, zone: 23, hemi: 'S', E: 582383.6944, N: 7455689.787 },
];

describe('UTM — valores absolutos vs PROJ (série de Krüger, WGS84)', () => {
  it.each(UTM_WGS84_VECTORS)('$name → fuso $zone$hemi', ({ lat, lon, zone, hemi, E, N }) => {
    const utm = geographicToUTM(lat, lon);
    expect(utm.zone).toBe(zone);
    expect(utm.hemisphere).toBe(hemi);
    expect(utm.easting).toBeCloseTo(E, 1); // 0,05 m
    expect(utm.northing).toBeCloseTo(N, 1);
  });

  it('ponto no meridiano central tem easting exatamente 500000', () => {
    expect(geographicToUTM(-20, -45).easting).toBeCloseTo(500000, 3);
    expect(geographicToUTM(0, 3).easting).toBeCloseTo(500000, 3);
  });

  it('SIRGAS2000 (GRS80) coincide com WGS84/UTM dentro de 1 mm no Brasil', () => {
    const casos: Array<[number, number, number, number]> = [
      [-15.7939, -47.8828, 191138.7431, 8251745.9057],
      [-30.0346, -51.2177, 479010.601, 6677360.7185],
      [-22.9414, -43.887, 614116.148, 7462535.1427],
    ];
    for (const [lat, lon, E, N] of casos) {
      const utm = geographicToUTM(lat, lon, GRS80);
      expect(utm.easting).toBeCloseTo(E, 1);
      expect(utm.northing).toBeCloseTo(N, 1);
    }
  });

  it('inversa: UTM → geográfica bate com PROJ a 0,5 mm', () => {
    const geo = utmToGeographic({ zone: 23, hemisphere: 'S', easting: 333287.9151, northing: 7394588.3186 });
    expect(geo.lat).toBeCloseTo(-23.5505, 8); // ~0,11 mm
    expect(geo.lon).toBeCloseTo(-46.6333, 8);
  });
});

describe('UTM — ida e volta (round-trip) numa grade ampla', () => {
  const grid: Array<[number, number]> = [];
  for (let lat = -33.75; lat <= 5.25; lat += 1.75) {
    for (let lon = -73.75; lon <= -32.5; lon += 2.05) {
      grid.push([lat, lon]);
    }
  }
  // Casos de borda: hemisfério, equador, limites de fuso
  grid.push([0, -45], [0.0001, -45], [-0.0001, -45], [-20, -48.0000001], [-20, -42.0000001], [45, -70], [-33.74, -73.74]);

  it.each(grid.map(p => [`${p[0].toFixed(4)}, ${p[1].toFixed(4)}`, p[0], p[1]]))(
    'round-trip %s° mantém coordenada a 0,5 mm',
    (_label, lat, lon) => {
      const utm = geographicToUTM(lat, lon);
      const geo = utmToGeographic(utm);
      const expected = geographicToUTM(geo.lat, geo.lon);
      expect(expected.easting - utm.easting, 'Δ easting (m)').toBeCloseTo(0, 1);
      expect(expected.northing - utm.northing, 'Δ northing (m)').toBeCloseTo(0, 1);
    }
  );
});

describe('UTM — fuso e formatação', () => {
  it('limite de fuso: -48° vai para o fuso 23, -48.001 para o 22', () => {
    expect(lonToUtmZone(-48)).toBe(23);
    expect(lonToUtmZone(-48.001)).toBe(22);
    expect(lonToUtmZone(-45)).toBe(23);
    expect(lonToUtmZone(180)).toBe(1); // 180° envolve para -180°
  });

  it('formatUTM produz rótulo 23S com E/N', () => {
    const text = formatUTM({ zone: 23, hemisphere: 'S', easting: 333287.9151, northing: 7394588.3186 });
    expect(text).toMatch(/^23S E 333287\.92 N 7394588\.32$/);
  });

  it('rejeita easting/northing fora do fuso', () => {
    expect(() => utmToGeographic({ zone: 23, hemisphere: 'S', easting: 50, northing: 7394588 })).toThrow();
    expect(() => utmToGeographic({ zone: 23, hemisphere: 'S', easting: 333287, northing: 11000000 })).toThrow();
  });
});

describe('GMS ↔ graus decimais', () => {
  it('gmsToDec converte com sinal nos graus', () => {
    expect(gmsToDec(-22, 54, 28.9)).toBeCloseTo(-22.90802778, 8);
    expect(gmsToDec(47, 52, 47.9)).toBeCloseTo(47.87997, 5);
    expect(gmsToDec(-47, 52, 47.9)).toBeCloseTo(-47.87997, 5);
  });

  it('gmsToDec valida minutos/segundos', () => {
    expect(() => gmsToDec(-22, 60, 0)).toThrow();
    expect(() => gmsToDec(-22, 54, 60)).toThrow();
    expect(() => gmsToDec(-22, -1, 0)).toThrow();
    expect(() => gmsToDec(NaN, 0, 0)).toThrow();
  });

  it('decToDms formata com hemisfério e propaga arredondamento (59.99" → 1\'00")', () => {
    expect(decToDms(-22.90802778, true)).toBe('22° 54\' 28.90" S');
    expect(decToDms(-43.1729, false)).toBe('43° 10\' 22.44" W');
    // 22° 54' 59.999" não pode virar "59.99 → 60.00\""
    expect(decToDms(gmsToDec(-22, 54, 59.999), true)).toBe('22° 55\' 00.00" S');
  });

  it('parseDmsString aceita formatos comuns no Brasil', () => {
    expect(parseDmsString('-22.908')).toBeCloseTo(-22.908, 9);
    expect(parseDmsString('-22,908')).toBeCloseTo(-22.908, 9);
    expect(parseDmsString('-22° 54\' 28.9"')).toBeCloseTo(-22.90802778, 8);
    expect(parseDmsString('22°54\'28,9"S')).toBeCloseTo(-22.90802778, 8);
    expect(parseDmsString('22 54 28.9 S')).toBeCloseTo(-22.90802778, 8);
    expect(parseDmsString('22°54\'28,9" O')).toBeCloseTo(-22.90802778, 8); // Oeste
    expect(parseDmsString('47° 52\' 47.9\'\' W')).toBeCloseTo(-47.87997, 5);
    expect(parseDmsString('N 12 30 00')).toBeCloseTo(12.5, 9);
    expect(() => parseDmsString('abc')).toThrow();
    expect(() => parseDmsString('')).toThrow();
  });

  it('round-trip: formatar e re-interpretar preserva a coordenada a 0,005"', () => {
    const valores = [-22.90802778, -43.1729, 47.87997, -15.7939, 0.5, -33.74999];
    for (const v of valores) {
      const roundTrip = parseDmsString(decToDms(v, Math.abs(v) <= 90));
      expect(roundTrip).toBeCloseTo(v, 5); // 0,005" ≈ 1,4·10⁻⁶°
    }
  });
});

describe('Altimetria h / N / H', () => {
  it('H = h − N e h = H + N', () => {
    expect(orthometricHeight(1000, -2.5)).toBeCloseTo(1002.5, 12);
    expect(ellipsoidalHeight(1002.5, -2.5)).toBeCloseTo(1000, 12);
  });

  it('parseFatorConversao normaliza number/string do IBGE', () => {
    expect(parseFatorConversao(-2.5)).toBe(-2.5);
    expect(parseFatorConversao('-2.5')).toBe(-2.5);
    expect(parseFatorConversao('-2,5')).toBe(-2.5);
    expect(parseFatorConversao(' 1.23 ')).toBe(1.23);
    expect(parseFatorConversao('')).toBeNull();
    expect(parseFatorConversao('abc')).toBeNull();
    expect(parseFatorConversao(null)).toBeNull();
    expect(parseFatorConversao(undefined)).toBeNull();
    expect(parseFatorConversao(NaN)).toBeNull();
  });
});

describe('Unidades de comprimento', () => {
  it('fatores exatos', () => {
    expect(convertLength(1, 'm', 'ft')).toBeCloseTo(1 / 0.3048, 12);
    expect(convertLength(1, 'ft', 'm')).toBeCloseTo(0.3048, 12);
    expect(convertLength(1, 'km', 'm')).toBe(1000);
    expect(convertLength(1, 'mi', 'km')).toBeCloseTo(1.609344, 9);
    // pé americano (survey) é ~2 ppm maior que o internacional
    expect(convertLength(1000, 'ftUS', 'ft')).toBeGreaterThan(1000);
    expect(convertLength(1000, 'ftUS', 'ft')).toBeCloseTo(1000.002, 6);
  });

  it('conversão ida-volta é identidade', () => {
    for (const unit of ['m', 'km', 'ft', 'ftUS', 'mi'] as const) {
      expect(convertLength(convertLength(123.456, 'm', unit), unit, 'm')).toBeCloseTo(123.456, 9);
    }
  });
});

describe('Datum: SAD69(96) → SIRGAS2000 (vetores PROJ/EPSG:15485)', () => {
  const vectors: Array<[number, number, number, number]> = [
    [-15.7939, -47.8828, -15.794347723, -47.883241993],
    [-22.9068, -43.1729, -22.907296032, -43.173321585],
    [-23.5505, -46.6333, -23.550989446, -46.633753445],
    [-8.0476, -34.877, -8.048013443, -34.877320501],
    [-30.0346, -51.2177, -30.035097972, -51.218219128],
  ];

  it.each(vectors.map(v => [`(${v[0]}, ${v[1]})`, v[0], v[1], v[2], v[3]]))(
    'transforma %s com Helmert oficial do IBGE',
    (_label, lat, lon, latOut, lonOut) => {
      const result = transformDatum(lat, lon, 'SAD69_96', 'SIRGAS2000');
      expect(result.lat).toBeCloseTo(latOut, 7); // ~1 cm
      expect(result.lon).toBeCloseTo(lonOut, 7);
    }
  );

  it('inversa volta ao original (~1 cm)', () => {
    const forward = transformDatum(-23.5505, -46.6333, 'SAD69_96', 'SIRGAS2000');
    const back = transformDatum(forward.lat, forward.lon, 'SIRGAS2000', 'SAD69_96');
    expect(back.lat).toBeCloseTo(-23.5505, 6);
    expect(back.lon).toBeCloseTo(-46.6333, 6);
  });

  it('WGS84 ↔ SIRGAS2000 é transformação nula (equivalentes a cm)', () => {
    const r = transformDatum(-22.9, -43.2, 'WGS84', 'SIRGAS2000');
    expect(r.lat).toBe(-22.9);
    expect(r.lon).toBe(-43.2);
    expect(transformDatum(-22.9, -43.2, 'SIRGAS2000', 'SIRGAS2000').lat).toBe(-22.9);
  });
});

describe('Datum: SAD69 clássico → SIRGAS2000 (parâmetros clássicos −57/+1/−41)', () => {
  // Vetores gerados com pyproj (cart no elipsoide sul-americano + Helmert
  // clássico + cart⁻¹ no GRS80); componentes identificados por magnitude.
  const vectors: Array<[number, number, number, number]> = [
    [-23.5505, -46.6333, -23.550979262, -46.63369912],
    [-15.7939, -47.8828, -15.794349569, -47.883188364],
    [-8.0476, -34.877, -8.048025498, -34.877288244],
  ];

  it.each(vectors.map(v => [`(${v[0]}, ${v[1]})`, v[0], v[1], v[2], v[3]]))(
    'transforma %s com o Helmert clássico',
    (_label, lat, lon, latOut, lonOut) => {
      const result = transformDatum(lat, lon, 'SAD69_CLASSICO', 'SIRGAS2000');
      expect(result.lat).toBeCloseTo(latOut, 7);
      expect(result.lon).toBeCloseTo(lonOut, 7);
    }
  );

  it('inversa volta ao original (~1 cm)', () => {
    const forward = transformDatum(-23.5505, -46.6333, 'SAD69_CLASSICO', 'SIRGAS2000');
    const back = transformDatum(forward.lat, forward.lon, 'SIRGAS2000', 'SAD69_CLASSICO');
    expect(back.lat).toBeCloseTo(-23.5505, 6);
    expect(back.lon).toBeCloseTo(-46.6333, 6);
  });
});

describe('ECEF (XYZ geocêntrico)', () => {
  // Vetores pyproj EPSG:4979 → EPSG:4978 (h = 0)
  const vetores: Array<[number, number, number, number, number]> = [
    [-23.5505, -46.6333, 4017003.1235, -4252810.1233, -2532724.1772],
    [0.0, 3.0, 6369395.9849, 333805.8989, 0.0],
    [38.8977, -77.0365, 1115026.1988, -4843785.0815, 3983484.7683],
  ];

  it.each(vetores.map(v => [`(${v[0]}, ${v[1]})`, v[0], v[1], v[2], v[3], v[4]]))(
    'geodésica → ECEF bate com PROJ: %s',
    (_label, lat, lon, x, y, z) => {
      const ecef = geodeticToEcef(lat, lon);
      expect(ecef.x).toBeCloseTo(x, 3); // 0,5 mm
      expect(ecef.y).toBeCloseTo(y, 3);
      expect(ecef.z).toBeCloseTo(z, 3);
    }
  );

  it('inversa ECEF → geodésica recupera a coordenada', () => {
    const geo = ecefToGeodeticCoords(4017003.1235, -4252810.1233, -2532724.1772);
    expect(geo.lat).toBeCloseTo(-23.5505, 8);
    expect(geo.lon).toBeCloseTo(-46.6333, 8);
    expect(geo.h).toBeCloseTo(0, 4);
  });

  it('round trip com altura preserva h', () => {
    const ecef = geodeticToEcef(-22, -43, undefined, 100);
    const geo = ecefToGeodeticCoords(ecef.x, ecef.y, ecef.z);
    expect(geo.lat).toBeCloseTo(-22, 9);
    expect(geo.lon).toBeCloseTo(-43, 9);
    expect(geo.h).toBeCloseTo(100, 6);
  });
});

describe('Medidas geodésicas', () => {
  it('Haversine: 1° no equador e arco meridiano de 90°', () => {
    const R = 6371008.8;
    const oneDegEquator = haversineDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(oneDegEquator).toBeCloseTo((R * Math.PI) / 180, 0); // ≈ 111 194,93 m
    const quarterMeridian = haversineDistance({ lat: 0, lon: 10 }, { lat: 90, lon: 10 });
    expect(quarterMeridian).toBeCloseTo((R * Math.PI) / 2, 0); // ≈ 10 007 543 m
    expect(haversineDistance({ lat: 10, lon: 20 }, { lat: 10, lon: 20 })).toBe(0);
  });

  it('Haversine Rio–São Paulo ≈ 361 km', () => {
    const d = haversineDistance({ lat: -22.9068, lon: -43.1729 }, { lat: -23.5505, lon: -46.6333 });
    expect(d / 1000).toBeGreaterThan(350);
    expect(d / 1000).toBeLessThan(370);
  });

  it('polylineLength soma segmentos', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 1 };
    const c = { lat: 0, lon: 2 };
    expect(polylineLength([a, b, c])).toBeCloseTo(
      haversineDistance(a, b) + haversineDistance(b, c), 6
    );
    expect(polylineLength([a])).toBe(0);
  });

  it('área geodésica: quadrado 1°×1° no equador = R²·Δλ·sin(Δφ)', () => {
    const R = 6371008.8;
    const expected = R * R * (Math.PI / 180) * Math.sin(Math.PI / 180);
    const area = polygonArea([
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
      { lat: 1, lon: 1 },
      { lat: 0, lon: 1 },
    ]);
    expect(area).toBeCloseTo(expected, 0); // ≈ 12 363 970 000 m²
    expect(polygonArea([{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }])).toBe(0);
  });

  it('degreesToMeters: 1° de latitude ≈ 110 946 m (raio meridiano), 1° de longitude < isso', () => {
    expect(degreesToMeters(1, 0, 'lat')).toBeGreaterThan(110000);
    expect(degreesToMeters(1, 0, 'lat')).toBeLessThan(111000);
    // A 60°: cos(60°)=0,5, mas o raio N(60°) > N(0°) — dá ≈ 55 800 m, um pouco
    // acima de metade do valor no equador (55 659,7 m)
    expect(degreesToMeters(1, 60, 'lon')).toBeGreaterThan(55790);
    expect(degreesToMeters(1, 60, 'lon')).toBeLessThan(55810);
    expect(degreesToMeters(1, 60, 'lon')).toBeLessThan(degreesToMeters(1, 0, 'lon'));
  });

  it('projectLocalEN usa raios de curvatura (não constantes de 111 km)', () => {
    const [p] = projectLocalEN([{ lat: -22.99, lon: -46.63 }], { lat: -23.0, lon: -46.63 });
    // 0,01° ao norte a 23°S ≈ 1 107,4 m (constante antiga: 1105,4 m)
    expect(p.northing).toBeGreaterThan(1106);
    expect(p.northing).toBeLessThan(1109);
    expect(p.easting).toBeCloseTo(0, 6);
  });
});

describe('Elipsoides', () => {
  it('WGS84 e GRS80 diferem apenas no achatamento (~1 cm em UTM)', () => {
    expect(WGS84.a).toBe(GRS80.a);
    expect(WGS84.f).not.toBe(GRS80.f);
  });
});

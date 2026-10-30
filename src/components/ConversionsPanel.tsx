import React, { useState } from 'react';
import { ArrowLeftRight, Globe2, Info, Loader2, Mountain, MoveHorizontal, Ruler, Search } from 'lucide-react';
import {
  DATUMS,
  DatumId,
  LengthUnit,
  convertLength,
  decToDms,
  ellipsoidalHeight,
  ecefToGeodeticCoords,
  formatUTM,
  geodeticToEcef,
  geographicToUTM,
  haversineDistance,
  orthometricHeight,
  parseDmsString,
  transformDatum,
  utmToGeographic,
  utmZoneCentralMeridian,
} from '../lib/geodesy';
import { GEOID_MODELS, GeoidModelId, fetchUndulation } from '../lib/geoidModels';
import { fetchTerrainElevation } from '../lib/openServices';
import { forwardGeocode, ForwardGeocodeResult } from '../lib/geocoding';
import { errorMessage } from '../lib/errors';
import { CopyChip } from './CopyChip';
import { gridGroundFactor, gridToGround, groundToGrid } from '../lib/gridGround';

const inputClass =
  'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

type SectionId = 'coordenadas' | 'altimetria' | 'datum' | 'medidas';

const SECTIONS: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
  { id: 'coordenadas', label: 'Coordenadas', icon: <Globe2 className="w-4 h-4" /> },
  { id: 'altimetria', label: 'Altimetria', icon: <Mountain className="w-4 h-4" /> },
  { id: 'datum', label: 'Datum', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'medidas', label: 'Medidas', icon: <MoveHorizontal className="w-4 h-4" /> },
];

function parseCoordinateInput(text: string): { value?: number; error?: string } {
  if (!text.trim()) return { error: 'Informe a coordenada (dec. ou GMS, ex.: -23.5505 ou "23° 33\' 1.8" S")' };
  try {
    return { value: parseDmsString(text) };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const v = parseFloat(text.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function ResultRow({
  label,
  value,
  mono = true,
  copyText,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyText?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400 pt-0.5 shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className={`text-sm font-semibold text-slate-900 dark:text-white text-right break-all ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </span>
        {copyText && <CopyChip text={copyText} label={`Copiar ${label.toLowerCase()}`} />}
      </span>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
      {message}
    </p>
  );
}

// ===== 1. Coordenadas ↔ UTM ↔ ECEF =====

function CoordinatesSection() {
  const [mode, setMode] = useState<'geo2utm' | 'utm2geo' | 'ecef'>('geo2utm');

  // Geográficas → UTM
  const [latText, setLatText] = useState('-23.5505');
  const [lonText, setLonText] = useState('-46.6333');
  const latParsed = parseCoordinateInput(latText);
  const lonParsed = parseCoordinateInput(lonText);
  const geoResult =
    latParsed.value !== undefined && lonParsed.value !== undefined
      ? (() => {
          try {
            return {
              ok: true as const,
              lat: latParsed.value,
              lon: lonParsed.value,
              utm: geographicToUTM(latParsed.value, lonParsed.value),
              ecef: geodeticToEcef(latParsed.value, lonParsed.value),
            };
          } catch (err) {
            return { ok: false as const, error: errorMessage(err) };
          }
        })()
      : null;

  // UTM → Geográficas
  const [zoneText, setZoneText] = useState('23');
  const [hemi, setHemi] = useState<'S' | 'N'>('S');
  const [eastingText, setEastingText] = useState('333287.92');
  const [northingText, setNorthingText] = useState('7394588.32');
  const zone = parseInt(zoneText, 10);
  const utmResult: { ok: true; lat: number; lon: number } | { ok: false; error: string } = (() => {
    if (!Number.isInteger(zone) || zone < 1 || zone > 60) return { ok: false, error: 'Fuso deve estar entre 1 e 60.' };
    const easting = parseNum(eastingText);
    const northing = parseNum(northingText);
    if (easting === null || northing === null) return { ok: false, error: 'Informe Easting e Northing em metros.' };
    try {
      const geo = utmToGeographic({ zone, hemisphere: hemi, easting, northing });
      return { ok: true, lat: geo.lat, lon: geo.lon };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  })();

  // ECEF → Geográficas
  const [xText, setXText] = useState('4017003.1235');
  const [yText, setYText] = useState('-4252810.1233');
  const [zText, setZText] = useState('-2532724.1772');
  const ecefResult: { ok: true; lat: number; lon: number; h: number } | { ok: false; error: string } = (() => {
    const x = parseNum(xText);
    const y = parseNum(yText);
    const z = parseNum(zText);
    if (x === null || y === null || z === null) return { ok: false, error: 'Informe X, Y e Z em metros.' };
    try {
      const geo = ecefToGeodeticCoords(x, y, z);
      return { ok: true, lat: geo.lat, lon: geo.lon, h: geo.h };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  })();

  const modeButton = (id: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      aria-pressed={mode === id}
      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
        mode === id
          ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-ibge-blue" />
          Coordenadas ↔ UTM ↔ ECEF
        </h3>
        <div
          className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap"
          role="group"
          aria-label="Modo de conversão de coordenadas"
        >
          {modeButton('geo2utm', 'Geográficas → UTM')}
          {modeButton('utm2geo', 'UTM → Geográficas')}
          {modeButton('ecef', 'ECEF → Geográficas')}
        </div>
      </div>

      {mode === 'geo2utm' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="conv-lat">
                Latitude
              </label>
              <input
                id="conv-lat"
                type="text"
                value={latText}
                onChange={(e) => setLatText(e.target.value)}
                className={inputClass}
                placeholder={'-23.5505 ou "23° 33\' 1.8" S"'}
              />
              {latParsed.error && <ErrorNote message={latParsed.error} />}
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-lon">
                Longitude
              </label>
              <input
                id="conv-lon"
                type="text"
                value={lonText}
                onChange={(e) => setLonText(e.target.value)}
                className={inputClass}
                placeholder={'-46.6333 ou "46° 37\' 59" O"'}
              />
              {lonParsed.error && <ErrorNote message={lonParsed.error} />}
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            {geoResult ? (
              !geoResult.ok ? (
                <ErrorNote message={geoResult.error} />
              ) : (
                <>
                  <ResultRow
                    label="Decimais"
                    value={`${geoResult.lat.toFixed(7)}°, ${geoResult.lon.toFixed(7)}°`}
                    copyText={`${geoResult.lat.toFixed(7)}, ${geoResult.lon.toFixed(7)}`}
                  />
                  <ResultRow
                    label="GMS"
                    value={`${decToDms(geoResult.lat, true)} / ${decToDms(geoResult.lon, false)}`}
                    copyText={`${decToDms(geoResult.lat, true)} / ${decToDms(geoResult.lon, false)}`}
                  />
                  <ResultRow
                    label="UTM (WGS84 ≈ SIRGAS2000)"
                    value={formatUTM(geoResult.utm, 3)}
                    copyText={formatUTM(geoResult.utm, 3)}
                  />
                  <ResultRow
                    label="Fuso / Meridiano central"
                    value={`${geoResult.utm.zone}${geoResult.utm.hemisphere} · MC ${utmZoneCentralMeridian(geoResult.utm.zone)}°`}
                  />
                  <ResultRow
                    label="ECEF (XYZ geocêntrico)"
                    value={`X ${geoResult.ecef.x.toFixed(3)} · Y ${geoResult.ecef.y.toFixed(3)} · Z ${geoResult.ecef.z.toFixed(3)} (m)`}
                    copyText={`${geoResult.ecef.x.toFixed(3)}, ${geoResult.ecef.y.toFixed(3)}, ${geoResult.ecef.z.toFixed(3)}`}
                  />
                </>
              )
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Digite as duas coordenadas para converter.</p>
            )}
          </div>
        </>
      )}

      {mode === 'utm2geo' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelClass} htmlFor="conv-zone">
                Fuso
              </label>
              <input
                id="conv-zone"
                type="number"
                min={1}
                max={60}
                value={zoneText}
                onChange={(e) => setZoneText(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-hemi">
                Hemisfério
              </label>
              <select
                id="conv-hemi"
                value={hemi}
                onChange={(e) => setHemi(e.target.value as 'S' | 'N')}
                className={inputClass}
              >
                <option value="S">S (Sul)</option>
                <option value="N">N (Norte)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-e">
                Easting (m)
              </label>
              <input
                id="conv-e"
                type="text"
                value={eastingText}
                onChange={(e) => setEastingText(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-n">
                Northing (m)
              </label>
              <input
                id="conv-n"
                type="text"
                value={northingText}
                onChange={(e) => setNorthingText(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            {!utmResult.ok ? (
              <ErrorNote message={utmResult.error} />
            ) : (
              <>
                <ResultRow
                  label="Latitude"
                  value={`${utmResult.lat.toFixed(7)}°`}
                  copyText={utmResult.lat.toFixed(7)}
                />
                <ResultRow
                  label="Longitude"
                  value={`${utmResult.lon.toFixed(7)}°`}
                  copyText={utmResult.lon.toFixed(7)}
                />
                <ResultRow
                  label="GMS"
                  value={`${decToDms(utmResult.lat, true)} / ${decToDms(utmResult.lon, false)}`}
                  copyText={`${decToDms(utmResult.lat, true)} / ${decToDms(utmResult.lon, false)}`}
                />
                <ResultRow
                  label="Decimais (par)"
                  value={`${utmResult.lat.toFixed(7)}, ${utmResult.lon.toFixed(7)}`}
                  copyText={`${utmResult.lat.toFixed(7)}, ${utmResult.lon.toFixed(7)}`}
                />
              </>
            )}
          </div>
        </>
      )}

      {mode === 'ecef' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="conv-ecef-x">
                X (m)
              </label>
              <input
                id="conv-ecef-x"
                type="text"
                value={xText}
                onChange={(e) => setXText(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-ecef-y">
                Y (m)
              </label>
              <input
                id="conv-ecef-y"
                type="text"
                value={yText}
                onChange={(e) => setYText(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-ecef-z">
                Z (m)
              </label>
              <input
                id="conv-ecef-z"
                type="text"
                value={zText}
                onChange={(e) => setZText(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            {!ecefResult.ok ? (
              <ErrorNote message={ecefResult.error} />
            ) : (
              <>
                <ResultRow
                  label="Latitude"
                  value={`${ecefResult.lat.toFixed(7)}°`}
                  copyText={ecefResult.lat.toFixed(7)}
                />
                <ResultRow
                  label="Longitude"
                  value={`${ecefResult.lon.toFixed(7)}°`}
                  copyText={ecefResult.lon.toFixed(7)}
                />
                <ResultRow
                  label="GMS"
                  value={`${decToDms(ecefResult.lat, true)} / ${decToDms(ecefResult.lon, false)}`}
                  copyText={`${decToDms(ecefResult.lat, true)} / ${decToDms(ecefResult.lon, false)}`}
                />
                <ResultRow
                  label="UTM (WGS84 ≈ SIRGAS2000)"
                  value={formatUTM(geographicToUTM(ecefResult.lat, ecefResult.lon), 3)}
                  copyText={formatUTM(geographicToUTM(ecefResult.lat, ecefResult.lon), 3)}
                />
                <ResultRow
                  label="Altitude elipsoidal (h)"
                  value={`${ecefResult.h.toFixed(3)} m`}
                  copyText={ecefResult.h.toFixed(3)}
                />
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ===== 2. Altimetria h / N / H =====

function AltimetrySection() {
  const [hText, setHText] = useState(''); // elipsoidal
  const [hOrtoText, setHOrtoText] = useState(''); // ortométrica
  const [NText, setNText] = useState(''); // ondulação geoidal

  const [lookupLat, setLookupLat] = useState('-23.5505');
  const [lookupLon, setLookupLon] = useState('-46.6333');
  const [lookup, setLookup] = useState<{
    loading: boolean;
    error?: string;
    modelo?: string;
    fonte?: string;
    incerteza?: number | null;
  }>({ loading: false });
  const [modelId, setModelId] = useState<GeoidModelId>('HGEOHNOR');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<ForwardGeocodeResult[] | null>(null);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [dem, setDem] = useState<{ loading: boolean; error?: string; elevation?: number; model?: string }>({
    loading: false,
  });

  const h = parseNum(hText);
  const H = parseNum(hOrtoText);
  const N = parseNum(NText);
  const Hcalc = h !== null && N !== null ? orthometricHeight(h, N) : null;
  const hCalc = H !== null && N !== null ? ellipsoidalHeight(H, N) : null;

  const Hshown = H ?? Hcalc;
  const hShown = h ?? hCalc;

  const formatMetersFt = (v: number | null) =>
    v === null ? '—' : `${v.toFixed(3)} m · ${convertLength(v, 'm', 'ft').toFixed(3)} ft`;

  const consultarN = async () => {
    setLookup({ loading: true });
    try {
      const lat = parseDmsString(lookupLat);
      const lon = parseDmsString(lookupLon);
      const s = await fetchUndulation(modelId, lat, lon);
      setNText(String(s.N));
      setLookup({ loading: false, modelo: s.modelo, fonte: s.fonte, incerteza: s.incerteza });
    } catch (err) {
      setLookup({ loading: false, error: errorMessage(err) });
    }
  };

  const buscarLugar = async () => {
    if (!placeQuery.trim()) return;
    setPlaceSearching(true);
    const results = await forwardGeocode(placeQuery);
    setPlaceSearching(false);
    setPlaceResults(results && results.length > 0 ? results : []);
  };

  const escolherLugar = (r: ForwardGeocodeResult) => {
    setLookupLat(r.lat.toFixed(6));
    setLookupLon(r.lon.toFixed(6));
    setPlaceResults(null);
    setPlaceQuery(r.displayName.split(',')[0]);
  };

  const consultarDem = async () => {
    setDem({ loading: true });
    try {
      const lat = parseDmsString(lookupLat);
      const lon = parseDmsString(lookupLon);
      const r = await fetchTerrainElevation(lat, lon);
      setDem({ loading: false, elevation: r.elevation, model: r.model });
    } catch (err) {
      setDem({ loading: false, error: errorMessage(err) });
    }
  };

  return (
    <section className="space-y-6">
      {/* Calculadora h ↔ H ↔ N */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Mountain className="w-5 h-5 text-ibge-green" />
          Calculadora h ↔ H ↔ N
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Informe dois valores e o terceiro é calculado: H = h − N. No Brasil N é negativo (geóide abaixo do elipsoide)
          — mas não no Sul, onde N é positivo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass} htmlFor="conv-h">
              Altitude elipsoidal (h)
            </label>
            <input
              id="conv-h"
              type="text"
              value={hText}
              onChange={(e) => setHText(e.target.value)}
              className={inputClass}
              placeholder="ex.: 850.123"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="conv-n">
              Ondulação geoidal (N)
            </label>
            <input
              id="conv-n"
              type="text"
              value={NText}
              onChange={(e) => setNText(e.target.value)}
              className={inputClass}
              placeholder="ex.: -19.456"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="conv-H">
              Altitude ortométrica (H)
            </label>
            <input
              id="conv-H"
              type="text"
              value={hOrtoText}
              onChange={(e) => setHOrtoText(e.target.value)}
              className={inputClass}
              placeholder="ex.: 869.579"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between gap-2">
              h (elipsoidal)
              {hShown !== null && <CopyChip text={hShown.toFixed(3)} label="Copiar h" />}
            </p>
            <p className="font-mono font-bold text-slate-900 dark:text-white">{formatMetersFt(hShown)}</p>
          </div>
          <div className="p-3 bg-ibge-blue/5 dark:bg-ibge-blue/10 rounded-xl border border-ibge-blue/20">
            <p className="text-[10px] uppercase tracking-widest font-bold text-ibge-blue dark:text-ibge-light-blue mb-1 flex items-center justify-between gap-2">
              N (ondulação)
              {N !== null && <CopyChip text={N.toFixed(3)} label="Copiar N" />}
            </p>
            <p className="font-mono font-bold text-ibge-blue dark:text-ibge-light-blue">{formatMetersFt(N)}</p>
          </div>
          <div className="p-3 bg-ibge-green/5 dark:bg-ibge-green/10 rounded-xl border border-ibge-green/20">
            <p className="text-[10px] uppercase tracking-widest font-bold text-ibge-green mb-1 flex items-center justify-between gap-2">
              H (ortométrica){Hcalc !== null && H === null ? ' · calculada' : ''}
              {Hshown !== null && <CopyChip text={Hshown.toFixed(3)} label="Copiar H" />}
            </p>
            <p className="font-mono font-bold text-ibge-green">{formatMetersFt(Hshown)}</p>
          </div>
        </div>
        {(Hcalc !== null || hCalc !== null) && (
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {Hcalc !== null &&
              h !== null &&
              N !== null &&
              `H = h − N = ${h.toFixed(3)} − (${N.toFixed(3)}) = ${Hcalc.toFixed(3)} m`}
            {Hcalc !== null && hCalc !== null && ' · '}
            {hCalc !== null &&
              H !== null &&
              N !== null &&
              `h = H + N = ${H.toFixed(3)} + (${N.toFixed(3)}) = ${hCalc.toFixed(3)} m`}
          </p>
        )}
      </div>

      {/* Sistemas abertos e modelo oficial */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Globe2 className="w-5 h-5 text-ibge-blue" />
          Obter N e altitudes de fontes externas
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Modelo geoidal oficial (IBGE) ou global aberto (EGM96), busca de lugar (OpenStreetMap) e terreno (DEM
          Copernicus via Open-Meteo). Os resultados preenchem a calculadora acima.
        </p>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ibge-blue dark:text-ibge-light-blue mb-2">
              1 · Ondulação geoidal (N)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className={labelClass} htmlFor="conv-geoid-model">
                  Modelo
                </label>
                <select
                  id="conv-geoid-model"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value as GeoidModelId)}
                  className={inputClass}
                >
                  {GEOID_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="conv-geo-lat">
                  Latitude
                </label>
                <input
                  id="conv-geo-lat"
                  type="text"
                  value={lookupLat}
                  onChange={(e) => setLookupLat(e.target.value)}
                  className={inputClass}
                  placeholder="-23.5505"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="conv-geo-lon">
                  Longitude
                </label>
                <input
                  id="conv-geo-lon"
                  type="text"
                  value={lookupLon}
                  onChange={(e) => setLookupLon(e.target.value)}
                  className={inputClass}
                  placeholder="-46.6333"
                />
              </div>
              <button
                type="button"
                onClick={() => void consultarN()}
                disabled={lookup.loading}
                className="px-4 py-2 bg-ibge-blue hover:bg-ibge-blue/90 text-white font-medium rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {lookup.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Info className="w-4 h-4" />}
                Buscar N
              </button>
            </div>
            {lookup.error && <ErrorNote message={lookup.error} />}
            {lookup.modelo && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                N preenchido na calculadora · <span className="font-mono font-semibold">{lookup.modelo}</span> · fonte:{' '}
                {lookup.fonte}
                {lookup.incerteza !== null && lookup.incerteza !== undefined && (
                  <> · Incerteza: ±{lookup.incerteza.toFixed(2)} m</>
                )}{' '}
                ·{' '}
                {modelId === 'HGEOHNOR'
                  ? 'H referida ao RN2015 (Imbituba), realização REALT-2018.'
                  : 'MSL do EGM96 (mesma referência de arquivos KML).'}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ibge-blue dark:text-ibge-light-blue mb-2">
              2 · Encontrar o lugar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className={labelClass} htmlFor="conv-place">
                  Buscar lugar (OpenStreetMap)
                </label>
                <input
                  id="conv-place"
                  type="text"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void buscarLugar();
                    }
                  }}
                  className={inputClass}
                  placeholder="ex.: Praça da Sé, São Paulo"
                />
              </div>
              <button
                type="button"
                onClick={() => void buscarLugar()}
                disabled={placeSearching}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {placeSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
            {placeResults &&
              (placeResults.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Nenhum lugar encontrado.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {placeResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => escolherLugar(r)}
                      title={r.displayName}
                      className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-ibge-blue dark:hover:border-ibge-light-blue transition-colors truncate max-w-full"
                    >
                      {r.displayName.split(',').slice(0, 3).join(', ')}
                    </button>
                  ))}
                </div>
              ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ibge-blue dark:text-ibge-light-blue mb-2">
              3 · Terreno (DEM aberto)
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => void consultarDem()}
                disabled={dem.loading}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
              >
                {dem.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mountain className="w-4 h-4" />}
                Altitude do terreno
              </button>
              {dem.elevation !== undefined && (
                <>
                  <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
                    ≈ {dem.elevation.toFixed(1)} m
                    <span className="text-slate-400 font-normal"> ({dem.model} · Open-Meteo)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHOrtoText(String(dem.elevation))}
                    className="text-xs font-medium text-ibge-blue dark:text-ibge-light-blue hover:underline"
                  >
                    usar como H
                  </button>
                </>
              )}
            </div>
            {dem.error && <ErrorNote message={dem.error} />}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              O DEM dá a altitude de terreno (≈ ortométrica): use como H e combine com N para estimar o que o GPS
              mediria (h = H + N).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== 3. Transformação de Datum =====

function DatumSection() {
  const [fromDatum, setFromDatum] = useState<DatumId>('SAD69_96');
  const [toDatum, setToDatum] = useState<DatumId>('SIRGAS2000');
  const [latText, setLatText] = useState('-23.5505');
  const [lonText, setLonText] = useState('-46.6333');

  const latParsed = parseCoordinateInput(latText);
  const lonParsed = parseCoordinateInput(lonText);
  let result: { lat: number; lon: number } | null = null;
  let error: string | null = null;
  if (latParsed.value !== undefined && lonParsed.value !== undefined) {
    try {
      result = transformDatum(latParsed.value, lonParsed.value, fromDatum, toDatum);
    } catch (err) {
      error = errorMessage(err);
    }
  }
  const displacement =
    result && latParsed.value !== undefined && lonParsed.value !== undefined
      ? haversineDistance({ lat: latParsed.value, lon: lonParsed.value }, result)
      : null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
        <ArrowLeftRight className="w-5 h-5 text-ibge-gold" />
        Transformação de Datum
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Helmert de 3 parâmetros. SAD69(96)→SIRGAS2000 usa os parâmetros oficiais do IBGE (EPSG:15485, acurácia ~5 m);
        SAD69 clássico usa o registro histórico EPSG (−57, +1, −41, ~10 m); WGS84 ≈ SIRGAS2000 (equivalentes a poucos
        cm).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass} htmlFor="conv-datum-from">
            De
          </label>
          <select
            id="conv-datum-from"
            value={fromDatum}
            onChange={(e) => setFromDatum(e.target.value as DatumId)}
            className={inputClass}
          >
            {Object.values(DATUMS).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-datum-to">
            Para
          </label>
          <select
            id="conv-datum-to"
            value={toDatum}
            onChange={(e) => setToDatum(e.target.value as DatumId)}
            className={inputClass}
          >
            {Object.values(DATUMS).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-datum-lat">
            Latitude
          </label>
          <input
            id="conv-datum-lat"
            type="text"
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-datum-lon">
            Longitude
          </label>
          <input
            id="conv-datum-lon"
            type="text"
            value={lonText}
            onChange={(e) => setLonText(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      {(latParsed.error || lonParsed.error || error) && (
        <ErrorNote message={latParsed.error || lonParsed.error || error || 'Erro na transformação.'} />
      )}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
        {result ? (
          <>
            <ResultRow
              label={`${DATUMS[fromDatum].label} → ${DATUMS[toDatum].label}`}
              value={
                fromDatum === toDatum
                  ? 'Datums iguais — sem transformação'
                  : `${result.lat.toFixed(7)}°, ${result.lon.toFixed(7)}°`
              }
              copyText={fromDatum === toDatum ? undefined : `${result.lat.toFixed(7)}, ${result.lon.toFixed(7)}`}
            />
            {fromDatum !== toDatum && (
              <ResultRow
                label="Deslocamento em superfície"
                value={displacement !== null ? `≈ ${displacement.toFixed(2)} m` : '—'}
              />
            )}
            {fromDatum !== toDatum && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{DATUMS[toDatum].note}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">Informe a coordenada para transformar.</p>
        )}
      </div>
    </section>
  );
}

// ===== 4. Distância entre pontos =====

function DistanceSection() {
  const [aLatText, setALatText] = useState('-23.5505');
  const [aLonText, setALonText] = useState('-46.6333');
  const [bLatText, setBLatText] = useState('-22.9068');
  const [bLonText, setBLonText] = useState('-43.1729');
  const [unit, setUnit] = useState<LengthUnit>('km');

  const aLat = parseCoordinateInput(aLatText);
  const aLon = parseCoordinateInput(aLonText);
  const bLat = parseCoordinateInput(bLatText);
  const bLon = parseCoordinateInput(bLonText);
  const ready =
    aLat.value !== undefined && aLon.value !== undefined && bLat.value !== undefined && bLon.value !== undefined;
  const distance = ready
    ? haversineDistance(
        { lat: aLat.value as number, lon: aLon.value as number },
        { lat: bLat.value as number, lon: bLon.value as number }
      )
    : null;
  const distanceText =
    distance !== null
      ? `${convertLength(distance, 'm', unit).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`
      : null;

  const swap = () => {
    setALatText(bLatText);
    setALonText(bLonText);
    setBLatText(aLatText);
    setBLonText(aLonText);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MoveHorizontal className="w-5 h-5 text-ibge-blue" />
          Distância entre dois pontos
        </h3>
        <button
          type="button"
          onClick={swap}
          className="text-xs font-medium text-ibge-blue dark:text-ibge-light-blue hover:underline flex items-center gap-1"
          title="Trocar A e B"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          trocar A ↔ B
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Distância de grande círculo (Haversine, esfera média IUGG R = 6 371 008,8 m).
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Ponto A</p>
          <input
            type="text"
            value={aLatText}
            onChange={(e) => setALatText(e.target.value)}
            className={inputClass}
            aria-label="Latitude do ponto A"
            placeholder="Latitude A"
          />
          <input
            type="text"
            value={aLonText}
            onChange={(e) => setALonText(e.target.value)}
            className={inputClass}
            aria-label="Longitude do ponto A"
            placeholder="Longitude A"
          />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Ponto B</p>
          <input
            type="text"
            value={bLatText}
            onChange={(e) => setBLatText(e.target.value)}
            className={inputClass}
            aria-label="Latitude do ponto B"
            placeholder="Latitude B"
          />
          <input
            type="text"
            value={bLonText}
            onChange={(e) => setBLonText(e.target.value)}
            className={inputClass}
            aria-label="Longitude do ponto B"
            placeholder="Longitude B"
          />
        </div>
      </div>
      <div className="mt-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className={labelClass} htmlFor="conv-unit">
            Unidade
          </label>
          <select
            id="conv-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as LengthUnit)}
            className={inputClass}
          >
            <option value="m">metros (m)</option>
            <option value="km">quilômetros (km)</option>
            <option value="ft">pés (ft)</option>
            <option value="ftUS">pés survey (ftUS)</option>
            <option value="mi">milhas (mi)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px] p-3 bg-ibge-blue/5 dark:bg-ibge-blue/10 rounded-xl border border-ibge-blue/20 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-ibge-blue dark:text-ibge-light-blue mb-0.5">
              Distância
            </p>
            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{distanceText ?? '—'}</p>
          </div>
          {distanceText && <CopyChip text={distanceText} label="Copiar distância" />}
        </div>
      </div>
      {[aLat, aLon, bLat, bLon].some((r) => r.error) && (
        <ErrorNote message={[aLat, aLon, bLat, bLon].find((r) => r.error)?.error ?? 'Coordenada inválida.'} />
      )}
    </section>
  );
}

// ===== 5. Grade ↔ Terreno (fator k) =====

function GridGroundSection() {
  const [latText, setLatText] = useState('-23.5505');
  const [lonText, setLonText] = useState('-46.6333');
  const [hText, setHText] = useState('760');
  const [distText, setDistText] = useState('1000');
  const [direction, setDirection] = useState<'grid2ground' | 'ground2grid'>('grid2ground');

  const latParsed = parseCoordinateInput(latText);
  const lonParsed = parseCoordinateInput(lonText);
  const H = parseNum(hText);
  const dist = parseNum(distText);

  const factor =
    latParsed.value !== undefined && lonParsed.value !== undefined && H !== null
      ? gridGroundFactor(latParsed.value, lonParsed.value, H)
      : null;
  const resultDist =
    factor !== null && dist !== null
      ? direction === 'grid2ground'
        ? gridToGround(dist, factor)
        : groundToGrid(dist, factor)
      : null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
        <Ruler className="w-5 h-5 text-ibge-green" />
        Distância grade ↔ terreno (fator k)
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Converte distâncias medidas na planta UTM para o terreno (e vice-versa): k = k<sub>UTM</sub> × k
        <sub>altitude</sub>, com k<sub>UTM</sub> medido numericamente no ponto pelo núcleo de projeção e k
        <sub>altitude</sub> = R/(R+H) com o raio de curvatura médio na latitude.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className={labelClass} htmlFor="gg-lat">
            Latitude
          </label>
          <input
            id="gg-lat"
            type="text"
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            className={inputClass}
          />
          {latParsed.error && <ErrorNote message={latParsed.error} />}
        </div>
        <div>
          <label className={labelClass} htmlFor="gg-lon">
            Longitude
          </label>
          <input
            id="gg-lon"
            type="text"
            value={lonText}
            onChange={(e) => setLonText(e.target.value)}
            className={inputClass}
          />
          {lonParsed.error && <ErrorNote message={lonParsed.error} />}
        </div>
        <div>
          <label className={labelClass} htmlFor="gg-h">
            Altitude H (m)
          </label>
          <input
            id="gg-h"
            type="text"
            value={hText}
            onChange={(e) => setHText(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="gg-dist">
            Distância (m)
          </label>
          <input
            id="gg-dist"
            type="text"
            value={distText}
            onChange={(e) => setDistText(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div
        className="mt-3 flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit"
        role="group"
        aria-label="Direção da conversão"
      >
        <button
          type="button"
          onClick={() => setDirection('grid2ground')}
          aria-pressed={direction === 'grid2ground'}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
            direction === 'grid2ground'
              ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Grade → Terreno
        </button>
        <button
          type="button"
          onClick={() => setDirection('ground2grid')}
          aria-pressed={direction === 'ground2grid'}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
            direction === 'ground2grid'
              ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Terreno → Grade
        </button>
      </div>
      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
        {factor ? (
          <>
            <ResultRow
              label="k UTM (escala da projeção no ponto)"
              value={factor.kUtm.toFixed(8)}
              copyText={factor.kUtm.toFixed(8)}
            />
            <ResultRow
              label="k altitude (R/(R+H))"
              value={factor.kAltitude.toFixed(8)}
              copyText={factor.kAltitude.toFixed(8)}
            />
            <ResultRow label="k combinado" value={factor.k.toFixed(8)} copyText={factor.k.toFixed(8)} />
            <ResultRow
              label={direction === 'grid2ground' ? 'Distância no terreno' : 'Distância na grade'}
              value={
                resultDist !== null ? `${resultDist.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} m` : '—'
              }
              copyText={resultDist !== null ? resultDist.toFixed(4) : undefined}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">Informe latitude, longitude e altitude.</p>
        )}
      </div>
    </section>
  );
}

export function ConversionsPanel() {
  const [section, setSection] = useState<SectionId>('coordenadas');

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
          Conversores offline sobre o mesmo núcleo validado por testes contra o PROJ. Fontes externas (IBGE,
          OpenStreetMap, Open-Meteo) só entram quando você clica em buscar.
        </p>
        <div
          className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5 overflow-x-auto"
          role="tablist"
          aria-label="Seções do painel de conversões"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                section === s.id
                  ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {section === 'coordenadas' && <CoordinatesSection />}
        {section === 'altimetria' && <AltimetrySection />}
        {section === 'datum' && <DatumSection />}
        {section === 'medidas' && (
          <div className="space-y-6">
            <DistanceSection />
            <GridGroundSection />
          </div>
        )}
      </div>
    </div>
  );
}

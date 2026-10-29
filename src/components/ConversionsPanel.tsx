import React, { useState } from 'react';
import { ArrowLeftRight, Globe2, Info, Loader2, Mountain, MoveHorizontal, Ruler } from 'lucide-react';
import { getPontoDec, summarizeHgeoResult } from '../lib/api';
import {
  DATUMS,
  DatumId,
  LengthUnit,
  convertLength,
  decToDms,
  ellipsoidalHeight,
  formatUTM,
  geographicToUTM,
  haversineDistance,
  orthometricHeight,
  parseDmsString,
  transformDatum,
  utmToGeographic,
  utmZoneCentralMeridian,
} from '../lib/geodesy';

const inputClass =
  'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

function parseCoordinateInput(text: string): { value?: number; error?: string } {
  if (!text.trim()) return { error: 'Informe a coordenada (dec. ou GMS, ex.: -23.5505 ou "23° 33\' 1.8\" S")' };
  try {
    return { value: parseDmsString(text) };
  } catch (err: any) {
    return { error: err.message };
  }
}

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const v = parseFloat(text.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function ResultRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 dark:text-white text-right break-all ${mono ? 'font-mono' : ''}`}>
        {value}
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

// ===== 1. Coordenadas ↔ UTM =====

function CoordinatesSection() {
  const [mode, setMode] = useState<'geo2utm' | 'utm2geo'>('geo2utm');

  // Geográficas → UTM
  const [latText, setLatText] = useState('-23.5505');
  const [lonText, setLonText] = useState('-46.6333');
  const latParsed = parseCoordinateInput(latText);
  const lonParsed = parseCoordinateInput(lonText);
  const geoResult =
    latParsed.value !== undefined && lonParsed.value !== undefined
      ? (() => {
          try {
            const utm = geographicToUTM(latParsed.value, lonParsed.value);
            return { lat: latParsed.value, lon: lonParsed.value, utm, error: null as string | null };
          } catch (err: any) {
            return { lat: latParsed.value, lon: lonParsed.value, utm: null, error: err.message as string };
          }
        })()
      : null;

  // UTM → Geográficas
  const [zoneText, setZoneText] = useState('23');
  const [hemi, setHemi] = useState<'S' | 'N'>('S');
  const [eastingText, setEastingText] = useState('333287.92');
  const [northingText, setNorthingText] = useState('7394588.32');
  const zone = parseInt(zoneText, 10);
  const utmResult = (() => {
    if (!Number.isInteger(zone) || zone < 1 || zone > 60) return { error: 'Fuso deve estar entre 1 e 60.' };
    const easting = parseNum(eastingText);
    const northing = parseNum(northingText);
    if (easting === null || northing === null) return { error: 'Informe Easting e Northing em metros.' };
    try {
      return { geo: utmToGeographic({ zone, hemisphere: hemi, easting, northing }), error: null as string | null };
    } catch (err: any) {
      return { error: err.message as string };
    }
  })();

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-ibge-blue" />
          Coordenadas ↔ UTM
        </h3>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('geo2utm')}
            aria-pressed={mode === 'geo2utm'}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              mode === 'geo2utm' ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Geográficas → UTM
          </button>
          <button
            type="button"
            onClick={() => setMode('utm2geo')}
            aria-pressed={mode === 'utm2geo'}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              mode === 'utm2geo' ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            UTM → Geográficas
          </button>
        </div>
      </div>

      {mode === 'geo2utm' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="conv-lat">Latitude</label>
              <input id="conv-lat" type="text" value={latText} onChange={e => setLatText(e.target.value)} className={inputClass} placeholder={'-23.5505 ou "23° 33\' 1.8" S"'} />
              {latParsed.error && <ErrorNote message={latParsed.error} />}
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-lon">Longitude</label>
              <input id="conv-lon" type="text" value={lonText} onChange={e => setLonText(e.target.value)} className={inputClass} placeholder={'-46.6333 ou "46° 37\' 59" O"'} />
              {lonParsed.error && <ErrorNote message={lonParsed.error} />}
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            {geoResult ? (
              <>
                {geoResult.error ? (
                  <ErrorNote message={geoResult.error} />
                ) : (
                  <>
                    <ResultRow label="Decimais" value={`${geoResult.lat.toFixed(7)}°, ${geoResult.lon.toFixed(7)}°`} />
                    <ResultRow label="GMS" value={`${decToDms(geoResult.lat, true)} / ${decToDms(geoResult.lon, false)}`} />
                    <ResultRow label="UTM (WGS84 ≈ SIRGAS2000)" value={formatUTM(geoResult.utm!, 3)} />
                    <ResultRow label="Fuso / Meridiano central" value={`${geoResult.utm!.zone}${geoResult.utm!.hemisphere} · MC ${utmZoneCentralMeridian(geoResult.utm!.zone)}°`} />
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Digite as duas coordenadas para converter.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelClass} htmlFor="conv-zone">Fuso</label>
              <input id="conv-zone" type="number" min={1} max={60} value={zoneText} onChange={e => setZoneText(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-hemi">Hemisfério</label>
              <select id="conv-hemi" value={hemi} onChange={e => setHemi(e.target.value as 'S' | 'N')} className={inputClass}>
                <option value="S">S (Sul)</option>
                <option value="N">N (Norte)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-e">Easting (m)</label>
              <input id="conv-e" type="text" value={eastingText} onChange={e => setEastingText(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="conv-n">Northing (m)</label>
              <input id="conv-n" type="text" value={northingText} onChange={e => setNorthingText(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            {utmResult.error ? (
              <ErrorNote message={utmResult.error} />
            ) : (
              <>
                <ResultRow label="Latitude" value={`${utmResult.geo!.lat.toFixed(7)}°`} />
                <ResultRow label="Longitude" value={`${utmResult.geo!.lon.toFixed(7)}°`} />
                <ResultRow label="GMS" value={`${decToDms(utmResult.geo!.lat, true)} / ${decToDms(utmResult.geo!.lon, false)}`} />
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
  const [lookup, setLookup] = useState<{ loading: boolean; error?: string; modelo?: string; incerteza?: number | null }>({ loading: false });

  const h = parseNum(hText);
  const H = parseNum(hOrtoText);
  const N = parseNum(NText);
  const Hcalc = h !== null && N !== null ? orthometricHeight(h, N) : null;
  const hCalc = H !== null && N !== null ? ellipsoidalHeight(H, N) : null;

  const Hshown = H ?? Hcalc;
  const hShown = h ?? hCalc;

  const consultarN = async () => {
    setLookup({ loading: true });
    try {
      const lat = parseDmsString(lookupLat);
      const lon = parseDmsString(lookupLon);
      const res = await getPontoDec(lat, lon);
      const s = summarizeHgeoResult(res);
      if (s.N === null) {
        setLookup({ loading: false, error: 'Ponto fora da grade do modelo geoidal hgeoHNOR.' });
        return;
      }
      setNText(String(s.N));
      setLookup({ loading: false, modelo: s.modelo, incerteza: s.incerteza });
    } catch {
      setLookup({ loading: false, error: 'Falha ao consultar o IBGE — verifique sua conexão.' });
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
        <Mountain className="w-5 h-5 text-ibge-green" />
        Altimetria: h ↔ H ↔ N
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Informe dois valores e o terceiro é calculado: H = h − N. No Brasil N é negativo (geóide abaixo do elipsoide).
        Não tem N? Consulte o modelo geoidal oficial do IBGE para o ponto.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="conv-h">Altitude elipsoidal (h)</label>
          <input id="conv-h" type="text" value={hText} onChange={e => setHText(e.target.value)} className={inputClass} placeholder="ex.: 850.123" />
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-n">Ondulação geoidal (N)</label>
          <input id="conv-n" type="text" value={NText} onChange={e => setNText(e.target.value)} className={inputClass} placeholder="ex.: -19.456" />
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-H">Altitude ortométrica (H)</label>
          <input id="conv-H" type="text" value={hOrtoText} onChange={e => setHOrtoText(e.target.value)} className={inputClass} placeholder="ex.: 869.579" />
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-widest text-ibge-blue dark:text-ibge-light-blue mb-3">
          Consultar N no modelo geoidal (IBGE · hgeoHNOR)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className={labelClass} htmlFor="conv-geo-lat">Latitude do ponto</label>
            <input id="conv-geo-lat" type="text" value={lookupLat} onChange={e => setLookupLat(e.target.value)} className={inputClass} placeholder="-23.5505" />
          </div>
          <div>
            <label className={labelClass} htmlFor="conv-geo-lon">Longitude do ponto</label>
            <input id="conv-geo-lon" type="text" value={lookupLon} onChange={e => setLookupLon(e.target.value)} className={inputClass} placeholder="-46.6333" />
          </div>
          <button
            type="button"
            onClick={consultarN}
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
            N preenchido acima · Modelo: <span className="font-mono font-semibold">{lookup.modelo}</span>
            {lookup.incerteza !== null && lookup.incerteza !== undefined && <> · Incerteza: ±{lookup.incerteza.toFixed(2)} m</>}
            {' '}· H referida ao RN2015 (Imbituba), realização REALT-2018.
          </p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-1">h (elipsoidal)</p>
          <p className="font-mono font-bold text-slate-900 dark:text-white">
            {hShown !== null ? `${hShown.toFixed(3)} m` : '—'}
            <span className="text-xs font-normal text-slate-500"> · {(convertLength(hShown ?? 0, 'm', 'ft')).toFixed(3)} ft</span>
          </p>
        </div>
        <div className="p-3 bg-ibge-blue/5 dark:bg-ibge-blue/10 rounded-xl border border-ibge-blue/20">
          <p className="text-[10px] uppercase tracking-widest font-bold text-ibge-blue dark:text-ibge-light-blue mb-1">N (ondulação)</p>
          <p className="font-mono font-bold text-ibge-blue dark:text-ibge-light-blue">
            {N !== null ? `${N.toFixed(3)} m` : '—'}
            <span className="text-xs font-normal"> · {N !== null ? convertLength(N, 'm', 'ft').toFixed(3) : '—'} ft</span>
          </p>
        </div>
        <div className="p-3 bg-ibge-green/5 dark:bg-ibge-green/10 rounded-xl border border-ibge-green/20">
          <p className="text-[10px] uppercase tracking-widest font-bold text-ibge-green mb-1">H (ortométrica){Hcalc !== null && H === null ? ' · calculada' : ''}</p>
          <p className="font-mono font-bold text-ibge-green">
            {Hshown !== null ? `${Hshown.toFixed(3)} m` : '—'}
            <span className="text-xs font-normal"> · {Hshown !== null ? convertLength(Hshown, 'm', 'ft').toFixed(3) : '—'} ft</span>
          </p>
        </div>
      </div>
      {(Hcalc !== null || hCalc !== null) && (
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {Hcalc !== null && H === null && `H = h − N = ${h!.toFixed(3)} − (${N!.toFixed(3)}) = ${Hcalc.toFixed(3)} m`}
          {Hcalc !== null && H === null && hCalc !== null && ' · '}
          {hCalc !== null && h === null && `h = H + N = ${H!.toFixed(3)} + (${N!.toFixed(3)}) = ${hCalc.toFixed(3)} m`}
        </p>
      )}
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
    } catch (err: any) {
      error = err.message;
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
        WGS84 ≈ SIRGAS2000 (equivalentes a poucos cm).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass} htmlFor="conv-datum-from">De</label>
          <select id="conv-datum-from" value={fromDatum} onChange={e => setFromDatum(e.target.value as DatumId)} className={inputClass}>
            {Object.values(DATUMS).map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-datum-to">Para</label>
          <select id="conv-datum-to" value={toDatum} onChange={e => setToDatum(e.target.value as DatumId)} className={inputClass}>
            {Object.values(DATUMS).map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-datum-lat">Latitude</label>
          <input id="conv-datum-lat" type="text" value={latText} onChange={e => setLatText(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="conv-datum-lon">Longitude</label>
          <input id="conv-datum-lon" type="text" value={lonText} onChange={e => setLonText(e.target.value)} className={inputClass} />
        </div>
      </div>
      {(latParsed.error || lonParsed.error || error) && (
        <ErrorNote message={(latParsed.error || lonParsed.error || error)!} />
      )}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
        {result ? (
          <>
            <ResultRow
              label={`${DATUMS[fromDatum].label} → ${DATUMS[toDatum].label}`}
              value={fromDatum === toDatum ? 'Datums iguais — sem transformação' : `${result.lat.toFixed(7)}°, ${result.lon.toFixed(7)}°`}
            />
            {fromDatum !== toDatum && (
              <ResultRow label="Deslocamento em superfície" value={displacement !== null ? `≈ ${displacement.toFixed(2)} m` : '—'} />
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
        { lat: aLat.value!, lon: aLon.value! },
        { lat: bLat.value!, lon: bLon.value! }
      )
    : null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
        <MoveHorizontal className="w-5 h-5 text-ibge-blue" />
        Distância entre dois pontos
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Distância de grande círculo (Haversine, esfera média IUGG R = 6 371 008,8 m).
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Ponto A</p>
          <input type="text" value={aLatText} onChange={e => setALatText(e.target.value)} className={inputClass} aria-label="Latitude do ponto A" placeholder="Latitude A" />
          <input type="text" value={aLonText} onChange={e => setALonText(e.target.value)} className={inputClass} aria-label="Longitude do ponto A" placeholder="Longitude A" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Ponto B</p>
          <input type="text" value={bLatText} onChange={e => setBLatText(e.target.value)} className={inputClass} aria-label="Latitude do ponto B" placeholder="Latitude B" />
          <input type="text" value={bLonText} onChange={e => setBLonText(e.target.value)} className={inputClass} aria-label="Longitude do ponto B" placeholder="Longitude B" />
        </div>
      </div>
      <div className="mt-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className={labelClass} htmlFor="conv-unit">Unidade</label>
          <select id="conv-unit" value={unit} onChange={e => setUnit(e.target.value as LengthUnit)} className={inputClass}>
            <option value="m">metros (m)</option>
            <option value="km">quilômetros (km)</option>
            <option value="ft">pés (ft)</option>
            <option value="ftUS">pés survey (ftUS)</option>
            <option value="mi">milhas (mi)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px] p-3 bg-ibge-blue/5 dark:bg-ibge-blue/10 rounded-xl border border-ibge-blue/20">
          <p className="text-[10px] uppercase tracking-widest font-bold text-ibge-blue dark:text-ibge-light-blue mb-0.5">Distância</p>
          <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
            {distance !== null
              ? `${convertLength(distance, 'm', unit).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`
              : '—'}
          </p>
        </div>
      </div>
      {[aLat, aLon, bLat, bLon].some(r => r.error) && (
        <ErrorNote message={[aLat, aLon, bLat, bLon].find(r => r.error)!.error!} />
      )}
    </section>
  );
}

export function ConversionsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-ibge-blue/5 dark:bg-ibge-blue/10 border border-ibge-blue/20 rounded-2xl">
        <Ruler className="w-5 h-5 text-ibge-blue dark:text-ibge-light-blue shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Conversões calculadas localmente (sem API), com o mesmo núcleo validado por testes automatizados contra o PROJ:
          coordenadas geográficas ↔ UTM, altitudes h/H/N, datums e unidades (m, km, ft, ftUS, mi).
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <CoordinatesSection />
        <AltimetrySection />
        <DatumSection />
        <DistanceSection />
      </div>
    </div>
  );
}

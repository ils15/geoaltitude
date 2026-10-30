import React, { useState } from 'react';
import { getPontoDec, getPontoGms, HgeoResult } from '../lib/api';
import { forwardGeocode, reverseGeocode, Address, ForwardGeocodeResult } from '../lib/geocoding';
import { isValidCoordinate, gmsToDec } from '../lib/validation';
import { orthometricHeight, parseFatorConversao, decToDmsParts } from '../lib/geodesy';
import { fetchUndulation } from '../lib/geoidModels';
import { Loader2, MapPin, Search } from 'lucide-react';
import { errorMessage } from '../lib/errors';

/** parseFloat tolerante à vírgula decimal (usuários brasileiros digitam "57,68"). */
function num(text: string): number {
  return parseFloat(text.trim().replace(',', '.'));
}
import { motion } from 'motion/react';

export function SinglePointForm({ onResult }: { onResult: (result: HgeoResult) => void }) {
  const [mode, setMode] = useState<'dec' | 'gms'>('dec');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<Address | null>(null);

  // Decimal state
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  // GMS state
  const [glat, setGlat] = useState('');
  const [mlat, setMlat] = useState('');
  const [slat, setSlat] = useState('');
  const [glon, setGlon] = useState('');
  const [mlon, setMlon] = useState('');
  const [slon, setSlon] = useState('');

  // Altitude state
  const [altitude, setAltitude] = useState('');
  const [compareEgm, setCompareEgm] = useState(false);

  // Busca de endereço (Nominatim/OSM)
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<ForwardGeocodeResult[] | null>(null);
  const [placeSearching, setPlaceSearching] = useState(false);

  const buscarEndereco = async () => {
    if (!placeQuery.trim()) return;
    setPlaceSearching(true);
    const results = await forwardGeocode(placeQuery);
    setPlaceSearching(false);
    setPlaceResults(results && results.length > 0 ? results : []);
  };

  const escolherEndereco = (r: ForwardGeocodeResult) => {
    setError(null);
    if (mode === 'dec') {
      setLat(r.lat.toFixed(6));
      setLon(r.lon.toFixed(6));
    } else {
      const pLat = decToDmsParts(r.lat, true);
      const pLon = decToDmsParts(r.lon, false);
      setGlat(pLat.hemisphere === 'S' ? String(-pLat.degrees) : String(pLat.degrees));
      setMlat(String(pLat.minutes));
      setSlat(pLat.seconds.toFixed(2));
      setGlon(pLon.hemisphere === 'W' ? String(-pLon.degrees) : String(pLon.degrees));
      setMlon(String(pLon.minutes));
      setSlon(pLon.seconds.toFixed(2));
    }
    setPlaceResults(null);
    setPlaceQuery(r.displayName.split(',')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAddress(null);

    try {
      let result: HgeoResult;
      if (mode === 'dec') {
        if (!lat || !lon) throw new Error('Preencha latitude e longitude');
        const numLat = num(lat);
        const numLon = num(lon);
        if (!isValidCoordinate(numLat, numLon)) {
          throw new Error('Coordenadas fora da área de cobertura do Brasil (Lat: -34 a 6, Lon: -74 a -32).');
        }
        result = await getPontoDec(numLat, numLon);
      } else {
        if (!glat || !mlat || !slat || !glon || !mlon || !slon) {
          throw new Error('Preencha todos os campos de graus, minutos e segundos');
        }
        const numGlat = num(glat);
        const numMlat = num(mlat);
        const numSlat = num(slat);
        const numGlon = num(glon);
        const numMlon = num(mlon);
        const numSlon = num(slon);

        const decLat = gmsToDec(numGlat, numMlat, numSlat);
        const decLon = gmsToDec(numGlon, numMlon, numSlon);

        if (!isValidCoordinate(decLat, decLon)) {
          throw new Error('Coordenadas fora da área de cobertura do Brasil (Lat: -34 a 6, Lon: -74 a -32).');
        }

        result = await getPontoGms(numGlat, numMlat, numSlat, numGlon, numMlon, numSlon);
      }
      if (altitude) {
        const h = num(altitude);
        const N = parseFatorConversao(result.fator_conversao);
        if (!isNaN(h) && N !== null) {
          result.h = h;
          result.H = orthometricHeight(h, N);
        }
      }

      // Reverse geocoding
      const latNum = mode === 'dec' ? num(lat) : gmsToDec(num(glat), num(mlat), num(slat));
      const lonNum = mode === 'dec' ? num(lon) : gmsToDec(num(glon), num(mlon), num(slon));

      // Comparação opcional com o modelo global EGM96 (avaliado offline)
      if (compareEgm && result.h !== undefined) {
        try {
          const egm = await fetchUndulation('EGM96', latNum, lonNum);
          result.N_egm96 = egm.N;
          result.H_egm96 = orthometricHeight(result.h, egm.N);
        } catch {
          /* EGM96 indisponível — segue sem a comparação */
        }
      }

      const addr = await reverseGeocode(latNum, lonNum);
      if (addr) {
        setAddress(addr);
        result.address = addr.displayName;
      }

      onResult(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-5 h-5 text-ibge-blue" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Conversão de Ponto Único</h2>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit transition-colors duration-200">
        <button
          type="button"
          onClick={() => setMode('dec')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'dec'
              ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Graus Decimais
        </button>
        <button
          type="button"
          onClick={() => setMode('gms')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'gms'
              ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Graus Sexagesimais
        </button>
      </div>

      <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void buscarEndereco();
                }
              }}
              placeholder="Buscar endereço ou lugar (OpenStreetMap)"
              aria-label="Buscar endereço ou lugar"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => void buscarEndereco()}
            disabled={placeSearching}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-1.5 whitespace-nowrap"
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
                  onClick={() => escolherEndereco(r)}
                  title={r.displayName}
                  className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-ibge-blue dark:hover:border-ibge-light-blue transition-colors truncate max-w-full"
                >
                  {r.displayName.split(',').slice(0, 3).join(', ')}
                </button>
              ))}
            </div>
          ))}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === 'dec' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-23.5505"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="-46.6333"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={glat}
                  onChange={(e) => setGlat(e.target.value)}
                  placeholder="Graus"
                  aria-label="Latitude: graus"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
                />
                <input
                  type="number"
                  value={mlat}
                  onChange={(e) => setMlat(e.target.value)}
                  placeholder="Minutos"
                  aria-label="Latitude: minutos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
                />
                <input
                  type="number"
                  step="any"
                  value={slat}
                  onChange={(e) => setSlat(e.target.value)}
                  placeholder="Segundos"
                  aria-label="Latitude: segundos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={glon}
                  onChange={(e) => setGlon(e.target.value)}
                  placeholder="Graus"
                  aria-label="Longitude: graus"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
                />
                <input
                  type="number"
                  value={mlon}
                  onChange={(e) => setMlon(e.target.value)}
                  placeholder="Minutos"
                  aria-label="Longitude: minutos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
                />
                <input
                  type="number"
                  step="any"
                  value={slon}
                  onChange={(e) => setSlon(e.target.value)}
                  placeholder="Segundos"
                  aria-label="Longitude: segundos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Altitude Geométrica (h) <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
              placeholder="Ex: 850.5"
              className="w-full pl-4 pr-16 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue transition-colors outline-none"
            />
            <span className="absolute right-4 top-2.5 text-slate-400 text-sm">metros</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Insira a altitude do GPS para calcular a Altitude Ortométrica (H)
          </p>
          <label className="mt-2 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={compareEgm}
              onChange={(e) => setCompareEgm(e.target.checked)}
              className="mt-0.5 accent-ibge-blue"
            />
            <span>
              Comparar também com o modelo global <strong>EGM96</strong> (NGA, avaliado offline) — mostra a diferença
              entre o modelo do IBGE e o global
            </span>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {address && (
          <div className="p-3 bg-ibge-blue/5 dark:bg-ibge-blue/20 text-ibge-blue dark:text-ibge-light-blue rounded-lg text-sm">
            <p className="font-semibold mb-1">Localização aproximada:</p>
            <p>{address.displayName}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ibge-blue hover:bg-ibge-blue/90 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Calcular Altitude'}
        </button>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { getPontoDec, getPontoGms, HgeoResult } from '../lib/api';
import { isValidCoordinate, gmsToDec } from '../lib/validation';
import { Loader2, MapPin, Calculator } from 'lucide-react';
import { motion } from 'motion/react';

export function SinglePointForm({ onResult }: { onResult: (result: HgeoResult) => void }) {
  const [mode, setMode] = useState<'dec' | 'gms'>('dec');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result: HgeoResult;
      if (mode === 'dec') {
        if (!lat || !lon) throw new Error('Preencha latitude e longitude');
        const numLat = parseFloat(lat);
        const numLon = parseFloat(lon);
        if (!isValidCoordinate(numLat, numLon)) {
          throw new Error('Coordenadas fora da área de cobertura do Brasil (Lat: -34 a 6, Lon: -74 a -32).');
        }
        result = await getPontoDec(numLat, numLon);
      } else {
        if (!glat || !mlat || !slat || !glon || !mlon || !slon) {
          throw new Error('Preencha todos os campos de graus, minutos e segundos');
        }
        const numGlat = parseFloat(glat);
        const numMlat = parseFloat(mlat);
        const numSlat = parseFloat(slat);
        const numGlon = parseFloat(glon);
        const numMlon = parseFloat(mlon);
        const numSlon = parseFloat(slon);

        const decLat = gmsToDec(numGlat, numMlat, numSlat);
        const decLon = gmsToDec(numGlon, numMlon, numSlon);

        if (!isValidCoordinate(decLat, decLon)) {
          throw new Error('Coordenadas fora da área de cobertura do Brasil (Lat: -34 a 6, Lon: -74 a -32).');
        }

        result = await getPontoGms(numGlat, numMlat, numSlat, numGlon, numMlon, numSlon);
      }
      if (altitude) {
        const h = parseFloat(altitude);
        if (!isNaN(h)) {
          const N = typeof result.fator_conversao === 'string' ? parseFloat(result.fator_conversao) : result.fator_conversao;
          result.h = h;
          result.H = h - N;
        }
      }

      onResult(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao converter coordenadas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Conversão de Ponto Único</h2>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit transition-colors duration-200">
        <button
          type="button"
          onClick={() => setMode('dec')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'dec' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Graus Decimais
        </button>
        <button
          type="button"
          onClick={() => setMode('gms')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'gms' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Graus Sexagesimais
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={glat}
                  onChange={(e) => setGlat(e.target.value)}
                  placeholder="Graus"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <input
                  type="number"
                  value={mlat}
                  onChange={(e) => setMlat(e.target.value)}
                  placeholder="Minutos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <input
                  type="number"
                  step="any"
                  value={slat}
                  onChange={(e) => setSlat(e.target.value)}
                  placeholder="Segundos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <input
                  type="number"
                  value={mlon}
                  onChange={(e) => setMlon(e.target.value)}
                  placeholder="Minutos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <input
                  type="number"
                  step="any"
                  value={slon}
                  onChange={(e) => setSlon(e.target.value)}
                  placeholder="Segundos"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
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
              className="w-full pl-4 pr-16 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors outline-none"
            />
            <span className="absolute right-4 top-2.5 text-slate-400 text-sm">metros</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Insira a altitude do GPS para calcular a Altitude Ortométrica (H)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Calcular Altitude'}
        </button>
      </form>
    </div>
  );
}

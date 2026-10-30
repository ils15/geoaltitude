import React, { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  FeatureGroup,
  WMSTileLayer,
  GeoJSON,
  Polyline,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { HgeoResult } from '../lib/api';
import { fetchRBMCStations, RBMCStation } from '../lib/rbmc';
import { exportCSV, exportKML, exportDXF } from '../lib/export';
import { polygonArea, polygonPerimeter, polylineLength, haversineDistance } from '../lib/geodesy';
import { fetchTerrainElevationBatch } from '../lib/openServices';
import { downloadText } from '../lib/export';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { FitBoundsControl } from './FitBoundsControl';
import { Map as MapIcon, Layers, Download, ExternalLink, Radio, Ruler } from 'lucide-react';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Helper to get color based on altitude (H)
const getAltitudeColor = (h?: number) => {
  if (h === undefined) return '#64748b'; // slate-500
  if (h < 100) return '#3b82f6'; // blue-500
  if (h < 500) return '#10b981'; // emerald-500
  if (h < 1000) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
};

// Custom SVG Marker Generator
const createCustomIcon = (h?: number, isSelected = false) => {
  const color = getAltitudeColor(h);
  const size = isSelected ? 36 : 30;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21C16 17.5 19 14.4183 19 11C19 7.13401 15.866 4 12 4C8.13401 4 5 7.13401 5 11C5 14.4183 8 17.5 12 21Z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="11" r="3" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// ===== Medições geodésicas dos desenhos =====

interface Measurement {
  id: number;
  label: string;
  detail?: string;
  /** Pontos da linha (polilinhas): permite amostrar o perfil do terreno (DEM). */
  points?: Array<{ lat: number; lon: number }>;
}

const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(3)} km` : `${m.toFixed(2)} m`);
const formatAreaM2 = (m2: number) => (m2 >= 10000 ? `${(m2 / 10000).toFixed(4)} ha` : `${m2.toFixed(2)} m²`);

function measureLayer(layer: L.Layer): Omit<Measurement, 'id'> | null {
  if (layer instanceof L.Polygon) {
    const ring = layer.getLatLngs()[0] as L.LatLng[];
    const pts = ring.map((ll) => ({ lat: ll.lat, lon: ll.lng }));
    if (pts.length < 3) return null;
    return {
      label: `Área: ${formatAreaM2(polygonArea(pts))}`,
      detail: `Perímetro: ${formatDistance(polygonPerimeter(pts))}`,
    };
  }
  if (layer instanceof L.Circle) {
    const r = layer.getRadius();
    return {
      label: `Raio: ${formatDistance(r)}`,
      detail: `Área ≈ ${formatAreaM2(Math.PI * r * r)} (plana)`,
    };
  }
  if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
    const pts = (layer.getLatLngs() as L.LatLng[]).map((ll) => ({ lat: ll.lat, lon: ll.lng }));
    return { label: `Distância: ${formatDistance(polylineLength(pts))}`, points: pts };
  }
  if (layer instanceof L.Marker) {
    const ll = layer.getLatLng();
    return { label: `Ponto: ${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}` };
  }
  return null;
}

// Create custom icon for RBMC stations
const rbmcIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function MapPreview({
  points,
  shapefileData,
}: {
  points: HgeoResult[];
  shapefileData?: GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[] | null;
}) {
  const [rbmcStations, setRbmcStations] = useState<RBMCStation[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [connectPoints, setConnectPoints] = useState(false);

  // Coordenadas memoizadas para o zoom-to-layer (não refitar a cada render)
  const pointCoords = useMemo(
    () => points.map((p) => [parseFloat(p.lat), parseFloat(p.long)] as [number, number]),
    [points]
  );

  const upsertMeasurement = (layer: L.Layer) => {
    const m = measureLayer(layer);
    if (!m) return;
    const id = L.stamp(layer);
    setMeasurements((prev) => [...prev.filter((x) => x.id !== id), { id, ...m }]);
  };

  useEffect(() => {
    void fetchRBMCStations().then(setRbmcStations);
  }, []);

  // ===== Perfil do terreno (DEM) ao longo de uma linha desenhada =====
  const [profile, setProfile] = useState<{
    loading: boolean;
    error?: string;
    id?: number;
    data?: Array<{ distKm: number; elevation: number }>;
  }>({ loading: false });

  const fetchTerrainProfile = async (id: number, pts: Array<{ lat: number; lon: number }>) => {
    setProfile({ loading: true });
    try {
      // amostra a cada ~90 m (passo do GLO-90), teto de 220 amostras
      const STEP_M = 90;
      const samples: Array<{ lat: number; lon: number }> = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const seg = haversineDistance(a, b);
        const n = Math.max(1, Math.min(200, Math.round(seg / STEP_M)));
        for (let k = 0; k < n; k++) {
          const t = k / n;
          samples.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
          if (samples.length >= 220) break;
        }
        if (samples.length >= 220) break;
      }
      samples.push(pts[pts.length - 1]);

      const elevations = await fetchTerrainElevationBatch(samples);
      let distKm = 0;
      const data: Array<{ distKm: number; elevation: number }> = [];
      elevations.forEach((elev, i) => {
        if (i > 0) distKm += haversineDistance(samples[i - 1], samples[i]) / 1000;
        if (elev !== null) data.push({ distKm: Number(distKm.toFixed(3)), elevation: Number(elev.toFixed(1)) });
      });
      if (data.length === 0) {
        setProfile({ loading: false, error: 'Nenhuma amostra retornada pelo DEM aberto.' });
        return;
      }
      setProfile({ loading: false, id, data });
    } catch (err) {
      setProfile({ loading: false, error: err instanceof Error ? err.message : 'Falha ao amostrar o DEM.' });
    }
  };

  const exportProfileCsv = () => {
    if (!profile.data) return;
    const csv = ['distancia_km,altitude_terreno_m', ...profile.data.map((d) => `${d.distKm},${d.elevation}`)].join(
      '\n'
    );
    downloadText(csv, 'geoalt_perfil_terreno.csv', 'text/csv;charset=utf-8;');
  };

  // Center map on Brazil or the first point
  const center: [number, number] =
    points.length > 0 ? [parseFloat(points[0].lat), parseFloat(points[0].long)] : [-15.7801, -47.9292];

  const zoom = points.length > 0 ? 10 : 4;

  if (points.length === 0) {
    return (
      <div className="h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center transition-colors duration-200">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <MapIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Mapa Vazio</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Faça o upload de um arquivo CSV ou calcule pontos manualmente para visualizá-los no mapa.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative z-0 h-[600px] flex flex-col transition-colors duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Preview dos Pontos ({points.length})
          </h3>
          <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full hidden sm:inline-block">
            Camadas Disponíveis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={connectPoints}
              onChange={(e) => setConnectPoints(e.target.checked)}
              className="accent-ibge-light-blue"
            />
            Ligar pontos
            {connectPoints && points.length > 1 && (
              <span className="font-mono text-ibge-blue dark:text-ibge-light-blue">
                ≈{' '}
                {(
                  polylineLength(points.map((p) => ({ lat: parseFloat(p.lat), lon: parseFloat(p.long) }))) / 1000
                ).toFixed(2)}{' '}
                km
              </span>
            )}
          </label>
          <button
            onClick={() => exportCSV(points)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ibge-blue text-white rounded-md text-sm font-bold hover:bg-ibge-blue/90 transition-all cursor-pointer shadow-sm active:scale-95 shadow-ibge-blue/20"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => exportKML(points)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-ibge-blue/30 dark:border-ibge-blue/50 text-ibge-blue dark:text-ibge-light-blue rounded-md text-sm font-bold hover:bg-ibge-blue/5 dark:hover:bg-ibge-blue/10 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" /> KML
          </button>
          <button
            onClick={() => exportDXF(points)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-ibge-gold/30 dark:border-ibge-gold/50 text-ibge-gold dark:text-ibge-gold rounded-md text-sm font-bold hover:bg-ibge-gold/5 dark:hover:bg-ibge-gold/10 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" /> DXF
          </button>
        </div>
      </div>

      <div className="flex-1 relative z-0">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} className="z-0">
          <FitBoundsControl coords={pointCoords} maxZoom={13} />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Satélite (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Terreno (OpenTopoMap)">
              <TileLayer
                attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay name="Biomas do Brasil (IBGE)">
              <WMSTileLayer
                url="https://geoservicos.ibge.gov.br/geoserver/ows"
                layers="CGEO:IG_Biomas_250_mil"
                format="image/png"
                transparent={true}
                opacity={0.6}
              />
            </LayersControl.Overlay>

            <LayersControl.Overlay name="Estações RBMC (IBGE)" checked>
              <FeatureGroup>
                {rbmcStations.map((station) => (
                  <Marker key={station.id} position={[station.latitude, station.longitude]} icon={rbmcIcon}>
                    <Popup>
                      <div className="text-sm dark:text-slate-800 p-1">
                        <div className="flex items-center gap-2 mb-2 text-red-600">
                          <Radio className="w-4 h-4" />
                          <p className="font-bold">Estação RBMC: {station.sigla}</p>
                        </div>
                        <p>
                          <strong>Nome:</strong> {station.nome}
                        </p>
                        <p>
                          <strong>Local:</strong> {station.municipio} - {station.uf}
                        </p>
                        <p>
                          <strong>Status:</strong> {station.situacao}
                        </p>
                        <div className="mt-3 pt-2 border-t border-slate-200">
                          <a
                            href={`https://www.ibge.gov.br/geociencias/informacoes-sobre-posicionamento-geodesico/rede-geodesica/16253-rbmc-rede-brasileira-de-monitoramento-continuo-dos-sistemas-gnss.html?&t=situacao-operacional-e-dados-diarios&id=${station.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver no IBGE
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </FeatureGroup>
            </LayersControl.Overlay>

            {shapefileData && (
              <LayersControl.Overlay name="Camada Shapefile" checked>
                <GeoJSON
                  data={Array.isArray(shapefileData) ? shapefileData[0] : shapefileData}
                  style={{
                    color: '#eab308', // ibge-gold
                    weight: 2,
                    fillOpacity: 0.2,
                  }}
                />
              </LayersControl.Overlay>
            )}
          </LayersControl>

          {connectPoints && points.length > 1 && (
            <Polyline
              positions={points.map((p) => [parseFloat(p.lat), parseFloat(p.long)] as [number, number])}
              pathOptions={{ color: '#00a1e4', weight: 2.5, dashArray: '6 8', opacity: 0.9 }}
            />
          )}

          <FeatureGroup>
            <EditControl
              position="topleft"
              draw={{
                rectangle: true,
                polygon: true,
                circle: true,
                circlemarker: false,
                marker: true,
                polyline: true,
              }}
              onCreated={(e: L.DrawEvents.Created) => upsertMeasurement(e.layer)}
              onEdited={(e: L.DrawEvents.Edited) => e.layers.eachLayer((layer) => upsertMeasurement(layer))}
              onDeleted={(e: L.DrawEvents.Deleted) => {
                const removed: number[] = [];
                e.layers.eachLayer((layer) => removed.push(L.stamp(layer)));
                setMeasurements((prev) => prev.filter((m) => !removed.includes(m.id)));
              }}
            />
          </FeatureGroup>

          {measurements.length > 0 && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 max-w-xs text-sm">
              {' '}
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-ibge-blue" />
                  Medições do desenho
                </p>
                <button
                  type="button"
                  onClick={() => setMeasurements([])}
                  aria-label="Limpar lista de medições"
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  limpar
                </button>
              </div>
              {profile.error && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mb-2" role="alert">
                  {profile.error}
                </p>
              )}
              <ul className="space-y-1.5">
                {measurements.map((m) => (
                  <li key={m.id} className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {m.label}
                    {m.detail && <span className="block text-slate-400 dark:text-slate-500">{m.detail}</span>}
                    {m.points && (
                      <button
                        type="button"
                        onClick={() => void fetchTerrainProfile(m.id, m.points!)}
                        disabled={profile.loading}
                        className="mt-1 text-[11px] font-sans font-medium text-ibge-blue dark:text-ibge-light-blue hover:underline disabled:opacity-50"
                      >
                        {profile.loading ? 'Amostrando DEM…' : '⛰ Perfil do terreno (DEM aberto)'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.data && profile.data.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 z-[1100] bg-white/97 dark:bg-slate-900/97 backdrop-blur rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  Perfil do terreno (linha desenhada) ·{' '}
                  <span className="font-mono text-xs font-normal">DEM Copernicus GLO-90 · Open-Meteo</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={exportProfileCsv}
                    className="text-xs font-medium text-ibge-blue dark:text-ibge-light-blue hover:underline"
                  >
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfile({ loading: false })}
                    aria-label="Fechar perfil"
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }} data={profile.data}>
                    <defs>
                      <linearGradient id="terrainFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00a859" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#00a859" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.14} />
                    <XAxis
                      dataKey="distKm"
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      tickFormatter={(v: number) => v.toFixed(1)}
                      unit=" km"
                    />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} width={44} unit=" m" />
                    <Area
                      type="monotone"
                      dataKey="elevation"
                      stroke="#00a859"
                      strokeWidth={2}
                      fill="url(#terrainFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 text-[11px]">
            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px] mb-1.5">
              Altitude ortométrica (H)
            </p>
            <div className="space-y-1">
              {(
                [
                  ['#3b82f6', '< 100 m'],
                  ['#10b981', '100 – 500 m'],
                  ['#f59e0b', '500 – 1.000 m'],
                  ['#ef4444', '≥ 1.000 m'],
                  ['#64748b', 'sem H'],
                ] as Array<[string, string]>
              ).map(([color, label]) => (
                <div key={label} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
            {points.map((res, idx) => (
              <Marker key={idx} position={[parseFloat(res.lat), parseFloat(res.long)]} icon={createCustomIcon(res.H)}>
                <Popup className="custom-popup">
                  <div className="text-sm dark:text-slate-800 p-1">
                    <p className="font-bold text-ibge-blue mb-1 border-b border-slate-100 pb-1">Ponto {idx + 1}</p>
                    <div className="space-y-1 mt-2">
                      <p>
                        <strong className="text-slate-500">Lat:</strong> {res.lat}
                      </p>
                      <p>
                        <strong className="text-slate-500">Lon:</strong> {res.long}
                      </p>
                      {res.h !== undefined && (
                        <p>
                          <strong className="text-slate-500">Alt. Geométrica (h):</strong> {res.h.toFixed(3)}m
                        </p>
                      )}
                      <p>
                        <strong className="text-slate-500">Ondulação (N):</strong>{' '}
                        <span className="text-ibge-blue font-medium">
                          {res.fator_conversao}
                          {typeof res.fator_conversao === 'number' ? 'm' : ''}
                        </span>
                      </p>
                      {res.H !== undefined && (
                        <p>
                          <strong className="text-slate-500">Alt. Ortométrica (H):</strong>{' '}
                          <span className="text-ibge-green font-bold">{res.H.toFixed(3)}m</span>
                        </p>
                      )}
                      {res.address && (
                        <p className="mt-2 pt-2 border-t border-slate-100 italic text-slate-600">
                          <strong className="not-italic text-slate-500">Localização:</strong> {res.address}
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}

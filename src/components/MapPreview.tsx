import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, FeatureGroup, WMSTileLayer } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { HgeoResult } from '../lib/api';
import { exportCSV, exportKML, exportDXF } from '../lib/export';
import { Map as MapIcon, Layers, Download } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function MapPreview({ points }: { points: HgeoResult[] }) {
  // Center map on Brazil or the first point
  const center: [number, number] = points.length > 0 
    ? [parseFloat(points[0].lat), parseFloat(points[0].long)]
    : [-15.7801, -47.9292];

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
          <button onClick={() => exportCSV(points)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => exportKML(points)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
            <Download className="w-4 h-4" /> KML
          </button>
          <button onClick={() => exportDXF(points)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
            <Download className="w-4 h-4" /> DXF
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative z-0">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Satélite (Esri)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
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
          </LayersControl>

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
            />
          </FeatureGroup>

          {points.map((res, idx) => (
            <Marker key={idx} position={[parseFloat(res.lat), parseFloat(res.long)]}>
              <Popup>
                <div className="text-sm dark:text-slate-800">
                  <p className="font-semibold mb-1">Ponto {idx + 1}</p>
                  <p><strong>Lat:</strong> {res.lat}</p>
                  <p><strong>Lon:</strong> {res.long}</p>
                  {res.h !== undefined && <p><strong>Alt. Geométrica (h):</strong> {res.h.toFixed(3)}m</p>}
                  <p><strong>Ondulação (N):</strong> <span className="text-indigo-600 font-medium">{res.fator_conversao}{typeof res.fator_conversao === 'number' ? 'm' : ''}</span></p>
                  {res.H !== undefined && <p><strong>Alt. Ortométrica (H):</strong> <span className="text-emerald-600 font-medium">{res.H.toFixed(3)}m</span></p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

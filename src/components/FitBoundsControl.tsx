import { useCallback, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

/**
 * Zoom to layer: ajusta os limites do mapa para todos os pontos (auto ao
 * montar/atualizar) e expõe um botão flutuante para refit manual.
 * `coords` deve ser memoizado no pai para não refitar a cada render.
 */
export function FitBoundsControl({ coords, maxZoom = 14 }: { coords: Array<[number, number]>; maxZoom?: number }) {
  const map = useMap();

  const fit = useCallback(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], Math.min(13, map.getMaxZoom() || 13));
      return;
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom });
  }, [map, coords, maxZoom]);

  useEffect(() => {
    // pequeno atraso: garante que o container já tem tamanho ao montar em aba
    const timer = window.setTimeout(fit, 60);
    return () => window.clearTimeout(timer);
  }, [fit]);

  return (
    <div className="absolute right-[10px] top-[104px] z-[1000]">
      <button
        type="button"
        onClick={fit}
        title="Ajustar zoom para os pontos"
        aria-label="Ajustar zoom para os pontos"
        className="w-[34px] h-[34px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-md flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-ibge-blue dark:hover:text-ibge-light-blue transition-colors"
      >
        <Crosshair className="w-4 h-4" />
      </button>
    </div>
  );
}

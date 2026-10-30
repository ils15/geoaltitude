export interface Address {
  displayName: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface ForwardGeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
}

const NOMINATIM_HEADERS = {
  'Accept-Language': 'pt-BR',
  'User-Agent': 'OpenGeoaltitude-App',
} as const;

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const optionalString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Geocodificação direta (nome de lugar → coordenadas) via Nominatim/OSM. */
export async function forwardGeocode(query: string, limit = 5): Promise<ForwardGeocodeResult[] | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}`,
      { headers: { ...NOMINATIM_HEADERS } }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return null;

    const results: ForwardGeocodeResult[] = [];
    for (const item of data) {
      const rec = asRecord(item);
      const lat = typeof rec.lat === 'string' || typeof rec.lat === 'number' ? parseFloat(String(rec.lat)) : NaN;
      const lon = typeof rec.lon === 'string' || typeof rec.lon === 'number' ? parseFloat(String(rec.lon)) : NaN;
      if (typeof rec.display_name === 'string' && Number.isFinite(lat) && Number.isFinite(lon)) {
        results.push({ displayName: rec.display_name, lat, lon });
      }
    }
    return results;
  } catch (error) {
    console.error('Error in forwardGeocode:', error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<Address | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { ...NOMINATIM_HEADERS } }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = asRecord(await response.json());
    const displayName = optionalString(data.display_name);
    if (!displayName) return null;

    const address = asRecord(data.address);
    return {
      displayName,
      neighbourhood: optionalString(address.neighbourhood) ?? optionalString(address.suburb),
      city: optionalString(address.city) ?? optionalString(address.town) ?? optionalString(address.village),
      state: optionalString(address.state),
      country: optionalString(address.country),
    };
  } catch (error) {
    console.error('Error in reverseGeocode:', error);
    return null;
  }
}

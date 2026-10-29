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

/** Geocodificação direta (nome de lugar → coordenadas) via Nominatim/OSM. */
export async function forwardGeocode(query: string, limit = 5): Promise<ForwardGeocodeResult[] | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}`,
      {
        headers: {
          'Accept-Language': 'pt-BR',
          'User-Agent': 'GeoAlt-App'
        }
      }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    return data.map((d: any) => ({
      displayName: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }));
  } catch (error) {
    console.error('Error in forwardGeocode:', error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<Address | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR',
          'User-Agent': 'GeoAlt-App'
        }
      }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    
    return {
      displayName: data.display_name,
      neighbourhood: data.address.neighbourhood || data.address.suburb,
      city: data.address.city || data.address.town || data.address.village,
      state: data.address.state,
      country: data.address.country
    };
  } catch (error) {
    console.error('Error in reverseGeocode:', error);
    return null;
  }
}

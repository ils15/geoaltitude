export interface Address {
  displayName: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  country?: string;
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

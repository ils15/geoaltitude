export function isValidCoordinate(lat: number, lon: number): boolean {
  // Extensões aproximadas do Brasil
  // Latitude: Entre -34 e 6
  // Longitude: Entre -74 e -32
  return lat >= -34 && lat <= 6 && lon >= -74 && lon <= -32;
}

export function gmsToDec(g: number, m: number, s: number): number {
  const sign = g < 0 ? -1 : 1;
  return sign * (Math.abs(g) + m / 60 + s / 3600);
}

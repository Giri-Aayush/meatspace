const R = 6_371_000; // Earth radius in metres

export function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isWithinRadius(
  lat: number,
  lng: number,
  targetLat: number,
  targetLng: number,
  radiusM: number
): boolean {
  return haversineMetres(lat, lng, targetLat, targetLng) <= radiusM;
}

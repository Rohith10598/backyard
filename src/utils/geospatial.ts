export type Unit = 'meters' | 'feet' | 'inches';

const EARTH_RADIUS_METERS = 6371000;

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function calculatePolygonArea(
  coordinates: Array<{ lat: number; lng: number }>
): number {
  if (coordinates.length < 3) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let area = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const lat1 = coordinates[i].lat;
    const lng1 = coordinates[i].lng;
    const lat2 = coordinates[(i + 1) % coordinates.length].lat;
    const lng2 = coordinates[(i + 1) % coordinates.length].lng;

    area +=
      Math.sin(toRad(lng2 - lng1)) *
      (Math.cos(toRad(lat1)) + Math.cos(toRad(lat2)));
  }

  area = Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
  return area;
}

export function calculatePerimeter(
  coordinates: Array<{ lat: number; lng: number }>
): number {
  if (coordinates.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const current = coordinates[i];
    const next = coordinates[(i + 1) % coordinates.length];
    perimeter += calculateDistance(current.lat, current.lng, next.lat, next.lng);
  }

  return perimeter;
}

export function convertDistance(
  distance: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  const metersValue =
    fromUnit === 'meters'
      ? distance
      : fromUnit === 'feet'
        ? distance * 0.3048
        : (distance * 0.0254); // inches to meters

  const result =
    toUnit === 'meters'
      ? metersValue
      : toUnit === 'feet'
        ? metersValue / 0.3048
        : metersValue / 0.0254;

  return result;
}

export function convertArea(
  area: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  const squareMetersValue =
    fromUnit === 'meters'
      ? area
      : fromUnit === 'feet'
        ? area * (0.3048 * 0.3048)
        : (area * (0.0254 * 0.0254)); // square inches to square meters

  const result =
    toUnit === 'meters'
      ? squareMetersValue
      : toUnit === 'feet'
        ? squareMetersValue / (0.3048 * 0.3048)
        : squareMetersValue / (0.0254 * 0.0254);

  return result;
}

export function formatDistance(distance: number, unit: Unit): string {
  const converted = convertDistance(distance, 'meters', unit);
  const suffix = unit === 'meters' ? 'm' : unit === 'feet' ? 'ft' : 'in';
  return `${converted.toFixed(2)} ${suffix}`;
}

export function formatArea(area: number, unit: Unit): string {
  const converted = convertArea(area, 'meters', unit);
  const suffix = unit === 'meters' ? 'm²' : unit === 'feet' ? 'ft²' : 'in²';
  return `${converted.toFixed(2)} ${suffix}`;
}

export interface SnapConfig {
  enabled: boolean;
  distanceThreshold: number;
  angleSnapping: boolean;
  gridSnapping: boolean;
  vertexSnapping: boolean;
}

export interface SnapPoint {
  lat: number;
  lng: number;
  type: 'vertex' | 'angle' | 'grid';
  distance: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const getDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const EARTH_RADIUS_METERS = 6371000;
  return EARTH_RADIUS_METERS * c;
};

export const getAngleDegrees = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  let angle = toDeg(Math.atan2(dLng, dLat));
  if (angle < 0) angle += 360;
  return angle;
};

export const snapToNearbyVertex = (
  currentLat: number,
  currentLng: number,
  vertices: Array<{ lat: number; lng: number; id: string }>,
  draggedVertexId: string | null,
  threshold: number
): SnapPoint | null => {
  let closestVertex: SnapPoint | null = null;

  for (const vertex of vertices) {
    if (vertex.id === draggedVertexId) continue;

    const distance = getDistance(currentLat, currentLng, vertex.lat, vertex.lng);
    if (distance < threshold && (!closestVertex || distance < closestVertex.distance)) {
      closestVertex = {
        lat: vertex.lat,
        lng: vertex.lng,
        type: 'vertex',
        distance,
      };
    }
  }

  return closestVertex;
};

export const snapToAngle = (
  currentLat: number,
  currentLng: number,
  previousLat: number,
  previousLng: number,
  targetAngleDegrees: number[],
  distanceToSnap: number,
  threshold: number
): SnapPoint | null => {
  const currentAngle = getAngleDegrees(previousLat, previousLng, currentLat, currentLng);

  for (const target of targetAngleDegrees) {
    let angleDiff = Math.abs(currentAngle - target);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    if (angleDiff < threshold) {
      const rad = toRad(target);
      const newLat = previousLat + (distanceToSnap / 6371000) * Math.cos(rad) * (180 / Math.PI);
      const newLng =
        previousLng +
        ((distanceToSnap / 6371000) * Math.sin(rad) * (180 / Math.PI)) /
          Math.cos(toRad(previousLat));

      return {
        lat: newLat,
        lng: newLng,
        type: 'angle',
        distance: angleDiff,
      };
    }
  }

  return null;
};

export const snapToGrid = (
  lat: number,
  lng: number,
  gridSize: number
): SnapPoint => {
  const snappedLat = Math.round(lat / gridSize) * gridSize;
  const snappedLng = Math.round(lng / gridSize) * gridSize;
  const distance = getDistance(lat, lng, snappedLat, snappedLng);

  return {
    lat: snappedLat,
    lng: snappedLng,
    type: 'grid',
    distance,
  };
};

export const applySnapping = (
  currentLat: number,
  currentLng: number,
  vertices: Array<{ lat: number; lng: number; id: string }>,
  draggedVertexId: string | null,
  config: SnapConfig,
  zoomLevel: number
): { lat: number; lng: number; snapPoint: SnapPoint | null } => {
  if (!config.enabled || vertices.length < 2) {
    return { lat: currentLat, lng: currentLng, snapPoint: null };
  }

  const snapPoints: SnapPoint[] = [];

  // Vertex snapping
  if (config.vertexSnapping) {
    const vertexSnap = snapToNearbyVertex(
      currentLat,
      currentLng,
      vertices,
      draggedVertexId,
      config.distanceThreshold
    );
    if (vertexSnap) snapPoints.push(vertexSnap);
  }

  // Angle snapping
  if (config.angleSnapping && draggedVertexId && vertices.length >= 2) {
    const draggedIndex = vertices.findIndex((v) => v.id === draggedVertexId);
    if (draggedIndex >= 0) {
      const previousVertex = vertices[(draggedIndex - 1 + vertices.length) % vertices.length];
      const distanceToSnap = getDistance(
        previousVertex.lat,
        previousVertex.lng,
        currentLat,
        currentLng
      );

      const angleSnap = snapToAngle(
        currentLat,
        currentLng,
        previousVertex.lat,
        previousVertex.lng,
        [0, 45, 90, 135, 180, 225, 270, 315],
        distanceToSnap,
        5
      );

      if (angleSnap) snapPoints.push(angleSnap);
    }
  }

  // Grid snapping
  if (config.gridSnapping) {
    const gridSize = Math.pow(10, Math.ceil(Math.log10(config.distanceThreshold * 5)));
    const gridSnap = snapToGrid(currentLat, currentLng, gridSize / 6371000 / 100);
    snapPoints.push(gridSnap);
  }

  // Find closest snap point
  if (snapPoints.length > 0) {
    const closest = snapPoints.reduce((prev, current) =>
      current.distance < prev.distance ? current : prev
    );

    if (closest.distance < config.distanceThreshold) {
      return { lat: closest.lat, lng: closest.lng, snapPoint: closest };
    }
  }

  return { lat: currentLat, lng: currentLng, snapPoint: null };
};

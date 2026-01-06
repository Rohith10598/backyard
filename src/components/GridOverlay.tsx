import { useEffect, useRef } from 'react';

interface GridOverlayProps {
  mapInstance: google.maps.Map | null;
  spacing: number;
  visible: boolean;
}

const EARTH_RADIUS_METERS = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function GridOverlay({ mapInstance, spacing, visible }: GridOverlayProps) {
  const polylineRefsRef = useRef<google.maps.Polyline[]>([]);
  const listenerRefsRef = useRef<google.maps.MapsEventListener[]>([]);

  const renderGrid = () => {
    if (!mapInstance || !visible || spacing <= 0) {
      polylineRefsRef.current.forEach((line) => line.setMap(null));
      polylineRefsRef.current = [];
      return;
    }

    const bounds = mapInstance.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const minLat = sw.lat();
    const maxLat = ne.lat();
    const minLng = sw.lng();
    const maxLng = ne.lng();

    const gridStepDegrees = spacing / EARTH_RADIUS_METERS / (Math.PI / 180);

    const startLat = Math.floor(minLat / gridStepDegrees) * gridStepDegrees;
    const endLat = Math.ceil(maxLat / gridStepDegrees) * gridStepDegrees;
    const startLng = Math.floor(minLng / gridStepDegrees) * gridStepDegrees;
    const endLng = Math.ceil(maxLng / gridStepDegrees) * gridStepDegrees;

    polylineRefsRef.current.forEach((line) => line.setMap(null));
    polylineRefsRef.current = [];

    // Horizontal lines (east-west, constant latitude)
    for (let lat = startLat; lat <= endLat; lat += gridStepDegrees) {
      const path: google.maps.LatLngLiteral[] = [];
      for (let lng = startLng; lng <= endLng; lng += gridStepDegrees / 10) {
        path.push({ lat, lng });
      }

      const polyline = new google.maps.Polyline({
        path,
        map: mapInstance,
        geodesic: true,
        strokeColor: '#4a5568',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        zIndex: 0,
      });

      polylineRefsRef.current.push(polyline);
    }

    // Vertical lines (north-south, constant longitude)
    for (let lng = startLng; lng <= endLng; lng += gridStepDegrees) {
      const path: google.maps.LatLngLiteral[] = [];
      for (let lat = startLat; lat <= endLat; lat += gridStepDegrees / 10) {
        path.push({ lat, lng });
      }

      const polyline = new google.maps.Polyline({
        path,
        map: mapInstance,
        geodesic: true,
        strokeColor: '#4a5568',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        zIndex: 0,
      });

      polylineRefsRef.current.push(polyline);
    }
  };

  useEffect(() => {
    if (!mapInstance) {
      return;
    }

    listenerRefsRef.current.forEach((listener) => listener.remove());
    listenerRefsRef.current = [];

    if (visible) {
      renderGrid();

      const boundsChangedListener = mapInstance.addListener('bounds_changed', renderGrid);
      listenerRefsRef.current.push(boundsChangedListener);
    } else {
      polylineRefsRef.current.forEach((line) => line.setMap(null));
      polylineRefsRef.current = [];
    }

    return () => {
      listenerRefsRef.current.forEach((listener) => listener.remove());
      listenerRefsRef.current = [];
      polylineRefsRef.current.forEach((line) => line.setMap(null));
      polylineRefsRef.current = [];
    };
  }, [mapInstance, spacing, visible]);

  return null;
}

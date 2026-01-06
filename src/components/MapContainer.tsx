import { useEffect, useRef, useState } from 'react';
import { Plus, X, MapPin, Maximize2 } from 'lucide-react';
import { PolygonDrawer } from './PolygonDrawer';
import { MeasurementOverlay } from './MeasurementOverlay';
import { NorthArrow } from './NorthArrow';
import { SnapTools } from './SnapTools';
import { SnapIndicator } from './SnapIndicator';
import { GridOverlay } from './GridOverlay';
import { GridControls } from './GridControls';
import type { Unit } from '../utils/geospatial';
import type { SnapConfig, SnapPoint } from '../utils/snapping';
import { applySnapping } from '../utils/snapping';

interface MapContainerProps {
  address: string;
}

export function MapContainer({ address }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>('meters');
  const [showPolygonUI, setShowPolygonUI] = useState(false);
  const [vertices, setVertices] = useState<Array<{ lat: number; lng: number; id: string }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedVertex, setDraggedVertex] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<{
    perimeter: number;
    area: number;
    sideLengths: number[];
  } | null>(null);
  const [snapConfig, setSnapConfig] = useState<SnapConfig>({
    enabled: false,
    distanceThreshold: 10,
    angleSnapping: true,
    gridSnapping: false,
    vertexSnapping: true,
  });
  const [snapPoint, setSnapPoint] = useState<SnapPoint | null>(null);
  const [gridVisible, setGridVisible] = useState(false);
  const [gridSpacing, setGridSpacing] = useState(10);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markerRefsRef = useRef<Map<string, google.maps.Marker>>(new Map());

  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (!mapRef.current) {
          setError('Map container not found');
          setIsLoading(false);
          return;
        }

        const { Map } = await google.maps.importLibrary('maps') as typeof google.maps;
        const { Geocoder } = await google.maps.importLibrary('geocoding') as typeof google.maps;

        mapInstanceRef.current = new Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 12,
          tilt: 0,
          mapTypeId: 'satellite',
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
        });

        geocoderRef.current = new Geocoder();
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize Google Maps.');
        setIsLoading(false);
      }
    };

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key is missing.');
      setIsLoading(false);
      return;
    }

    if (window.google?.maps) {
      initializeMap();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', initializeMap, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding,places,marker,geometry`;
    script.async = true;

    const handleScriptLoad = () => {
      initializeMap();
    };

    script.addEventListener('load', handleScriptLoad, { once: true });
    script.addEventListener('error', () => {
      console.error('Failed to load Google Maps script');
      setError('Failed to load Google Maps. Please check your API key.');
      setIsLoading(false);
    }, { once: true });

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!address || !geocoderRef.current || !mapInstanceRef.current) return;

    setError(null);
    geocoderRef.current.geocode(
      { address },
      async (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          mapInstanceRef.current?.setCenter(location);
          mapInstanceRef.current?.setZoom(18);

          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          try {
            const { Marker } = await google.maps.importLibrary('marker') as typeof google.maps;
            markerRef.current = new Marker({
              position: location,
              map: mapInstanceRef.current,
              title: address,
            });
          } catch (err) {
            console.error('Error loading Marker library:', err);
          }
        } else if (status === 'ZERO_RESULTS') {
          setError('Address not found. Please try another.');
        } else {
          setError('Failed to geocode address. Please try again.');
        }
      }
    );
  }, [address]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isDrawing) return;

    const handleMapClick = (event: google.maps.MapMouseEvent) => {
      if (draggedVertex) return;

      const newVertex = {
        lat: event.latLng!.lat(),
        lng: event.latLng!.lng(),
        id: Date.now().toString(),
      };

      setVertices((prev) => [...prev, newVertex]);
    };

    const handleMapDoubleClick = (event: google.maps.MapMouseEvent) => {
      event.preventDefault();
      if (vertices.length >= 3) {
        closePolygon();
      }
    };

    const handleMouseMove = (event: google.maps.MapMouseEvent) => {
      if (!draggedVertex || !mapInstanceRef.current) return;

      const position = event.latLng;
      if (!position) return;

      const { lat: snappedLat, lng: snappedLng, snapPoint: detectedSnap } = applySnapping(
        position.lat(),
        position.lng(),
        vertices,
        draggedVertex,
        snapConfig,
        mapInstanceRef.current.getZoom() || 12
      );

      setSnapPoint(detectedSnap);

      setVertices((prev) =>
        prev.map((v) =>
          v.id === draggedVertex
            ? { ...v, lat: snappedLat, lng: snappedLng }
            : v
        )
      );

      const marker = markerRefsRef.current.get(draggedVertex);
      if (marker) {
        marker.position = new google.maps.LatLng(snappedLat, snappedLng);
      }

      updateMeasurements([...vertices]);
    };

    mapInstanceRef.current.addListener('click', handleMapClick);
    mapInstanceRef.current.addListener('dblclick', handleMapDoubleClick);
    mapInstanceRef.current.addListener('mousemove', handleMouseMove);

    return () => {
      google.maps.event.clearListeners(mapInstanceRef.current, 'click');
      google.maps.event.clearListeners(mapInstanceRef.current, 'dblclick');
      google.maps.event.clearListeners(mapInstanceRef.current, 'mousemove');
    };
  }, [isDrawing, draggedVertex, vertices, snapConfig]);

  useEffect(() => {
    if (!mapInstanceRef.current || vertices.length === 0) return;

    const path = vertices.map((v) => ({ lat: v.lat, lng: v.lng }));

    if (vertices.length >= 2) {
      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          map: mapInstanceRef.current,
          path,
          geodesic: true,
          strokeColor: '#4f46e5',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          zIndex: 1,
        });
      } else {
        polylineRef.current.setPath(path);
      }
    }

    markerRefsRef.current.forEach((marker) => marker.setMap(null));
    markerRefsRef.current.clear();

    vertices.forEach((vertex) => {
      const marker = new google.maps.Marker({
        position: { lat: vertex.lat, lng: vertex.lng },
        map: mapInstanceRef.current,
        cursor: 'grab',
        title: `Vertex`,
      });

      marker.addListener('mousedown', () => setDraggedVertex(vertex.id));
      mapInstanceRef.current?.addListener('mouseup', () => setDraggedVertex(null));

      markerRefsRef.current.set(vertex.id, marker);
    });

    updateMeasurements(vertices);
  }, [vertices]);

  const { calculateDistance, calculatePerimeter, calculatePolygonArea } = (() => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const EARTH_RADIUS_METERS = 6371000;

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return EARTH_RADIUS_METERS * c;
    };

    const calculatePerimeter = (coords: Array<{ lat: number; lng: number }>): number => {
      if (coords.length < 2) return 0;
      let perimeter = 0;
      for (let i = 0; i < coords.length; i++) {
        const current = coords[i];
        const next = coords[(i + 1) % coords.length];
        perimeter += calculateDistance(current.lat, current.lng, next.lat, next.lng);
      }
      return perimeter;
    };

    const calculatePolygonArea = (coords: Array<{ lat: number; lng: number }>): number => {
      if (coords.length < 3) return 0;
      let area = 0;
      for (let i = 0; i < coords.length; i++) {
        const lat1 = coords[i].lat;
        const lng1 = coords[i].lng;
        const lat2 = coords[(i + 1) % coords.length].lat;
        const lng2 = coords[(i + 1) % coords.length].lng;
        area += Math.sin(toRad(lng2 - lng1)) * (Math.cos(toRad(lat1)) + Math.cos(toRad(lat2)));
      }
      area = Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
      return area;
    };

    return { calculateDistance, calculatePerimeter, calculatePolygonArea };
  })();

  const updateMeasurements = (verts: Array<{ lat: number; lng: number; id: string }>) => {
    if (verts.length < 2) {
      setMeasurements(null);
      return;
    }

    const coords = verts.map((v) => ({ lat: v.lat, lng: v.lng }));
    const perimeter = calculatePerimeter(coords);
    const area = verts.length >= 3 ? calculatePolygonArea(coords) : 0;

    const sideLengths = [];
    for (let i = 0; i < verts.length; i++) {
      const current = verts[i];
      const next = verts[(i + 1) % verts.length];
      const distance = calculateDistance(current.lat, current.lng, next.lat, next.lng);
      sideLengths.push(distance);
    }

    setMeasurements({ perimeter, area, sideLengths });
  };

  const startDrawing = () => {
    clearPolygon();
    setIsDrawing(true);
  };

  const closePolygon = () => {
    if (vertices.length < 3 || !mapInstanceRef.current) return;

    setIsDrawing(false);
    const path = vertices.map((v) => ({ lat: v.lat, lng: v.lng }));

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }

    polygonRef.current = new google.maps.Polygon({
      map: mapInstanceRef.current,
      path,
      fillColor: '#4f46e5',
      fillOpacity: 0.2,
      strokeColor: '#4f46e5',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      geodesic: true,
      zIndex: 0,
    });
  };

  const clearPolygon = () => {
    setVertices([]);
    setIsDrawing(false);
    setDraggedVertex(null);
    setMeasurements(null);
    setSnapPoint(null);
    setGridVisible(false);

    markerRefsRef.current.forEach((marker) => marker.setMap(null));
    markerRefsRef.current.clear();

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapRef} className="flex-1 w-full bg-gray-800" style={{ minHeight: '100%' }} />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
          <div className="text-white text-lg">Loading map...</div>
        </div>
      )}

      <NorthArrow mapInstance={mapInstanceRef.current} />

      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-xl p-2 z-10">
        {!showPolygonUI ? (
          <button
            onClick={() => setShowPolygonUI(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <MapPin size={18} />
            Draw Polygon
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {!isDrawing ? (
              <button
                onClick={startDrawing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Start Drawing
              </button>
            ) : (
              <>
                <div className="text-sm font-medium text-gray-700 px-4 py-2">
                  {vertices.length} vertices • Double-click to finish
                </div>
                {vertices.length >= 3 && (
                  <button
                    onClick={closePolygon}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    <Maximize2 size={16} />
                    Close Polygon
                  </button>
                )}
              </>
            )}

            <button
              onClick={clearPolygon}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <X size={18} />
              Clear All
            </button>

            <button
              onClick={() => setShowPolygonUI(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
            >
              Hide
            </button>

            <div className="border-t mt-2 pt-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Units</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnit('meters')}
                  className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
                    unit === 'meters'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  m
                </button>
                <button
                  onClick={() => setUnit('feet')}
                  className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
                    unit === 'feet'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ft
                </button>
                <button
                  onClick={() => setUnit('inches')}
                  className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
                    unit === 'inches'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  in
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {measurements && showPolygonUI && (
        <MeasurementOverlay
          sideLengths={measurements.sideLengths}
          perimeter={measurements.perimeter}
          area={measurements.area}
          unit={unit}
        />
      )}

      <GridOverlay
        mapInstance={mapInstanceRef.current}
        spacing={gridSpacing}
        visible={gridVisible}
      />

      {showPolygonUI && (
        <div className="absolute top-4 right-4 z-10 space-y-3">
          <GridControls
            visible={gridVisible}
            spacing={gridSpacing}
            onVisibilityChange={setGridVisible}
            onSpacingChange={setGridSpacing}
          />
          {isDrawing && (
            <SnapTools
              config={snapConfig}
              onConfigChange={setSnapConfig}
              isVisible={true}
            />
          )}
        </div>
      )}

      <SnapIndicator snapPoint={snapPoint} />

      {error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

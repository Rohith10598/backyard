import { useEffect, useRef, useState } from 'react';
import { Plus, X, MapPin, Download, Edit3 } from 'lucide-react';
import { MeasurementOverlay } from './MeasurementOverlay';
import { NorthArrow } from './NorthArrow';
import { GridOverlay } from './GridOverlay';
import { GridControls } from './GridControls';
import { ExportDialog } from './ExportDialog';
import type { Unit } from '../utils/geospatial';

interface MapContainerProps {
  address: string;
}

export function MapContainer({ address }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>('meters');
  const [showPolygonUI, setShowPolygonUI] = useState(false);
  const [vertices, setVertices] = useState<Array<{ lat: number; lng: number; id: string }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [measurements, setMeasurements] = useState<{
    perimeter: number;
    area: number;
    sideLengths: number[];
  } | null>(null);
  const [gridVisible, setGridVisible] = useState(false);
  const [gridSpacing, setGridSpacing] = useState(10);
  const [showExportDialog, setShowExportDialog] = useState(false);

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

        await initializeDrawingManager();

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding,places,marker,geometry,drawing`;
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

  const initializeDrawingManager = async () => {
    if (!mapInstanceRef.current) return;

    try {
      await google.maps.importLibrary('drawing');

      drawingManagerRef.current = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
          fillColor: '#4f46e5',
          fillOpacity: 0.2,
          strokeColor: '#4f46e5',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          editable: true,
          draggable: false,
          geodesic: true,
        },
      });

      drawingManagerRef.current.setMap(mapInstanceRef.current);

      google.maps.event.addListener(
        drawingManagerRef.current,
        'polygoncomplete',
        (polygon: google.maps.Polygon) => {
          handlePolygonComplete(polygon);
        }
      );
    } catch (err) {
      console.error('Error initializing DrawingManager:', err);
    }
  };

  const handlePolygonComplete = (polygon: google.maps.Polygon) => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }

    polygonRef.current = polygon;
    setIsDrawing(false);

    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }

    extractVerticesFromPolygon(polygon);

    google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
      extractVerticesFromPolygon(polygon);
    });

    google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
      extractVerticesFromPolygon(polygon);
    });

    google.maps.event.addListener(polygon.getPath(), 'remove_at', () => {
      extractVerticesFromPolygon(polygon);
    });
  };

  const extractVerticesFromPolygon = (polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const newVertices = [];

    for (let i = 0; i < path.getLength(); i++) {
      const latLng = path.getAt(i);
      newVertices.push({
        lat: latLng.lat(),
        lng: latLng.lng(),
        id: `${i}`,
      });
    }

    setVertices(newVertices);
    updateMeasurements(newVertices);
  };

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

    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    }
  };

  const clearPolygon = () => {
    setVertices([]);
    setIsDrawing(false);
    setMeasurements(null);
    setGridVisible(false);

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MapPin size={18} />
            Draw Polygon
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {!isDrawing && vertices.length === 0 ? (
              <button
                onClick={startDrawing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Start Drawing
              </button>
            ) : isDrawing ? (
              <div className="text-sm font-medium text-gray-700 px-4 py-2 bg-green-50 rounded border border-green-200">
                Draw polygon by clicking and dragging on the map
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded border border-blue-200">
                <Edit3 size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Edit mode: Drag vertices to adjust
                </span>
              </div>
            )}

            {vertices.length > 0 && (
              <button
                onClick={clearPolygon}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <X size={18} />
                Clear Polygon
              </button>
            )}

            <button
              onClick={() => setShowPolygonUI(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
            >
              Hide
            </button>

            {vertices.length >= 3 && (
              <button
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
              >
                <Download size={18} />
                Export
              </button>
            )}

            <div className="border-t mt-2 pt-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Units</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnit('meters')}
                  className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
                    unit === 'meters'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  m
                </button>
                <button
                  onClick={() => setUnit('feet')}
                  className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
                    unit === 'feet'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ft
                </button>
                <button
                  onClick={() => setUnit('inches')}
                  className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
                    unit === 'inches'
                      ? 'bg-blue-600 text-white'
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
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {measurements && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          vertices={vertices}
          sideLengths={measurements.sideLengths}
          perimeter={measurements.perimeter}
          area={measurements.area}
          unit={unit}
        />
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';

interface EdgeOverlayProps {
  mapInstance: google.maps.Map | null;
  visible: boolean;
}

export function EdgeOverlay({ mapInstance, visible }: EdgeOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapInstance || !visible) return;

    const mapContainer = mapInstance.getDiv();
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();

    if (!containerRef.current) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = '0';
      div.style.left = '0';
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.pointerEvents = 'none';
      div.style.zIndex = '1';
      mapContainer.appendChild(div);
      containerRef.current = div;
    }

    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.opacity = '0.4';
      canvas.style.mixBlendMode = 'screen';
      containerRef.current?.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const handleMapChange = () => {
      if (!canvasRef.current || !containerRef.current) return;

      const newRect = mapContainer.getBoundingClientRect();
      if (
        canvasRef.current.width !== newRect.width ||
        canvasRef.current.height !== newRect.height
      ) {
        canvasRef.current.width = newRect.width;
        canvasRef.current.height = newRect.height;
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const listeners = [
      google.maps.event.addListener(mapInstance, 'dragstart', handleMapChange),
      google.maps.event.addListener(mapInstance, 'dragend', handleMapChange),
      google.maps.event.addListener(mapInstance, 'zoom_changed', handleMapChange),
    ];

    return () => {
      listeners.forEach((listener) => listener.remove());
    };
  }, [mapInstance, visible]);

  useEffect(() => {
    if (!visible && canvasRef.current) {
      canvasRef.current.style.display = 'none';
    } else if (visible && canvasRef.current) {
      canvasRef.current.style.display = 'block';
    }
  }, [visible]);

  return null;
}

import { formatDistance, formatArea, type Unit } from './geospatial';

export interface ExportOptions {
  format: 'png' | 'jpeg';
  dpi: number;
  includeGrid: boolean;
  includeNorthArrow: boolean;
  unit: Unit;
}

interface ExportData {
  vertices: Array<{ lat: number; lng: number }>;
  sideLengths: number[];
  perimeter: number;
  area: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

const DPI_TO_SCALE = {
  72: 1,
  150: 2.08,
  300: 4.17,
};

type DPIValue = keyof typeof DPI_TO_SCALE;

export async function exportPolygonImage(
  data: ExportData,
  options: ExportOptions
): Promise<Blob> {
  const scale = DPI_TO_SCALE[options.dpi as DPIValue] || 1;
  const margin = 40 * scale;
  const canvasWidth = 800 * scale;
  const canvasHeight = 600 * scale;

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.fillStyle = options.format === 'png' ? 'rgba(255, 255, 255, 0)' : '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const { minLat, maxLat, minLng, maxLng } = data.bounds;
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const maxRange = Math.max(latRange, lngRange);

  const pixelWidth = canvasWidth - 2 * margin;
  const pixelHeight = canvasHeight - 2 * margin;

  const latToY = (lat: number) => {
    return (
      canvasHeight -
      margin -
      ((lat - minLat) / maxRange) * pixelHeight
    );
  };

  const lngToX = (lng: number) => {
    return margin + ((lng - minLng) / maxRange) * pixelWidth;
  };

  ctx.strokeStyle = '#4f46e5';
  ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
  ctx.lineWidth = 2 * scale;

  if (data.vertices.length >= 3) {
    ctx.beginPath();
    const firstVertex = data.vertices[0];
    ctx.moveTo(lngToX(firstVertex.lng), latToY(firstVertex.lat));

    for (let i = 1; i < data.vertices.length; i++) {
      const vertex = data.vertices[i];
      ctx.lineTo(lngToX(vertex.lng), latToY(vertex.lat));
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#4f46e5';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1 * scale;

  for (const vertex of data.vertices) {
    const x = lngToX(vertex.lng);
    const y = latToY(vertex.lat);
    ctx.beginPath();
    ctx.arc(x, y, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#333333';
  ctx.font = `${11 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 1 * scale;

  for (let i = 0; i < data.vertices.length; i++) {
    const current = data.vertices[i];
    const next = data.vertices[(i + 1) % data.vertices.length];

    const midLat = (current.lat + next.lat) / 2;
    const midLng = (current.lng + next.lng) / 2;
    const midX = lngToX(midLng);
    const midY = latToY(midLat);

    const distance = data.sideLengths[i];
    const label = formatDistance(distance, options.unit);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(midX - 30 * scale, midY - 10 * scale, 60 * scale, 20 * scale);

    ctx.fillStyle = '#333333';
    ctx.fillText(label, midX, midY + 4 * scale);
  }

  ctx.fillStyle = '#333333';
  ctx.font = `bold ${14 * scale}px Arial`;
  ctx.textAlign = 'left';

  const areaLabel = `Area: ${formatArea(data.area, options.unit)}`;
  const perimeterLabel = `Perimeter: ${formatDistance(data.perimeter, options.unit)}`;

  const labelY = canvasHeight - margin + 20 * scale;
  ctx.fillText(areaLabel, margin, labelY);
  ctx.fillText(perimeterLabel, margin, labelY + 18 * scale);

  ctx.fillStyle = '#999999';
  ctx.font = `${10 * scale}px Arial`;
  ctx.textAlign = 'right';
  ctx.fillText(`${options.dpi} DPI`, canvasWidth - margin, canvasHeight - margin + 10 * scale);

  if (options.format === 'png') {
    return canvas.convertToBlob({ type: 'image/png' });
  } else {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

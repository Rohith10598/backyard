import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { exportPolygonImage, downloadBlob, type ExportOptions } from '../utils/exportService';
import type { Unit } from '../utils/geospatial';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vertices: Array<{ lat: number; lng: number; id: string }>;
  sideLengths: number[];
  perimeter: number;
  area: number;
  unit: Unit;
}

export function ExportDialog({
  isOpen,
  onClose,
  vertices,
  sideLengths,
  perimeter,
  area,
  unit,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [dpi, setDpi] = useState<72 | 150 | 300>(300);
  const [includeGrid, setIncludeGrid] = useState(false);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (vertices.length < 3) {
      setError('Polygon must have at least 3 vertices');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const minLat = Math.min(...vertices.map((v) => v.lat));
      const maxLat = Math.max(...vertices.map((v) => v.lat));
      const minLng = Math.min(...vertices.map((v) => v.lng));
      const maxLng = Math.max(...vertices.map((v) => v.lng));

      const exportData = {
        vertices: vertices.map((v) => ({ lat: v.lat, lng: v.lng })),
        sideLengths,
        perimeter,
        area,
        bounds: { minLat, maxLat, minLng, maxLng },
      };

      const options: ExportOptions = {
        format,
        dpi,
        includeGrid,
        includeNorthArrow,
        unit,
      };

      const blob = await exportPolygonImage(exportData, options);
      const filename = `polygon-export-${Date.now()}.${format}`;
      downloadBlob(blob, filename);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Export Polygon</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="png"
                  checked={format === 'png'}
                  onChange={(e) => setFormat(e.target.value as 'png')}
                  className="w-4 h-4"
                  disabled={isExporting}
                />
                <span className="text-sm text-gray-700">PNG (Transparent)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="jpeg"
                  checked={format === 'jpeg'}
                  onChange={(e) => setFormat(e.target.value as 'jpeg')}
                  className="w-4 h-4"
                  disabled={isExporting}
                />
                <span className="text-sm text-gray-700">JPEG (White BG)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution (DPI)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[72, 150, 300].map((dpiValue) => (
                <button
                  key={dpiValue}
                  onClick={() => setDpi(dpiValue as 72 | 150 | 300)}
                  disabled={isExporting}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    dpi === dpiValue
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {dpiValue} DPI
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGrid}
                onChange={(e) => setIncludeGrid(e.target.checked)}
                className="w-4 h-4"
                disabled={isExporting}
              />
              <span className="text-sm text-gray-700">Include Grid</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNorthArrow}
                onChange={(e) => setIncludeNorthArrow(e.target.checked)}
                className="w-4 h-4"
                disabled={isExporting}
              />
              <span className="text-sm text-gray-700">Include North Arrow</span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

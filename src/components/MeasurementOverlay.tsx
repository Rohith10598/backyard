import { formatArea, formatDistance, type Unit } from '../utils/geospatial';

interface MeasurementOverlayProps {
  sideLengths: number[];
  perimeter: number;
  area: number;
  unit: Unit;
}

export function MeasurementOverlay({
  sideLengths,
  perimeter,
  area,
  unit,
}: MeasurementOverlayProps) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-10">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Measurements</h3>

      {sideLengths.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Side Lengths</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sideLengths.map((length, index) => (
              <div key={index} className="text-xs text-gray-600">
                Side {index + 1}: {formatDistance(length, unit)}
              </div>
            ))}
          </div>
        </div>
      )}

      {perimeter > 0 && (
        <div className="mb-4 border-t pt-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Perimeter:</span> {formatDistance(perimeter, unit)}
          </div>
        </div>
      )}

      {area > 0 && (
        <div className="border-t pt-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Area:</span> {formatArea(area, unit)}
          </div>
        </div>
      )}
    </div>
  );
}

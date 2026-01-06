import type { SnapPoint } from '../utils/snapping';

interface SnapIndicatorProps {
  snapPoint: SnapPoint | null;
}

export function SnapIndicator({ snapPoint }: SnapIndicatorProps) {
  if (!snapPoint) return null;

  const typeColors: Record<string, string> = {
    vertex: 'bg-green-400 shadow-lg shadow-green-400/50',
    angle: 'bg-blue-400 shadow-lg shadow-blue-400/50',
    grid: 'bg-purple-400 shadow-lg shadow-purple-400/50',
  };

  const typeLabels: Record<string, string> = {
    vertex: 'Vertex',
    angle: 'Angle',
    grid: 'Grid',
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-3 z-20 text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${typeColors[snapPoint.type]} animate-pulse`} />
        <span className="font-semibold text-gray-900">
          Snapped to {typeLabels[snapPoint.type]}
        </span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Distance: {(snapPoint.distance * 1000).toFixed(1)}m
      </div>
    </div>
  );
}

import { Eye, EyeOff, Zap } from 'lucide-react';
import type { EdgeDetectionConfig } from '../utils/edgeSnapping';

interface EdgeDetectionControlsProps {
  enabled: boolean;
  overlayVisible: boolean;
  config: Partial<EdgeDetectionConfig>;
  onEnabledChange: (enabled: boolean) => void;
  onOverlayVisibilityChange: (visible: boolean) => void;
  onConfigChange: (config: Partial<EdgeDetectionConfig>) => void;
}

export function EdgeDetectionControls({
  enabled,
  overlayVisible,
  config,
  onEnabledChange,
  onOverlayVisibilityChange,
  onConfigChange,
}: EdgeDetectionControlsProps) {
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      sensitivity: parseFloat(e.target.value),
    });
  };

  const handleSnapDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      maxDistance: parseInt(e.target.value),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm space-y-3 z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Edge Detection</h3>
        <button
          onClick={() => onEnabledChange(!enabled)}
          className={`p-2 rounded transition-colors ${
            enabled
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={enabled ? 'Disable edge detection' : 'Enable edge detection'}
        >
          <Zap size={16} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 border-t pt-3">
          <div>
            <label className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">Sensitivity</span>
              <span className="text-xs text-gray-500">{(config.sensitivity || 0.6).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={config.sensitivity || 0.6}
              onChange={handleSensitivityChange}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">Lower = detect subtle edges, Higher = detect strong edges</p>
          </div>

          <div>
            <label className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">Snap Distance</span>
              <span className="text-xs text-gray-500">{config.maxDistance || 30}px</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={config.maxDistance || 30}
              onChange={handleSnapDistanceChange}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">How close vertex must be to snap to edge</p>
          </div>

          <button
            onClick={() => onOverlayVisibilityChange(!overlayVisible)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
          >
            {overlayVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            {overlayVisible ? 'Hide' : 'Show'} Edge Map
          </button>
        </div>
      )}
    </div>
  );
}

import { Zap } from 'lucide-react';
import type { SnapConfig } from '../utils/snapping';

interface SnapToolsProps {
  config: SnapConfig;
  onConfigChange: (config: SnapConfig) => void;
  isVisible: boolean;
}

export function SnapTools({ config, onConfigChange, isVisible }: SnapToolsProps) {
  if (!isVisible) return null;

  const handleToggleSnapping = () => {
    onConfigChange({ ...config, enabled: !config.enabled });
  };

  const handleToggleAngle = () => {
    onConfigChange({ ...config, angleSnapping: !config.angleSnapping });
  };

  const handleToggleVertex = () => {
    onConfigChange({ ...config, vertexSnapping: !config.vertexSnapping });
  };

  const handleToggleGrid = () => {
    onConfigChange({ ...config, gridSnapping: !config.gridSnapping });
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, distanceThreshold: parseFloat(e.target.value) });
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
        <Zap size={16} className="text-amber-500" />
        Precision Tools
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggleSnapping}
            className="rounded accent-indigo-600"
          />
          <span className="font-medium text-gray-700">Enable Snapping</span>
        </label>

        {config.enabled && (
          <>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={config.angleSnapping}
                onChange={handleToggleAngle}
                className="rounded accent-indigo-600"
              />
              <span className="text-gray-700">Angle Snap (0°, 45°, 90°)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={config.vertexSnapping}
                onChange={handleToggleVertex}
                className="rounded accent-indigo-600"
              />
              <span className="text-gray-700">Snap to Vertices</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={config.gridSnapping}
                onChange={handleToggleGrid}
                className="rounded accent-indigo-600"
              />
              <span className="text-gray-700">Grid Snap</span>
            </label>

            <div className="mt-3 pt-3 border-t space-y-2">
              <label className="text-gray-700 font-medium">
                Snap Distance: {(config.distanceThreshold * 1000).toFixed(0)}m
              </label>
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.5"
                value={config.distanceThreshold}
                onChange={handleThresholdChange}
                className="w-full accent-indigo-600"
              />
              <div className="text-xs text-gray-500 flex justify-between">
                <span>0.1m</span>
                <span>50m</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

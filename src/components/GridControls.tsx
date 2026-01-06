import { Grid3x3 } from 'lucide-react';

interface GridControlsProps {
  visible: boolean;
  spacing: number;
  onVisibilityChange: (visible: boolean) => void;
  onSpacingChange: (spacing: number) => void;
}

const spacingOptions = [
  { value: 1, label: '1m' },
  { value: 5, label: '5m' },
  { value: 10, label: '10m' },
  { value: 50, label: '50m' },
];

export function GridControls({
  visible,
  spacing,
  onVisibilityChange,
  onSpacingChange,
}: GridControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-xl p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
        <Grid3x3 size={16} className="text-blue-500" />
        Grid Overlay
      </div>

      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onVisibilityChange(e.target.checked)}
          className="rounded accent-indigo-600"
        />
        <span className="font-medium text-gray-700">Enable Grid</span>
      </label>

      {visible && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <label className="text-gray-700 font-medium block">Grid Spacing</label>
          <div className="grid grid-cols-2 gap-2">
            {spacingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSpacingChange(option.value)}
                className={`px-3 py-2 rounded font-medium transition-colors ${
                  spacing === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Grid aligned to cardinal directions
          </div>
        </div>
      )}
    </div>
  );
}

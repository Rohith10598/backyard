import { useEffect, useState } from 'react';

interface NorthArrowProps {
  mapInstance: google.maps.Map | null;
}

export function NorthArrow({ mapInstance }: NorthArrowProps) {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    if (!mapInstance) return;

    const updateHeading = () => {
      setHeading(mapInstance.getHeading() || 0);
    };

    const listener = mapInstance.addListener('heading_changed', updateHeading);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [mapInstance]);

  return (
    <div className="absolute left-4 top-20 bg-white rounded-lg shadow-lg p-3 z-10">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        className="transition-transform duration-300"
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        <circle cx="24" cy="24" r="22" fill="none" stroke="#1f2937" strokeWidth="1" />

        <polygon
          points="24,6 30,20 24,18 18,20"
          fill="#ef4444"
          stroke="#991b1b"
          strokeWidth="0.5"
        />

        <polygon
          points="24,42 30,28 24,30 18,28"
          fill="#d1d5db"
          stroke="#6b7280"
          strokeWidth="0.5"
        />

        <line x1="24" y1="24" x2="24" y2="8" stroke="#1f2937" strokeWidth="0.5" />
        <line x1="24" y1="24" x2="24" y2="40" stroke="#9ca3af" strokeWidth="0.5" />

        <text
          x="24"
          y="43"
          textAnchor="middle"
          fontSize="8"
          fill="#1f2937"
          fontWeight="bold"
        >
          N
        </text>
      </svg>
    </div>
  );
}

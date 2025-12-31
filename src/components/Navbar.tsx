import { MapPin } from 'lucide-react';
import { AddressInput } from './AddressInput';

interface NavbarProps {
  onSearch: (address: string) => void;
}

export function Navbar({ onSearch }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-semibold text-gray-900">
              Satellite Map Viewer
            </span>
          </div>

          <AddressInput onSearch={onSearch} />
        </div>
      </div>
    </nav>
  );
}

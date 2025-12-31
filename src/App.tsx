import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { MapContainer } from './components/MapContainer';

function App() {
  const [address, setAddress] = useState('');

  const handleSearch = (newAddress: string) => {
    setAddress(newAddress);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar onSearch={handleSearch} />
      <div className="flex-1">
        <MapContainer address={address} />
      </div>
    </div>
  );
}

export default App;

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Search } from 'lucide-react';

interface Prediction {
  description: string;
  place_id: string;
}

interface AddressInputProps {
  onSearch: (address: string) => void;
}

export function AddressInput({ onSearch }: AddressInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    const initializeAutocomplete = () => {
      try {
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
          autocompleteRef.current = new google.maps.places.AutocompleteService();
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
      } catch (error) {
        console.error('Failed to initialize autocomplete:', error);
      }
    };

    const checkGoogleMaps = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        initializeAutocomplete();
        clearInterval(checkGoogleMaps);
      }
    }, 100);

    return () => clearInterval(checkGoogleMaps);
  }, []);

  const fetchSuggestions = async (value: string) => {
    if (!value || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }

    try {
      const result = await autocompleteRef.current.getPlacePredictions({
        input: value,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: 'us' },
      });

      setSuggestions(result.predictions || []);
      setActiveSuggestion(-1);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    fetchSuggestions(value);
    setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion: Prediction) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setIsOpen(false);
    setActiveSuggestion(-1);
    onSearch(suggestion.description);
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(e as any);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        } else {
          handleSubmit(e as any);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSuggestions([]);
        break;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onSearch(trimmedValue);
      setSuggestions([]);
      setIsOpen(false);
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-8">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => inputValue && setIsOpen(true)}
          placeholder="Enter address, ZIP code..."
          className="w-full px-4 py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(suggestion);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                  index === activeSuggestion ? 'bg-blue-100' : ''
                } ${index !== suggestions.length - 1 ? 'border-b border-gray-200' : ''}`}
              >
                <div className="font-medium text-gray-900 text-sm">
                  {suggestion.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}

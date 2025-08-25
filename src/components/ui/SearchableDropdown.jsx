import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  createNewText = "Create New",
  createNewPath,
  disabled = false,
  className = "",
  displayKey = "text",
  valueKey = "id"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option[displayKey].toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display value for selected option
  const selectedOption = options.find(option => option[valueKey] === value);
  const displayValue = selectedOption ? selectedOption[displayKey] : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-left border rounded-md flex items-center justify-between ${
          disabled 
            ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
            : 'bg-white hover:bg-gray-50'
        }`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg top-full">
          {/* Search input */}
          <div className="sticky top-0 p-2 border-b bg-white">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1 border rounded text-sm"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.map((option) => (
              <div
                key={option[valueKey]}
                onClick={() => {
                  onChange(option[valueKey]);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  option[valueKey] === value ? 'bg-gray-100' : ''
                }`}
              >
                {option[displayKey]}
              </div>
            ))}
          </div>

          {/* Create New option */}
          {createNewPath && (
            <div
              className="sticky bottom-0 border-t bg-white"
            >
              <button
                onClick={() => navigate(createNewPath)}
                className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 font-medium"
              >
                + {createNewText}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown; 
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  createNewText = "Create New",
  createNewPath,
  onCreateNew,
  disabled = false,
  className = "",
  displayKey = "text",
  valueKey = "id",
  secondaryDisplayKey = null,
  secondaryLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openUpwards, setOpenUpwards] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const displayValue = option && option[displayKey];
    return displayValue && displayValue.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportPadding = 12;

    // Use measured height when available; fall back to estimate on first frame
    const measuredHeight = dropdownRef.current?.getBoundingClientRect().height;
    const dropdownHeight = measuredHeight && measuredHeight > 0 ? measuredHeight : 260;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUp =
      spaceBelow < dropdownHeight + viewportPadding && spaceAbove > spaceBelow;
    setOpenUpwards(shouldOpenUp);

    const top = shouldOpenUp ? rect.top - dropdownHeight : rect.bottom;

    setDropdownPosition({
      top: Math.max(viewportPadding, top),
      left: rect.left,
      width: rect.width,
    });
  };

  // Update dropdown position when opening + keep it correct on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();
    const rafId = requestAnimationFrame(() => updateDropdownPosition());

    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filteredOptions.length, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display value for selected option
  const selectedOption = options.find(option => option[valueKey] === value);
  const displayValue = selectedOption ? selectedOption[displayKey] : placeholder;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom,
              left: rect.left,
              width: rect.width,
            });
          }
          setIsOpen(true);
        }}
        className={`w-full px-3 py-2 text-left border rounded-md flex items-center justify-between min-w-0 ${disabled
            ? 'bg-gray-100 cursor-not-allowed text-gray-500'
            : 'bg-white hover:bg-gray-50'
          }`}
      >
        <span className="truncate min-w-0 flex-1">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border rounded-md shadow-lg"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
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
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((option) => (
              <div
                key={option[valueKey]}
                onClick={() => {
                  onChange(option[valueKey]);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm ${option[valueKey] === value ? 'bg-gray-100' : ''
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{option[displayKey]}</span>
                  {secondaryDisplayKey && secondaryLoading && (
                    <span
                      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                      aria-label="Loading"
                    />
                  )}
                  {secondaryDisplayKey && !secondaryLoading && option[secondaryDisplayKey] !== undefined && option[secondaryDisplayKey] !== null && (
                    <span className="text-gray-500 whitespace-nowrap text-right">({option[secondaryDisplayKey]})</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create New option */}
          {(createNewPath || onCreateNew) && (
            <div
              className="sticky bottom-0 border-t bg-white"
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm("");
                  if (onCreateNew) {
                    onCreateNew();
                  } else {
                    navigate(createNewPath);
                  }
                }}
                className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 font-medium"
              >
                + {createNewText}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableDropdown;
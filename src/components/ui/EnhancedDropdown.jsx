import React, { useState, useRef, useEffect } from 'react';

const EnhancedDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  className = "",
  optionClassName = "",
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  const listOptions = options.filter((option) => !option.isCreateNew);
  const createOptions = options.filter((option) => option.isCreateNew);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(options[highlightedIndex]);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectedOption = options.find((option) => option.value === value && !option.isCreateNew);

  const renderOption = (option, index) => (
    <div
      key={option.value}
      className={`
        px-4 py-3 cursor-pointer transition-all duration-150
        ${index === highlightedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}
        ${option.value === value && !option.isCreateNew ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-700'}
        ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${option.isCreateNew ? 'font-semibold text-[#0E2F4B]' : ''}
        ${optionClassName}
      `}
      onClick={() => !option.disabled && handleSelect(option)}
      onMouseEnter={() => setHighlightedIndex(index)}
      role="option"
      aria-selected={option.value === value}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm ${option.isCreateNew ? 'text-[#0E2F4B]' : ''}`}>{option.label}</span>
        {option.value === value && !option.isCreateNew && (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      {option.description && (
        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
      )}
    </div>
  );

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div
        className={`
          w-full bg-white text-gray-700 appearance-none cursor-pointer box-border
          ${compact
            ? 'h-[38px] border border-gray-300 rounded px-3 text-sm flex items-center'
            : 'border-2 border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
          ${!compact && isOpen ? 'border-blue-500 ring-2 ring-blue-100' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
      >
        <div className="flex items-center w-full min-w-0">
          <span
            className={`${selectedOption ? 'text-gray-900' : 'text-gray-500'} truncate flex-1 pr-2 text-left`}
            title={selectedOption ? selectedOption.label : placeholder}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {compact ? (
            <svg
              className="w-4 h-4 text-gray-500 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          ) : (
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {listOptions.map((option) => renderOption(option, options.indexOf(option)))}
          </div>
          {createOptions.length > 0 && (
            <div className="border-t-2 border-gray-200 bg-white">
              {createOptions.map((option) => renderOption(option, options.indexOf(option)))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedDropdown;

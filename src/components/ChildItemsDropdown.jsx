import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A small dropdown icon that displays child items (assets or asset types) when clicked.
 * Renders between the checkbox and field value in table rows.
 */
const ChildItemsDropdown = ({
  children,
  childItems = [],
  renderChildItem = (item) => item?.asset_id || item?.asset_type_id || item?.text || String(item),
  getChildKey = (item) => item?.asset_id || item?.asset_type_id || String(item),
  emptyMessage = "No child items",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const hasChildren = childItems && childItems.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!hasChildren) {
    return <span className="inline-flex items-center">{children}</span>;
  }

  return (
    <div ref={dropdownRef} className={`relative inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex-shrink-0"
        title={`${childItems.length} child item(s)`}
        aria-label="Show child items"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {children}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[160px] max-w-[280px] max-h-[240px] overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {childItems.map((item) => (
            <div
              key={getChildKey(item)}
              className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              {renderChildItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildItemsDropdown;

export const filterData = (data, filterValues, visibleColumns) => {
  if (!data || !Array.isArray(data)) return [];

  return data.filter(item => {
    // Check if item matches all filter conditions
    return Object.entries(filterValues).every(([key, value]) => {
      // If no filter value, include the item
      if (!value || value === '') return true;

      // Get the item value for this key
      const itemValue = String(item[key] || '').toLowerCase();
      const filterValue = String(value).toLowerCase();

      // Handle columnFilters
      if (key === 'columnFilters' && Array.isArray(value)) {
        return value.every(filter => {
          if (!filter.column || !filter.value) return true;
          
          // Handle array of values (multi-select)
          if (Array.isArray(filter.value)) {
            if (filter.value.length === 0) return true; // No values selected, include all
            const colValue = String(item[filter.column] || '').toLowerCase();
            // Check if item's value matches any of the selected values
            return filter.value.some(selectedValue => {
              const selectedValueStr = String(selectedValue).toLowerCase();
              // Handle object values (like days_until_expiry: {days: 5})
              if (item[filter.column] && typeof item[filter.column] === 'object' && item[filter.column].days !== undefined) {
                return `${item[filter.column].days} days` === selectedValue;
              }
              // Handle null/undefined values
              if (item[filter.column] === null || item[filter.column] === undefined) {
                return selectedValue === 'N/A' || selectedValue === '';
              }
              return colValue === selectedValueStr || colValue.includes(selectedValueStr);
            });
          }
          
          // Handle single value (backward compatibility)
          const colValue = String(item[filter.column] || '').toLowerCase();
          return colValue.includes(String(filter.value).toLowerCase());
        });
      }

      // Handle date range filters
      if (key === 'fromDate' || key === 'toDate') {
        const dateValue = new Date(item.created_on);
        if (key === 'fromDate') {
          return dateValue >= new Date(value);
        }
        if (key === 'toDate') {
          return dateValue <= new Date(value);
        }
      }

      // Default string includes check
      return itemValue.includes(filterValue);
    });
  });
};
  
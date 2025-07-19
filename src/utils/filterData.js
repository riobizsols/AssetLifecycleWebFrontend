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
  
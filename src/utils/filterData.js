export const filterData = (data, filters, visibleColumns) => {
    const visibleKeys = visibleColumns
        .filter((col) => col.visible)
        .map((col) => col.name);

    return data.filter((row) =>
        Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            if (!visibleKeys.includes(key)) return true;
            return row[key]?.toString().toLowerCase() === value.toLowerCase();
        })
    );
};
  
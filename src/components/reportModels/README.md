# Report Models - Reusable Components

This directory contains reusable components and utilities for building report pages in the Asset Lifecycle Management system.

## Components

### ReportLayout
The main layout component that provides the complete report interface including:
- Header with title and action buttons
- Quick filters section
- Advanced filters builder
- Preview table with column management
- Export functionality (CSV/PDF)
- Saved views management
- Share functionality

### ReportComponents
Individual UI components that can be reused:
- `Input` - Text and number input fields
- `Select` - Dropdown selection
- `DropdownMultiSelect` - Multi-select dropdown with search
- `DateRange` - Date range picker with presets
- `SearchableSelect` - Searchable dropdown
- `AdvancedBuilder` - Advanced filter conditions builder
- `DropdownMenu` - Action menu dropdown
- `SectionTitle` - Section header styling
- `Chip` - Filter chip display

## Utilities

### ReportConfig
Contains:
- Report definitions with fields, filters, and columns
- Common constants (categories, locations, departments, etc.)
- Filtering logic
- Mock data generation functions

### useReportState
Custom React hook that manages:
- Quick filters state
- Advanced filters state
- Column selection state
- Saved views state
- Filtered data computation

## Usage

### Basic Report Page
```jsx
import React, { useMemo } from "react";
import { ReportLayout, useReportState, REPORTS } from "../../components/reportModels";

export default function MyReport() {
  const selectedReportId = "asset-register";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);

  const {
    quick, setQuick,
    advanced, setAdvanced,
    columns, setColumns,
    views, setViews,
    allRows, filteredRows
  } = useReportState(selectedReportId, report);

  return (
    <ReportLayout
      report={report}
      selectedReportId={selectedReportId}
      allRows={allRows}
      filteredRows={filteredRows}
      quick={quick}
      setQuick={setQuick}
      advanced={advanced}
      setAdvanced={setAdvanced}
      columns={columns}
      setColumns={setColumns}
      views={views}
      setViews={setViews}
    />
  );
}
```

### Custom Report Configuration
To create a new report type, add it to the `REPORTS` array in `ReportConfig.jsx`:

```jsx
{
  id: "my-custom-report",
  name: "My Custom Report",
  description: "Description of what this report shows",
  quickFields: [
    { key: "dateRange", label: "Date Range", type: "daterange", preset: "FY" },
    { key: "category", label: "Category", type: "multiselect", domain: ["A", "B", "C"] }
  ],
  fields: [
    { key: "priority", label: "Priority", type: "select", domain: ["Low", "Medium", "High"] }
  ],
  defaultColumns: ["Column1", "Column2", "Column3"],
  allColumns: ALL_COLUMNS
}
```

## Benefits

1. **Code Reusability**: No more duplicate code across report files
2. **Consistent UI**: All reports have the same look and feel
3. **Easy Maintenance**: Changes to UI components only need to be made in one place
4. **Quick Development**: New report types can be created with minimal code
5. **Type Safety**: Consistent data structures across all reports

## File Structure

```
reportModels/
├── ReportLayout.jsx      # Main layout component
├── ReportComponents.jsx  # Reusable UI components
├── ReportConfig.jsx      # Report definitions and utilities
├── useReportState.js     # Custom hook for state management
├── index.js             # Export all components
└── README.md            # This documentation
```

## Migration Notes

When migrating existing report files:
1. Remove all duplicate component definitions
2. Import from `../../components/reportModels`
3. Use the `useReportState` hook for state management
4. Pass required props to `ReportLayout`
5. Keep only the report-specific configuration (report ID)

This approach reduces the average report file from ~1000+ lines to just ~30-40 lines while maintaining all functionality.

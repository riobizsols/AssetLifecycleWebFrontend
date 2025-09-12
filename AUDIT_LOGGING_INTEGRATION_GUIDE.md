# Audit Logging Integration Guide

This guide explains how to integrate audit logging functionality with any screen in the Asset Lifecycle Management system.

## Overview

The audit logging system consists of two main APIs:
1. **GET `/api/app-events/enabled/:appId`** - Fetches enabled events for a specific app
2. **POST `/api/audit-logs/record`** - Records user actions when events are triggered

## Dynamic vs Hardcoded Approach

### ✅ **Dynamic Approach (Recommended)**
- Events are fetched from the database
- No hardcoded event IDs in the code
- Easy to add new events without code changes
- Event names are human-readable
- Fully configurable from the database

### ❌ **Hardcoded Approach (Legacy)**
- Event IDs are hardcoded in constants
- Requires code changes to add new events
- Less flexible and maintainable
- Event IDs must match database exactly

## Architecture

### 1. App ID Mapping
Each sidebar menu option has a unique `app_id` that groups related screens:
- `ASSETS` - All asset-related screens
- `MASTERDATA` - Master data management screens
- `REPORTS` - Report screens
- `MAINTENANCE` - Maintenance screens
- etc.

### 2. Event Constants
Events are defined in `src/constants/auditEvents.js` with descriptive IDs and helper functions.

### 3. Custom Hook
The `useAuditLog` hook provides a clean interface for audit logging functionality.

## Integration Steps

### Step 1: Import Required Dependencies

```javascript
import useAuditLog from '../hooks/useAuditLog';
import { ASSETS_APP_ID } from '../constants/auditEvents';
```

### Step 2: Initialize Audit Logging

```javascript
const YourComponent = () => {
  // Initialize audit logging with the appropriate app ID
  const { 
    recordAction,           // Record by event ID
    recordActionByName,     // Record by event name (dynamic)
    isEventEnabled,         // Check if event is enabled
    getEventNames,          // Get all available event names
    getEventIdByName,       // Get event ID by name
    enabledEvents          // All enabled events data
  } = useAuditLog(ASSETS_APP_ID);
  
  // Your component logic...
};
```

### Step 3: Use Dynamic Event Recording (Recommended)

```javascript
// Method 1: Record by event name (fully dynamic)
const handleAssetCreate = async (assetData) => {
  await recordActionByName('Asset Create', {
    assetId: assetData.id,
    serialNumber: assetData.serialNumber
  });
};

// Method 2: Record by event name with checking
const handleAssetUpdate = async (assetData) => {
  const eventId = getEventIdByName('Asset Update');
  if (eventId && isEventEnabled(eventId)) {
    await recordActionByName('Asset Update', {
      assetId: assetData.id,
      changes: assetData.changes
    });
  }
};

// Method 3: Get all available events
const availableEvents = getEventNames();
console.log('Available events:', availableEvents);
```

### Step 3: Define Events for Your Screen

Add event constants to `src/constants/auditEvents.js`:

```javascript
export const YOUR_SCREEN_AUDIT_EVENTS = {
  ACTION_CREATE: 'EVE025',
  ACTION_UPDATE: 'EVE026',
  ACTION_DELETE: 'EVE027',
  ACTION_VIEW: 'EVE028',
  // Add more events as needed
};
```

### Step 4: Add Event Descriptions

Update the `getEventDescription` function in `auditEvents.js`:

```javascript
const descriptions = {
  // ... existing descriptions
  [YOUR_SCREEN_AUDIT_EVENTS.ACTION_CREATE]: `Action created: ${additionalData.actionId || 'Unknown'}`,
  [YOUR_SCREEN_AUDIT_EVENTS.ACTION_UPDATE]: `Action updated: ${additionalData.actionId || 'Unknown'}`,
  // ... add more descriptions
};
```

### Step 5: Integrate with User Actions

Add audit logging to your action handlers:

```javascript
const handleCreate = async (data) => {
  try {
    // Your create logic
    const response = await API.post('/your-endpoint', data);
    
    // Log the action
    if (isEventEnabled(YOUR_SCREEN_AUDIT_EVENTS.ACTION_CREATE)) {
      await recordAction(
        YOUR_SCREEN_AUDIT_EVENTS.ACTION_CREATE,
        getEventDescription(YOUR_SCREEN_AUDIT_EVENTS.ACTION_CREATE, { 
          actionId: response.data.id,
          additionalData: data
        })
      );
    }
    
    // Continue with success handling
    toast.success('Action created successfully');
  } catch (error) {
    // Error handling
  }
};
```

## Complete Example: Assets Screen Integration

Here's how the Assets screen and UpdateAssetModal are integrated with audit logging:

### 1. Imports
```javascript
import useAuditLog from '../hooks/useAuditLog';
import { ASSETS_APP_ID, ASSET_AUDIT_EVENTS, getEventDescription } from '../constants/auditEvents';
```

### 2. Initialization
```javascript
const Assets = () => {
  const { recordAction, isEventEnabled } = useAuditLog(ASSETS_APP_ID);
  // ... rest of component
};
```

### 3. Action Logging Examples

#### View Assets
```javascript
const fetchAssets = async () => {
  try {
    const res = await API.get("/assets");
    setData(formattedData);
    
    // Log asset list view
    if (isEventEnabled(ASSET_AUDIT_EVENTS.ASSET_VIEW)) {
      await recordAction(
        ASSET_AUDIT_EVENTS.ASSET_VIEW,
        getEventDescription(ASSET_AUDIT_EVENTS.ASSET_VIEW, { count: formattedData.length })
      );
    }
  } catch (err) {
    // Error handling
  }
};
```

#### Delete Asset
```javascript
const handleDelete = async (row) => {
  try {
    await API.delete(`/assets/${row.asset_id}`);
    
    // Log single asset delete action
    if (isEventEnabled(ASSET_AUDIT_EVENTS.ASSET_DELETE)) {
      await recordAction(
        ASSET_AUDIT_EVENTS.ASSET_DELETE,
        getEventDescription(ASSET_AUDIT_EVENTS.ASSET_DELETE, { assetId: row.asset_id })
      );
    }
    
    toast.success("Asset deleted successfully");
    fetchAssets();
  } catch (err) {
    // Error handling
  }
};
```

#### Export Data
```javascript
const handleDownload = async () => {
  try {
    const success = exportToExcel(dataToExport, columns, 'Assets_List');
    
    if (success) {
      // Log export action
      if (isEventEnabled(ASSET_AUDIT_EVENTS.ASSET_EXPORT)) {
        await recordAction(
          ASSET_AUDIT_EVENTS.ASSET_EXPORT,
          getEventDescription(ASSET_AUDIT_EVENTS.ASSET_EXPORT, { count: dataToExport.length })
        );
      }
      
      toast.success('Assets exported successfully');
    }
  } catch (error) {
    // Error handling
  }
};
```

### 4. UpdateAssetModal Integration

#### Asset Update
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  // ... validation logic

  try {
    await API.put(`/assets/${assetData.asset_id}`, updateData);
    
    // Log asset update action
    if (isEventEnabled(ASSET_AUDIT_EVENTS.ASSET_UPDATE)) {
      await recordAction(
        ASSET_AUDIT_EVENTS.ASSET_UPDATE,
        getEventDescription(ASSET_AUDIT_EVENTS.ASSET_UPDATE, { 
          assetId: assetData.asset_id,
          serialNumber: form.serialNumber,
          changes: {
            assetType: form.assetType,
            description: form.description,
            purchaseCost: form.purchaseCost
          }
        })
      );
    }
    
    toast.success('Asset updated successfully');
    onClose(true);
  } catch (err) {
    // Error handling
  }
};
```

#### Document Actions in Update Modal
```javascript
const handleDocumentAction = async (doc, action) => {
  try {
    const res = await API.get(`/asset-docs/${doc.a_d_id}/download-url?mode=${action}`);
    
    if (res.data && res.data.url) {
      window.open(res.data.url, '_blank');
      
      // Log document view/download action
      const eventId = action === 'view' ? ASSET_AUDIT_EVENTS.DOCUMENT_VIEW : ASSET_AUDIT_EVENTS.DOCUMENT_DELETE;
      if (isEventEnabled(eventId)) {
        await recordAction(
          eventId,
          getEventDescription(eventId, { 
            assetId: assetData.asset_id,
            fileName: doc.file_name,
            docId: doc.a_d_id
          })
        );
      }
    }
  } catch (err) {
    // Error handling
  }
};
```

#### QSN Print in Update Modal
```javascript
const handleQSNPrint = async () => {
  try {
    const response = await API.post('/asset-serial-print/', {
      serial_no: form.serialNumber,
      status: 'New',
      reason: qsnPrintReason.trim()
    });
    
    // Log QSN print action
    if (isEventEnabled(ASSET_AUDIT_EVENTS.SERIAL_NUMBER_PRINT)) {
      await recordAction(
        ASSET_AUDIT_EVENTS.SERIAL_NUMBER_PRINT,
        getEventDescription(ASSET_AUDIT_EVENTS.SERIAL_NUMBER_PRINT, { 
          serialNumber: form.serialNumber,
          assetId: assetData.asset_id,
          reason: qsnPrintReason.trim()
        })
      );
    }
    
    toast.success('QSN print request submitted successfully');
  } catch (error) {
    // Error handling
  }
};
```

## Database Configuration

### 1. App Events Table
Ensure your app is registered in the `tblAppEvents` table:

```sql
INSERT INTO "tblAppEvents" (app_id, app_name, description) 
VALUES ('ASSETS', 'Assets Management', 'Asset lifecycle management screens');
```

### 2. Event Configuration
Configure which events are enabled for your app in `tblAppEventConfig`:

```sql
INSERT INTO "tblAppEventConfig" (app_id, event_id, enabled, reporting_required) 
VALUES 
  ('ASSETS', 'EVE001', true, true),  -- Asset Create
  ('ASSETS', 'EVE002', true, true),  -- Asset Update
  ('ASSETS', 'EVE003', true, true),  -- Asset Delete
  ('ASSETS', 'EVE004', true, false), -- Asset View
  ('ASSETS', 'EVE005', true, true);  -- Asset Export
```

### 3. Event Definitions
Define your events in `tblEvents`:

```sql
INSERT INTO "tblEvents" (event_id, event_name, description) 
VALUES 
  ('EVE001', 'Asset Create', 'User created a new asset'),
  ('EVE002', 'Asset Update', 'User updated an existing asset'),
  ('EVE003', 'Asset Delete', 'User deleted an asset'),
  ('EVE004', 'Asset View', 'User viewed asset list'),
  ('EVE005', 'Asset Export', 'User exported asset data');
```

## Best Practices

### 1. Event Naming
- Use descriptive event names
- Follow a consistent naming convention
- Include the action and entity (e.g., `ASSET_CREATE`, `USER_UPDATE`)

### 2. Event Descriptions
- Make descriptions human-readable
- Include relevant context (IDs, counts, etc.)
- Use consistent formatting

### 3. Error Handling
- Always wrap audit logging in try-catch
- Don't let audit logging failures break main functionality
- Log errors to console for debugging

### 4. Performance
- Use `isEventEnabled()` to check before expensive operations
- Make audit logging calls non-blocking when possible
- Consider batching multiple events if needed

### 5. Testing
- Test with events enabled and disabled
- Verify audit logs are created correctly
- Test error scenarios

## Common Patterns

### 1. CRUD Operations
```javascript
// Create
if (isEventEnabled(EVENTS.CREATE)) {
  await recordAction(EVENTS.CREATE, `Created ${entityType}: ${entityId}`);
}

// Read/View
if (isEventEnabled(EVENTS.VIEW)) {
  await recordAction(EVENTS.VIEW, `Viewed ${entityType} list: ${count} items`);
}

// Update
if (isEventEnabled(EVENTS.UPDATE)) {
  await recordAction(EVENTS.UPDATE, `Updated ${entityType}: ${entityId}`);
}

// Delete
if (isEventEnabled(EVENTS.DELETE)) {
  await recordAction(EVENTS.DELETE, `Deleted ${entityType}: ${entityId}`);
}
```

### 2. Bulk Operations
```javascript
if (isEventEnabled(EVENTS.BULK_DELETE)) {
  await recordAction(
    EVENTS.BULK_DELETE,
    getEventDescription(EVENTS.BULK_DELETE, { 
      count: selectedItems.length,
      itemIds: selectedItems 
    })
  );
}
```

### 3. Search and Filter
```javascript
if (isEventEnabled(EVENTS.SEARCH)) {
  await recordAction(
    EVENTS.SEARCH,
    getEventDescription(EVENTS.SEARCH, { 
      searchTerm: searchValue,
      resultCount: filteredData.length 
    })
  );
}
```

## Troubleshooting

### 1. Events Not Being Logged
- Check if the event is enabled in the database
- Verify the app_id is correct
- Check browser console for errors
- Ensure the event ID exists in the constants

### 2. Performance Issues
- Use `isEventEnabled()` checks
- Consider making audit calls asynchronous
- Check for network issues

### 3. Database Issues
- Verify audit log tables exist
- Check user permissions
- Ensure proper foreign key relationships

## Migration Guide

To add audit logging to an existing screen:

1. **Add imports** - Import the hook and constants
2. **Initialize hook** - Add `useAuditLog(appId)` to your component
3. **Define events** - Add event constants for your screen
4. **Add descriptions** - Update the `getEventDescription` function
5. **Integrate logging** - Add `recordAction` calls to your handlers
6. **Configure database** - Set up app and event configurations
7. **Test** - Verify logging works correctly

## Support

For questions or issues with audit logging integration:
1. Check the browser console for errors
2. Verify database configuration
3. Test with a simple event first
4. Review the existing Assets screen implementation as a reference

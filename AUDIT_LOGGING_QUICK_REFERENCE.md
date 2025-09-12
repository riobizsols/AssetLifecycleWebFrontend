# 🚀 Audit Logging Quick Reference

## 📋 Quick Implementation Checklist

### 1. Create Constants File
```bash
# Create file: src/constants/[screenName]AuditEvents.js
# Example: src/constants/maintenanceAuditEvents.js
```

### 2. Add to Component
```javascript
// Import dependencies
import useAuditLog from '../hooks/useAuditLog';
import { YOUR_APP_ID } from '../constants/yourAuditEvents';

// Initialize in component
const { recordActionByNameWithFetch } = useAuditLog(YOUR_APP_ID);
```

### 3. Add Audit Points
```javascript
// For user actions (button clicks, form submissions, etc.)
await recordActionByNameWithFetch('Event Name', {
  id: 'itemId',
  action: 'Action Description'
});
```

## 🎯 Common Event Patterns

### Create Operations
```javascript
// When user opens create form
await recordActionByNameWithFetch('Create Item', {
  action: 'Add Item Form Opened'
});

// When item is successfully created
await recordActionByNameWithFetch('Create Item', {
  itemId: response.data.id,
  action: 'Item Created Successfully'
});
```

### Update Operations
```javascript
// When item is successfully updated
await recordActionByNameWithFetch('Update Item', {
  itemId: itemData.id,
  changes: { field1: newValue, field2: newValue },
  action: 'Item Updated Successfully'
});
```

### Delete Operations
```javascript
// When item is successfully deleted
await recordActionByNameWithFetch('Delete Item', {
  itemId: itemId,
  action: 'Item Deleted'
});
```

### Bulk Operations
```javascript
// When multiple items are processed
await recordActionByNameWithFetch('Bulk Action', {
  count: selectedItems.length,
  itemIds: selectedItems,
  action: 'Bulk Action Completed'
});
```

## 🔧 File Structure Template

```
src/constants/
├── assetsAuditEvents.js (existing)
├── maintenanceAuditEvents.js (new)
├── reportsAuditEvents.js (new)
└── masterDataAuditEvents.js (new)
```

## 📝 Constants File Template

```javascript
// src/constants/[screenName]AuditEvents.js
export const [SCREEN]_APP_ID = '[SCREEN]';

// Add your screen-specific events here
// - EveXXX: Event Name
// - EveYYY: Another Event

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Customize based on your screen's data structure
  const itemId = additionalData.itemId || additionalData.item_id;
  const count = additionalData.count;
  
  let description = eventName;
  
  if (itemId) {
    description += `: ${itemId}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  return description;
};

// Helper functions (copy from existing file)
export const getEventIdByName = (eventName, enabledEvents = []) => {
  const event = enabledEvents.find(e =>
    e.text && e.text.toLowerCase() === eventName.toLowerCase()
  );
  return event ? event.event_id : null;
};

export const getEventById = (eventId, enabledEvents = []) => {
  return enabledEvents.find(e => e.event_id === eventId) || null;
};

export const isEventEnabledById = (eventId, enabledEvents = []) => {
  return enabledEvents.some(e => e.event_id === eventId);
};

export const getEventNames = (enabledEvents = []) => {
  return enabledEvents.map(e => e.text).filter(Boolean);
};
```

## ⚡ Quick Start for New Screen

1. **Copy the constants file template above**
2. **Replace `[SCREEN]` with your screen name**
3. **Add your app ID and events**
4. **Import in your component**
5. **Add audit points to user actions**
6. **Test with the API endpoints**

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Event not found | Check event name matches database |
| Race condition | Use `recordActionByNameWithFetch` |
| API errors | Check backend is running |
| No logs created | Verify successful API calls only |

## 🧪 Test Commands

```bash
# Test enabled events
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/app-events/enabled/YOUR_APP_ID

# Test audit logging
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"app_id":"YOUR_APP_ID","event_id":"EveXXX","text":"Test Event"}' \
     http://localhost:5000/api/audit-logs/record
```

## 📚 Full Documentation

For complete implementation details, see:
- [AUDIT_LOGGING_IMPLEMENTATION_GUIDE.md](./AUDIT_LOGGING_IMPLEMENTATION_GUIDE.md)
- [CORRECTED_DYNAMIC_AUDIT_LOGGING.md](./CORRECTED_DYNAMIC_AUDIT_LOGGING.md)

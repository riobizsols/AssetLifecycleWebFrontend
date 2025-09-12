# 🔍 Audit Logging Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Code Examples](#code-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Testing](#testing)

## 🎯 Overview

This guide explains how to implement dynamic audit logging for any screen in the Asset Lifecycle Management system. The audit logging system is designed to be:
- **Dynamic**: Events are fetched from the database, not hardcoded
- **Contextual**: Logs specific user actions, not passive events
- **Scalable**: Easy to add to any screen
- **Consistent**: Same pattern across all screens

## ✅ Prerequisites

Before implementing audit logging, ensure you have:
1. **Backend API endpoints** working:
   - `GET /api/app-events/enabled/:appId` - Fetch enabled events
   - `POST /api/audit-logs/record` - Record audit events
2. **App ID** for your screen (e.g., 'MAINTENANCE', 'REPORTS', 'MASTER_DATA')
3. **Event definitions** in the database for your app
4. **Authentication** working in your screen

## 🚀 Step-by-Step Implementation

### Step 1: Create Screen-Specific Constants File

Create a new constants file for your screen:

```javascript
// src/constants/[screenName]AuditEvents.js
// Example: src/constants/maintenanceAuditEvents.js

export const MAINTENANCE_APP_ID = 'MAINTENANCE';

// The actual events for MAINTENANCE app (fetch from API):
// - Eve011: Create Maintenance
// - Eve012: Update Maintenance
// - Eve013: Delete Maintenance
// - Eve014: Schedule Maintenance
// - Eve015: Complete Maintenance

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  const maintenanceId = additionalData.maintenanceId || additionalData.maintenance_id;
  const assetId = additionalData.assetId || additionalData.asset_id;
  const count = additionalData.count;
  const status = additionalData.status;
  
  let description = eventName;
  
  if (maintenanceId) {
    description += `: ${maintenanceId}`;
  }
  
  if (assetId) {
    description += ` - Asset: ${assetId}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  if (status) {
    description += ` - Status: ${status}`;
  }
  
  return description;
};

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

### Step 2: Import Dependencies in Your Screen Component

```javascript
// In your screen component (e.g., Maintenance.jsx)
import React, { useState, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';
import { MAINTENANCE_APP_ID } from '../constants/maintenanceAuditEvents';

const Maintenance = () => {
  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(MAINTENANCE_APP_ID);
  
  // Your existing component logic...
};
```

### Step 3: Identify Audit Points

Determine where to log events based on user actions:

```javascript
// Example audit points for a maintenance screen:

// 1. When user clicks "Add Maintenance" button
const handleAddMaintenance = async () => {
  await recordActionByNameWithFetch('Create Maintenance', {
    action: 'Add Maintenance Form Opened'
  });
  // Navigate to add form or open modal
};

// 2. When maintenance is successfully created
const handleSaveMaintenance = async (maintenanceData) => {
  try {
    const response = await API.post('/maintenance', maintenanceData);
    
    // Log successful creation
    await recordActionByNameWithFetch('Create Maintenance', {
      maintenanceId: response.data.id,
      assetId: maintenanceData.assetId,
      action: 'Maintenance Created Successfully'
    });
    
    toast.success('Maintenance created successfully');
  } catch (error) {
    // Handle error
  }
};

// 3. When maintenance is updated
const handleUpdateMaintenance = async (maintenanceData) => {
  try {
    const response = await API.put(`/maintenance/${maintenanceData.id}`, maintenanceData);
    
    // Log successful update
    await recordActionByNameWithFetch('Update Maintenance', {
      maintenanceId: maintenanceData.id,
      assetId: maintenanceData.assetId,
      changes: {
        status: maintenanceData.status,
        description: maintenanceData.description
      },
      action: 'Maintenance Updated Successfully'
    });
    
    toast.success('Maintenance updated successfully');
  } catch (error) {
    // Handle error
  }
};

// 4. When maintenance is deleted
const handleDeleteMaintenance = async (maintenanceId) => {
  try {
    await API.delete(`/maintenance/${maintenanceId}`);
    
    // Log successful deletion
    await recordActionByNameWithFetch('Delete Maintenance', {
      maintenanceId: maintenanceId,
      action: 'Maintenance Deleted'
    });
    
    toast.success('Maintenance deleted successfully');
  } catch (error) {
    // Handle error
  }
};

// 5. When maintenance is scheduled
const handleScheduleMaintenance = async (maintenanceId, scheduleData) => {
  try {
    const response = await API.post(`/maintenance/${maintenanceId}/schedule`, scheduleData);
    
    // Log successful scheduling
    await recordActionByNameWithFetch('Schedule Maintenance', {
      maintenanceId: maintenanceId,
      scheduledDate: scheduleData.scheduledDate,
      action: 'Maintenance Scheduled'
    });
    
    toast.success('Maintenance scheduled successfully');
  } catch (error) {
    // Handle error
  }
};

// 6. When maintenance is completed
const handleCompleteMaintenance = async (maintenanceId, completionData) => {
  try {
    const response = await API.put(`/maintenance/${maintenanceId}/complete`, completionData);
    
    // Log successful completion
    await recordActionByNameWithFetch('Complete Maintenance', {
      maintenanceId: maintenanceId,
      completedDate: completionData.completedDate,
      action: 'Maintenance Completed'
    });
    
    toast.success('Maintenance completed successfully');
  } catch (error) {
    // Handle error
  }
};
```

### Step 4: Implement in Modals/Forms

For modals and forms, follow the same pattern:

```javascript
// In UpdateMaintenanceModal.jsx
import useAuditLog from '../hooks/useAuditLog';
import { MAINTENANCE_APP_ID } from '../constants/maintenanceAuditEvents';

const UpdateMaintenanceModal = ({ isOpen, onClose, maintenanceData }) => {
  const { recordActionByNameWithFetch } = useAuditLog(MAINTENANCE_APP_ID);
  
  const handleSave = async (formData) => {
    try {
      const response = await API.put(`/maintenance/${maintenanceData.id}`, formData);
      
      // Log successful update
      await recordActionByNameWithFetch('Update Maintenance', {
        maintenanceId: maintenanceData.id,
        assetId: formData.assetId,
        changes: {
          status: formData.status,
          description: formData.description
        },
        action: 'Maintenance Updated Successfully'
      });
      
      toast.success('Maintenance updated successfully');
      onClose();
    } catch (error) {
      // Handle error
    }
  };
  
  // Rest of your modal logic...
};
```

## 📝 Code Examples

### Complete Screen Implementation

```javascript
// Maintenance.jsx - Complete example
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import useAuditLog from '../hooks/useAuditLog';
import { MAINTENANCE_APP_ID } from '../constants/maintenanceAuditEvents';

const Maintenance = () => {
  const navigate = useNavigate();
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(MAINTENANCE_APP_ID);
  
  // Fetch maintenances
  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const response = await API.get('/maintenance');
      setMaintenances(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch maintenances');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMaintenances();
  }, []);
  
  // Add maintenance button click
  const handleAddMaintenance = async () => {
    await recordActionByNameWithFetch('Create Maintenance', {
      action: 'Add Maintenance Form Opened'
    });
    navigate('/maintenance/add');
  };
  
  // Delete maintenance
  const handleDeleteMaintenance = async (maintenanceId) => {
    try {
      await API.delete(`/maintenance/${maintenanceId}`);
      
      await recordActionByNameWithFetch('Delete Maintenance', {
        maintenanceId: maintenanceId,
        action: 'Maintenance Deleted'
      });
      
      toast.success('Maintenance deleted successfully');
      fetchMaintenances();
    } catch (error) {
      toast.error('Failed to delete maintenance');
    }
  };
  
  // Schedule maintenance
  const handleScheduleMaintenance = async (maintenanceId) => {
    try {
      const response = await API.post(`/maintenance/${maintenanceId}/schedule`, {
        scheduledDate: new Date().toISOString()
      });
      
      await recordActionByNameWithFetch('Schedule Maintenance', {
        maintenanceId: maintenanceId,
        scheduledDate: response.data.scheduledDate,
        action: 'Maintenance Scheduled'
      });
      
      toast.success('Maintenance scheduled successfully');
      fetchMaintenances();
    } catch (error) {
      toast.error('Failed to schedule maintenance');
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maintenance Management</h1>
        <button
          onClick={handleAddMaintenance}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Maintenance
        </button>
      </div>
      
      {/* Your maintenance list UI */}
      <div className="bg-white rounded-lg shadow">
        {maintenances.map((maintenance) => (
          <div key={maintenance.id} className="p-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{maintenance.description}</h3>
                <p className="text-gray-600">Asset: {maintenance.assetId}</p>
                <p className="text-gray-600">Status: {maintenance.status}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleScheduleMaintenance(maintenance.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  Schedule
                </button>
                <button
                  onClick={() => handleDeleteMaintenance(maintenance.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Maintenance;
```

## 🎯 Best Practices

### 1. Event Naming Convention
- Use descriptive event names that match your business logic
- Keep names consistent across screens
- Use action verbs (Create, Update, Delete, Schedule, Complete)

### 2. Additional Data Structure
```javascript
// Good additional data structure
const additionalData = {
  // Primary identifiers
  maintenanceId: 'MNT001',
  assetId: 'ASS001',
  
  // Action context
  action: 'Maintenance Created Successfully',
  
  // Relevant business data
  status: 'Scheduled',
  priority: 'High',
  
  // Counts for bulk operations
  count: 5,
  
  // Avoid these (handled automatically):
  // timestamp: '2024-01-01T10:00:00Z', // Use created_on field
  // fileName: 'very-long-file-name.pdf', // Keep text concise
};
```

### 3. Error Handling
```javascript
const handleAction = async () => {
  try {
    // Your business logic
    const response = await API.post('/endpoint', data);
    
    // Log success
    await recordActionByNameWithFetch('Event Name', {
      id: response.data.id,
      action: 'Action Completed Successfully'
    });
    
    toast.success('Action completed successfully');
  } catch (error) {
    // Don't log failed attempts
    toast.error('Action failed');
  }
};
```

### 4. Conditional Logging
```javascript
// Only log when action is successful
if (response.data.success) {
  await recordActionByNameWithFetch('Event Name', additionalData);
}

// Don't log on errors or validation failures
```

## 🔧 Troubleshooting

### Common Issues

1. **Event not found error**
   ```
   Event "Create Maintenance" not found in enabled events for app MAINTENANCE
   ```
   **Solution**: Check that the event exists in the database and is enabled for your app

2. **Race condition errors**
   ```
   No enabled events loaded, skipping audit log
   ```
   **Solution**: Use `recordActionByNameWithFetch` which handles this automatically

3. **API response parsing errors**
   ```
   Cannot read property 'enabled_events' of undefined
   ```
   **Solution**: Check API response structure and ensure backend is returning correct format

### Debug Steps

1. **Check API response**:
   ```javascript
   // Add this to your useAuditLog hook for debugging
   console.log('🔍 API Response:', response.data);
   console.log('📊 Loaded events:', events.length, events);
   ```

2. **Verify event names**:
   ```javascript
   // Check available events
   console.log('Available events:', events.map(e => e.text));
   ```

3. **Test API endpoints**:
   ```bash
   # Test enabled events endpoint
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:5000/api/app-events/enabled/MAINTENANCE
   
   # Test audit log recording
   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"app_id":"MAINTENANCE","event_id":"Eve011","text":"Test Event"}' \
        http://localhost:5000/api/audit-logs/record
   ```

## 🧪 Testing

### 1. Unit Testing
```javascript
// Test your audit logging functions
describe('Maintenance Audit Logging', () => {
  it('should log create maintenance event', async () => {
    const mockRecordAction = jest.fn();
    const { handleAddMaintenance } = renderWithAuditLog(mockRecordAction);
    
    await handleAddMaintenance();
    
    expect(mockRecordAction).toHaveBeenCalledWith('Create Maintenance', {
      action: 'Add Maintenance Form Opened'
    });
  });
});
```

### 2. Integration Testing
```javascript
// Test with real API calls
describe('Maintenance API Integration', () => {
  it('should create maintenance and log audit event', async () => {
    const maintenanceData = {
      assetId: 'ASS001',
      description: 'Test maintenance',
      status: 'Scheduled'
    };
    
    const response = await API.post('/maintenance', maintenanceData);
    expect(response.data.success).toBe(true);
    
    // Check audit log was created
    const auditResponse = await API.get('/audit-logs');
    const auditLog = auditResponse.data.data.find(
      log => log.event_id === 'Eve011' && log.text.includes('Create Maintenance')
    );
    expect(auditLog).toBeDefined();
  });
});
```

### 3. Manual Testing Checklist

- [ ] Events are logged when user performs actions
- [ ] Event names match database configuration
- [ ] Additional data is included correctly
- [ ] No duplicate logging occurs
- [ ] Failed actions don't create audit logs
- [ ] Audit logs appear in the database
- [ ] Text field is concise and meaningful

## 📚 Additional Resources

- [Backend API Documentation](./backend-api-docs.md)
- [Database Schema](./database-schema.md)
- [Event Configuration Guide](./event-configuration.md)
- [Troubleshooting Guide](./troubleshooting.md)

## 🎉 Conclusion

This guide provides everything needed to implement audit logging in any screen. The system is designed to be:
- **Easy to implement**: Follow the step-by-step guide
- **Consistent**: Same pattern across all screens
- **Maintainable**: Clear code structure and documentation
- **Scalable**: Easy to add new screens and events

For questions or issues, refer to the troubleshooting section or contact the development team.

export const ASSET_TYPES_APP_ID = 'ASSETTYPES';

// The 4 events for ASSETTYPES app are:
// - Create: When asset types are created
// - Delete: When asset types are deleted
// - Download: When asset types data is downloaded
// - Update: When asset types are edited/updated

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const assetTypeId = additionalData.assetTypeId || additionalData.asset_type_id;
  const assetTypeName = additionalData.assetTypeName || additionalData.asset_type_name || additionalData.text;
  const assignmentType = additionalData.assignmentType || additionalData.assignment_type;
  const maintenanceSchedule = additionalData.maintenanceSchedule || additionalData.maintenance_schedule;
  const inspectionRequired = additionalData.inspectionRequired || additionalData.inspection_required;
  const groupRequired = additionalData.groupRequired || additionalData.group_required;
  const status = additionalData.status || additionalData.int_status;
  const parentAssetType = additionalData.parentAssetType || additionalData.parent_asset_type;
  const count = additionalData.count;
  const action = additionalData.action;
  const assetTypeIds = additionalData.assetTypeIds || additionalData.asset_type_ids;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (assetTypeName) {
    description += ` - "${assetTypeName}"`;
  }
  
  if (assetTypeId) {
    description += ` (${assetTypeId})`;
  }
  
  if (assignmentType) {
    description += ` - Assignment: ${assignmentType}`;
  }
  
  if (maintenanceSchedule !== undefined) {
    description += ` - Maintenance: ${maintenanceSchedule ? 'Yes' : 'No'}`;
  }
  
  if (inspectionRequired !== undefined) {
    description += ` - Inspection: ${inspectionRequired ? 'Yes' : 'No'}`;
  }
  
  if (groupRequired !== undefined) {
    description += ` - Group: ${groupRequired ? 'Yes' : 'No'}`;
  }
  
  if (status) {
    description += ` - Status: ${status}`;
  }
  
  if (parentAssetType) {
    description += ` - Parent: ${parentAssetType}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  if (assetTypeIds && Array.isArray(assetTypeIds)) {
    description += ` - Types: ${assetTypeIds.join(', ')}`;
  }
  
  return description;
};

/**
 * Helper function to get event ID by name from enabled events
 */
export const getEventIdByName = (eventName, enabledEvents = []) => {
  const event = enabledEvents.find(e =>
    e.text && e.text.toLowerCase() === eventName.toLowerCase()
  );
  return event ? event.event_id : null;
};

/**
 * Helper function to get event by ID from enabled events
 */
export const getEventById = (eventId, enabledEvents = []) => {
  return enabledEvents.find(e => e.event_id === eventId) || null;
};

/**
 * Helper function to check if an event is enabled
 */
export const isEventEnabledById = (eventId, enabledEvents = []) => {
  return enabledEvents.some(e => e.event_id === eventId);
};

/**
 * Helper function to get all event names from enabled events
 */
export const getEventNames = (enabledEvents = []) => {
  return enabledEvents.map(e => e.text).filter(Boolean);
};

// No default export - use dynamic events from database

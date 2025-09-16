export const DEPARTMENTS_ASSET_APP_ID = 'DEPARTMENTSASSET';

// The 2 events for DEPARTMENTSASSET app are:
// - Create: When department-asset type mappings are created
// - Delete: When department-asset type mappings are deleted

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const deptId = additionalData.deptId || additionalData.dept_id;
  const deptName = additionalData.deptName || additionalData.dept_name;
  const assetTypeId = additionalData.assetTypeId || additionalData.asset_type_id;
  const assetTypeName = additionalData.assetTypeName || additionalData.asset_type_name;
  const mappingId = additionalData.mappingId || additionalData.dept_asset_type_id;
  const action = additionalData.action;
  const count = additionalData.count;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (assetTypeName) {
    description += ` - Asset Type: "${assetTypeName}"`;
  } else if (assetTypeId) {
    description += ` - Asset Type: ${assetTypeId}`;
  }
  
  if (deptName) {
    description += ` - Department: "${deptName}"`;
  } else if (deptId) {
    description += ` - Dept: ${deptId}`;
  }
  
  if (mappingId) {
    description += ` (Mapping: ${mappingId})`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
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

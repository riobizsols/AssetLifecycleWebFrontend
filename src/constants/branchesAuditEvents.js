export const BRANCHES_APP_ID = 'BRANCHES';

// The 4 events for BRANCHES app are:
// - Create: When branches are created
// - Update: When branches are updated
// - Delete: When branches are deleted
// - Download: When branches data is downloaded

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const branchId = additionalData.branchId || additionalData.branch_id;
  const branchName = additionalData.branchName || additionalData.branch_name;
  const branchCode = additionalData.branchCode || additionalData.branch_code;
  const city = additionalData.city;
  const orgId = additionalData.orgId || additionalData.org_id;
  const count = additionalData.count;
  const action = additionalData.action;
  const branchIds = additionalData.branchIds || additionalData.branch_ids;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (branchName) {
    description += ` - "${branchName}"`;
  }
  
  if (branchId) {
    description += ` (${branchId})`;
  }
  
  if (branchCode) {
    description += ` - Code: ${branchCode}`;
  }
  
  if (city) {
    description += ` - City: ${city}`;
  }
  
  if (orgId) {
    description += ` - Org: ${orgId}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  if (branchIds && Array.isArray(branchIds)) {
    description += ` - Branches: ${branchIds.join(', ')}`;
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

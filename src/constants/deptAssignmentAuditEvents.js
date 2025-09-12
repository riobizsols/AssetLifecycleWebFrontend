export const DEPT_ASSIGNMENT_APP_ID = 'DEPTASSIGNMENT';

// The 3 events for DEPTASSIGNMENT app are:
// - Assign: When assets are assigned to departments
// - Unassign: When assets are unassigned from departments  
// - History: When viewing assignment history

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const assetId = additionalData.assetId || additionalData.asset_id;
  const deptId = additionalData.deptId || additionalData.dept_id;
  const deptName = additionalData.deptName || additionalData.dept_name;
  const count = additionalData.count;
  const action = additionalData.action;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (assetId) {
    description += ` - Asset: ${assetId}`;
  }
  
  if (deptId) {
    description += ` - Dept: ${deptId}`;
  }
  
  if (deptName) {
    description += ` (${deptName})`;
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

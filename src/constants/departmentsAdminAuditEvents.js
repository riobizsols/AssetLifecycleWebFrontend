export const DEPARTMENTS_ADMIN_APP_ID = 'DEPARTMENTSADMIN';

// The 2 events for DEPARTMENTSADMIN app are:
// - Create: When department admins are assigned/created
// - Delete: When department admins are removed/deleted

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const userId = additionalData.userId || additionalData.user_id;
  const userName = additionalData.userName || additionalData.user_name || additionalData.full_name;
  const deptId = additionalData.deptId || additionalData.dept_id;
  const deptName = additionalData.deptName || additionalData.dept_name;
  const action = additionalData.action;
  const count = additionalData.count;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (userName) {
    description += ` - User: "${userName}"`;
  }
  
  if (userId) {
    description += ` (${userId})`;
  }
  
  if (deptName) {
    description += ` - Department: "${deptName}"`;
  } else if (deptId) {
    description += ` - Dept: ${deptId}`;
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

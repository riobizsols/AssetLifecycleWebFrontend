export const USERS_APP_ID = 'USERS';

// The 4 events for USERS app are:
// - Create: When users are created
// - Update: When users are updated
// - Delete: When users are deleted
// - Download: When users data is downloaded

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
  const fullName = additionalData.fullName || additionalData.full_name;
  const email = additionalData.email;
  const phone = additionalData.phone;
  const deptId = additionalData.deptId || additionalData.dept_id;
  const deptName = additionalData.deptName || additionalData.dept_name;
  const status = additionalData.status || additionalData.int_status;
  const count = additionalData.count;
  const action = additionalData.action;
  const userIds = additionalData.userIds || additionalData.user_ids;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (fullName) {
    description += ` - "${fullName}"`;
  }
  
  if (userId) {
    description += ` (${userId})`;
  }
  
  if (email) {
    description += ` - Email: ${email}`;
  }
  
  if (phone) {
    description += ` - Phone: ${phone}`;
  }
  
  if (deptName) {
    description += ` - Dept: ${deptName}`;
  } else if (deptId) {
    description += ` - Dept: ${deptId}`;
  }
  
  if (status) {
    description += ` - Status: ${status}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  if (userIds && Array.isArray(userIds)) {
    description += ` - Users: ${userIds.join(', ')}`;
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

export const ORGANIZATIONS_APP_ID = 'ORGANIZATIONS';

// The 2 events for ORGANIZATIONS app are:
// - Create: When organizations are created
// - Update: When organizations are updated

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const orgId = additionalData.orgId || additionalData.org_id;
  const orgName = additionalData.orgName || additionalData.org_name;
  const orgCode = additionalData.orgCode || additionalData.org_code;
  const orgCity = additionalData.orgCity || additionalData.org_city;
  const action = additionalData.action;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (orgName) {
    description += ` - "${orgName}"`;
  }
  
  if (orgId) {
    description += ` (${orgId})`;
  }
  
  if (orgCode) {
    description += ` - Code: ${orgCode}`;
  }
  
  if (orgCity) {
    description += ` - City: ${orgCity}`;
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

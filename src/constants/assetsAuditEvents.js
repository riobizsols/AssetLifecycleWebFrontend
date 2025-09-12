export const ASSETS_APP_ID = 'ASSETS';

// The actual 6 events for ASSETS app are:
// - Eve009: Add Document
// - Eve005: Create
// - Eve006: Delete
// - Eve007: Download
// - Eve010: Save
// - Eve008: Update


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
  const count = additionalData.count;
  const fileName = additionalData.fileName || additionalData.file_name;
  const serialNumber = additionalData.serialNumber || additionalData.serial_number;
  const searchTerm = additionalData.searchTerm || additionalData.search_term;
  const filterType = additionalData.filterType || additionalData.filter_type;
  const sortColumn = additionalData.sortColumn || additionalData.sort_column;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (assetId) {
    description += `: ${assetId}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  if (fileName) {
    description += ` - ${fileName}`;
  }
  
  if (serialNumber) {
    description += ` - ${serialNumber}`;
  }
  
  if (searchTerm) {
    description += ` - "${searchTerm}"`;
  }
  
  if (filterType) {
    description += ` - ${filterType}`;
  }
  
  if (sortColumn) {
    description += ` - ${sortColumn}`;
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

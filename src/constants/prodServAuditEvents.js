export const PRODSERV_APP_ID = 'PRODSERV';

// The 2 events for PRODSERV app are:
// - Create: When products or services are created
// - Delete: When products or services are deleted

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const prodServId = additionalData.prodServId || additionalData.prod_serv_id;
  const assetTypeId = additionalData.assetTypeId || additionalData.asset_type_id;
  const assetTypeName = additionalData.assetTypeName || additionalData.asset_type_name;
  const brand = additionalData.brand;
  const model = additionalData.model;
  const description = additionalData.description;
  const psType = additionalData.psType || additionalData.ps_type;
  const action = additionalData.action;
  const count = additionalData.count;
  
  // Build description based on event name and available data
  let description_text = eventName;
  
  if (action) {
    description_text += `: ${action}`;
  }
  
  if (psType) {
    description_text += ` - Type: ${psType === 'product' ? 'Product' : 'Service'}`;
  }
  
  if (assetTypeName) {
    description_text += ` - Asset Type: "${assetTypeName}"`;
  } else if (assetTypeId) {
    description_text += ` - Asset Type: ${assetTypeId}`;
  }
  
  if (brand) {
    description_text += ` - Brand: ${brand}`;
  }
  
  if (model) {
    description_text += ` - Model: ${model}`;
  }
  
  if (description && psType === 'service') {
    description_text += ` - Description: "${description}"`;
  }
  
  if (prodServId) {
    description_text += ` (ID: ${prodServId})`;
  }
  
  if (count !== undefined) {
    description_text += ` (${count} items)`;
  }
  
  return description_text;
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

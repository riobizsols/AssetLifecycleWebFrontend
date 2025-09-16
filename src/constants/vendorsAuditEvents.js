export const VENDORS_APP_ID = 'VENDORS';

// The 4 events for VENDORS app are:
// - Create: When vendors are created
// - Update: When vendors are updated
// - Delete: When vendors are deleted
// - Download: When vendors data is downloaded

export const getEventDescription = (eventId, additionalData = {}, eventData = null) => {
  if (eventData && eventData.text) {
    return generateDynamicDescription(eventData.text, additionalData);
  }
  
  // Fallback to simple description if no event data
  return `Event ${eventId}: ${eventData?.text || 'Unknown'}`;
};

const generateDynamicDescription = (eventName, additionalData = {}) => {
  // Extract key information from additional data
  const vendorId = additionalData.vendorId || additionalData.vendor_id;
  const vendorName = additionalData.vendorName || additionalData.vendor_name;
  const companyName = additionalData.companyName || additionalData.company_name;
  const companyEmail = additionalData.companyEmail || additionalData.company_email;
  const gstNumber = additionalData.gstNumber || additionalData.gst_number;
  const contactPerson = additionalData.contactPerson || additionalData.contact_person_name;
  const contactEmail = additionalData.contactEmail || additionalData.contact_person_email;
  const contactNumber = additionalData.contactNumber || additionalData.contact_person_number;
  const status = additionalData.status || additionalData.int_status;
  const count = additionalData.count;
  const action = additionalData.action;
  const vendorIds = additionalData.vendorIds || additionalData.vendor_ids;
  
  // Build description based on event name and available data
  let description = eventName;
  
  if (action) {
    description += `: ${action}`;
  }
  
  if (vendorName) {
    description += ` - "${vendorName}"`;
  }
  
  if (vendorId) {
    description += ` (${vendorId})`;
  }
  
  if (companyName) {
    description += ` - Company: ${companyName}`;
  }
  
  if (companyEmail) {
    description += ` - Email: ${companyEmail}`;
  }
  
  if (gstNumber) {
    description += ` - GST: ${gstNumber}`;
  }
  
  if (contactPerson) {
    description += ` - Contact: ${contactPerson}`;
  }
  
  if (contactEmail) {
    description += ` (${contactEmail})`;
  }
  
  if (contactNumber) {
    description += ` - Phone: ${contactNumber}`;
  }
  
  if (status) {
    description += ` - Status: ${status}`;
  }
  
  if (count !== undefined) {
    description += ` (${count} items)`;
  }
  
  if (vendorIds && Array.isArray(vendorIds)) {
    description += ` - Vendors: ${vendorIds.join(', ')}`;
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

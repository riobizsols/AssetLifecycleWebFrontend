/**
 * Group Assets Audit Events Constants
 * Contains the app ID and helper functions for group assets audit logging
 */

// App ID for Group Assets
export const GROUP_ASSETS_APP_ID = 'GROUPASSET';

/**
 * Get event description by event name
 * @param {string} eventName - The event name (e.g., 'Create', 'Delete')
 * @returns {string} - The event description
 */
export const getEventDescription = (eventName) => {
  const descriptions = {
    'Create': 'Group Asset Created',
    'Update': 'Group Asset Updated',
    'Delete': 'Group Asset Deleted', 
    'Add Document': 'Document Added to Group Asset',
    'Download': 'Document Downloaded from Group Asset'
  };
  
  return descriptions[eventName] || eventName;
};

/**
 * Get event ID by event name
 * @param {string} eventName - The event name
 * @returns {string|null} - The event ID or null if not found
 */
export const getEventIdByName = (eventName) => {
  const eventMap = {
    'Create': 'Eve005',
    'Update': 'Eve008',
    'Delete': 'Eve006', 
    'Add Document': 'Eve009',
    'Download': 'Eve007'
  };
  
  return eventMap[eventName] || null;
};

/**
 * Get all available event names for group assets
 * @returns {string[]} - Array of event names
 */
export const getEventNames = () => {
  return ['Create', 'Update', 'Delete', 'Add Document', 'Download'];
};

/**
 * Check if an event is valid for group assets
 * @param {string} eventName - The event name to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEvent = (eventName) => {
  return getEventNames().includes(eventName);
};

export default {
  GROUP_ASSETS_APP_ID,
  getEventDescription,
  getEventIdByName,
  getEventNames,
  isValidEvent
};

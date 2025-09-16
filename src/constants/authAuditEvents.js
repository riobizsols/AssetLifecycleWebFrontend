/**
 * Authentication Audit Events Constants
 * Contains app IDs and helper functions for authentication audit logging
 */

// App IDs for authentication actions
export const AUTH_APP_IDS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  RESETPASSWORD: 'RESETPASSWORD'
};

/**
 * Get event description by event name
 * @param {string} eventName - The event name (e.g., 'Logging In', 'Logging Out', 'Reset Password')
 * @returns {string} - The event description
 */
export const getEventDescription = (eventName) => {
  const descriptions = {
    'Logging In': 'User Logged In Successfully',
    'Logging Out': 'User Logged Out Successfully',
    'Reset Password': 'Password Reset Successfully'
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
    'Logging In': 'Eve001',
    'Logging Out': 'Eve002',
    'Reset Password': 'Eve003'
  };
  
  return eventMap[eventName] || null;
};

/**
 * Get all available event names for authentication
 * @returns {string[]} - Array of event names
 */
export const getEventNames = () => {
  return ['Logging In', 'Logging Out', 'Reset Password'];
};

/**
 * Check if an event is valid for authentication
 * @param {string} eventName - The event name to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEvent = (eventName) => {
  return getEventNames().includes(eventName);
};

export default {
  AUTH_APP_IDS,
  getEventDescription,
  getEventIdByName,
  getEventNames,
  isValidEvent
};

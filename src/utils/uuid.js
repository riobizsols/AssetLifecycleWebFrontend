/**
 * UUID utility with fallback for older browsers
 * Provides a consistent way to generate unique IDs across all environments
 */

/**
 * Generate a UUID v4 using crypto.randomUUID() if available,
 * otherwise fall back to a custom implementation
 * @returns {string} A UUID v4 string
 */
export function generateUUID() {
  // Check if crypto.randomUUID is available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID failed, falling back to custom implementation:', error);
    }
  }
  
  // Fallback implementation for older browsers or server environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a simple unique ID (shorter than UUID)
 * Useful for React keys and temporary IDs
 * @returns {string} A unique string ID
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Default export
export default generateUUID;

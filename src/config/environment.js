// Environment configuration for frontend
const config = {
  development: {
    API_BASE_URL: 'http://localhost:5001/api',
    FRONTEND_URL: 'http://localhost:5173',
    ENVIRONMENT: 'development'
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://your-domain.com:5001/api',
    FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || 'https://your-domain.com',
    ENVIRONMENT: 'production'
  }
};

// Get current environment
const currentEnv = import.meta.env.MODE || 'development';

// Function to get API base URL dynamically based on current hostname
// This ensures subdomain requests go to the correct backend
const getDynamicApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const currentPort = window.location.port;
    
    // Check if we have a subdomain (e.g., rio.localhost, rio.riowebworks.net)
    // A subdomain exists if:
    // 1. hostname contains a dot AND
    // 2. hostname is not just 'localhost' AND
    // 3. hostname has at least 2 parts when split by dots
    const parts = hostname.split('.');
    const hasSubdomain = hostname.includes('.') && 
                        hostname !== 'localhost' && 
                        !hostname.startsWith('127.0.0.1') &&
                        parts.length >= 2 &&
                        parts[0] !== ''; // First part is the subdomain
    
    if (hasSubdomain) {
      // In development, backend is typically on port 5001 (or from env)
      // In production, backend is on the same domain (no port or standard ports)
      let backendPort = '';
      if (currentEnv === 'development') {
        // Use VITE_API_PORT if set, otherwise default to 5001
        const apiPort = import.meta.env.VITE_API_PORT || '5001';
        backendPort = `:${apiPort}`;
      } else if (currentPort && currentPort !== '80' && currentPort !== '443') {
        // In production, if there's a non-standard port, use it
        backendPort = `:${currentPort}`;
      }
      
      // Construct API URL with subdomain
      // For localhost: rio.localhost:5173 -> rio.localhost:5001/api
      // For production: rio.riowebworks.net -> rio.riowebworks.net/api
      const apiUrl = `${protocol}//${hostname}${backendPort}/api`;
      console.log(`🔍 [Environment] Subdomain detected: ${hostname}, API URL: ${apiUrl}`);
      return apiUrl;
    }
    
    // No subdomain - use configured URL
    if (currentEnv === 'development') {
      return config.development.API_BASE_URL;
    }
  }
  
  // Fallback to configured URL
  return currentEnv === 'development' 
    ? config.development.API_BASE_URL 
    : config.production.API_BASE_URL;
};

// Export current environment config
export const environment = config[currentEnv];

// Export individual values for convenience
export const API_BASE_URL = getDynamicApiBaseUrl();
export const FRONTEND_URL = environment.FRONTEND_URL;
export const ENVIRONMENT = environment.ENVIRONMENT;

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default environment;

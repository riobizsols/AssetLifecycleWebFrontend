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

// Reserved subdomains are main-app hosts (web/www/api), not tenant orgs.
const RESERVED_SUBDOMAINS = (import.meta.env.VITE_RESERVED_SUBDOMAINS || 'web,www,api')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const isReservedSubdomain = (hostname) => {
  const parts = hostname.split('.');
  if (parts.length < 2 || !parts[0]) return false;
  return RESERVED_SUBDOMAINS.includes(parts[0].toLowerCase());
};

// Function to get API base URL dynamically based on current hostname
// This ensures tenant subdomain requests go to the correct backend
const getDynamicApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const currentPort = window.location.port;
    
    // Check if we have a tenant subdomain (e.g., acme.rioassetmanagement.net)
    const parts = hostname.split('.');
    const hasSubdomain = hostname.includes('.') && 
                        hostname !== 'localhost' && 
                        !hostname.startsWith('127.0.0.1') &&
                        parts.length >= 2 &&
                        parts[0] !== '' &&
                        !isReservedSubdomain(hostname);
    
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
      const apiPort = import.meta.env.VITE_API_PORT || '5001';
      return `http://localhost:${apiPort}/api`;
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

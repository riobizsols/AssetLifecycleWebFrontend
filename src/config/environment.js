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
  // In development, use the configured URL
  if (currentEnv === 'development') {
    return config.development.API_BASE_URL;
  }
  
  // In production, use the current hostname to support subdomains
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // If we have a subdomain (e.g., rio.riowebworks.net), use it
    // Otherwise, use the configured URL or default
    if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.0.0.1')) {
      // Use the same hostname but with /api path
      // Note: If your backend is on a different port, adjust this
      return `${protocol}//${hostname}${port}/api`;
    }
  }
  
  // Fallback to configured URL
  return config.production.API_BASE_URL;
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

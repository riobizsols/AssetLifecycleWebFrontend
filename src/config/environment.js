// Environment configuration for frontend
const config = {
  development: {
    API_BASE_URL: 'http://localhost:4000/api',
    FRONTEND_URL: 'http://localhost:5173',
    ENVIRONMENT: 'development'
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://your-domain.com/api',
    FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || 'https://your-domain.com',
    ENVIRONMENT: 'production'
  }
};

// Get current environment
const currentEnv = import.meta.env.MODE || 'development';

// Export current environment config
export const environment = config[currentEnv];

// Export individual values for convenience
export const API_BASE_URL = environment.API_BASE_URL;
export const FRONTEND_URL = environment.FRONTEND_URL;
export const ENVIRONMENT = environment.ENVIRONMENT;

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default environment;

import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { API_BASE_URL } from "../config/environment";

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // optional if you're using cookies
});

console.log('🔍 [Axios] Base URL configured as:', API_BASE_URL);

API.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔍 [Axios] Request URL:', config.baseURL + config.url);
    return config;
});

// Response interceptor to handle unauthorized responses
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            // Try to refresh token if available
            const authStore = useAuthStore.getState();
            if (authStore.token && authStore.user) {
                try {
                    console.log('🔄 [Axios] Attempting token refresh...');
                    
                    // Call refresh token endpoint (if available)
                    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        token: authStore.token
                    });
                    
                    if (refreshResponse.data.success) {
                        // Update token in store
                        authStore.login({
                            ...authStore.user,
                            token: refreshResponse.data.token
                        });
                        
                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
                        return API(originalRequest);
                    }
                } catch (refreshError) {
                    console.log('🔄 [Axios] Token refresh failed:', refreshError.message);
                }
            }
            
            // If refresh failed or no token available, logout
            console.log('🔒 [Axios] Authentication failed - logging out');
            authStore.logout();
            
            // Only redirect if not already on login page
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        
        return Promise.reject(error);
    }
);

export default API;

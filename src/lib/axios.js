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
    (error) => {
        if (error.response?.status === 401) {
            // Clear authentication state
            useAuthStore.getState().logout();
            
            // Navigate to root route
            window.location.href = '/';
            
            console.log('🔒 [Axios] Unauthorized - redirected to login');
        }
        return Promise.reject(error);
    }
);

export default API;

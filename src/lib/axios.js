import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { API_BASE_URL } from "../config/environment";

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // optional if you're using cookies
});

API.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;

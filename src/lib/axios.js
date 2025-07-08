import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
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

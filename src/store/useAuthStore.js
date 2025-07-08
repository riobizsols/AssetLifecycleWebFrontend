import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            token: null,

            login: (data) =>
                set({
                    isAuthenticated: true,
                    user: data,
                    token: data.token,
                    job_role_id: data.job_role_id,
                }),

            logout: () =>
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                }),
        }),
        {
            name: "auth-storage", // key in localStorage
        }
    )
);

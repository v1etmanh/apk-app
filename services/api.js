import axios from 'axios';
import { supabase } from '../store/suppabase'; // 👈 import supabase client

const API_BASE_URL = 'https://dailyserver-production.up.railway.app';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ REQUEST: tự động gắn JWT vào mọi request
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE: nếu 401 → refresh token → thử lại 1 lần
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // tránh loop vô hạn

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        const { data: { session } } = await supabase.auth.getSession();
        originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
        return api(originalRequest); // thử lại request cũ
      }
    }

    const msg = error.response?.data?.detail || error.message;
    console.error('[API Error]', error.config?.url, msg);
    return Promise.reject(error);
  }
);
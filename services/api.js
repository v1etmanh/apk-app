import axios from 'axios';
import { supabase } from '../store/supabase';
import i18n from '../i18n';

// [FIX ID-M001] Dùng env var thay vì hardcode local IP + HTTP
// Tạo .env: EXPO_PUBLIC_API_BASE_URL=https://your-production-server.com
// Dev fallback: http://localhost:5001 (không đẩy hardcode lên production)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://dailyserver-production.up.railway.app';

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
    // Backend can return localized dish/recommendation content when supported.
    config.headers['Accept-Language'] = i18n.language || 'vi';
    config.params = { ...(config.params || {}), lang: i18n.language || 'vi' };
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
      // trích xuất trường error ra và đổi tên nso thành refresherror
      if (!refreshError) {
        // check nếu việc refresh thành công thì thực hiện lấy secssion
        const { data: { session } } = await supabase.auth.getSession();
        // lấy dữ liệu là data và lấy thành phần con của data có tên là session
        originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
        // thay token trong header bằng token mới
        return api(originalRequest); // thử lại request cũ
      }
    }

    const msg = error.response?.data?.detail || error.message;
    // [FIX ID-M004] Chỉ log URL trong dev build — tránh leak API path + lat/lon production
    if (__DEV__) console.error('[API Error]', error.config?.url, msg);
    return Promise.reject(error);
  }
);

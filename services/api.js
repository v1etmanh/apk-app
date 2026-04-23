import axios from 'axios';

// 🔴 ĐỔI IP NÀY thành IP máy tính chạy server Flask
// Windows: ipconfig → IPv4 Address
// Mac/Linux: ifconfig → inet
// Android Emulator: 10.0.2.2 (alias localhost của host)
// Android Emulator: 10.0.2.2 trỏ về localhost máy host
// Thiết bị thật / Expo Go: đổi thành IP LAN (vd: 'http://192.168.1.5:5001')
// Tìm IP: Windows → `ipconfig` | Mac → `ifconfig`
const API_BASE_URL = 'https://dailyserver-production.up.railway.app/';
const DEFAULT_WEATHER_COORDS = { lat: 16.047, lon: 108.206 };

const isValidCoordinate = (value, min, max) => {
  if (value === null || value === undefined || value === '') return false;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
};

const normalizeWeatherUrl = (url = '') => {
  if (!url.includes('/api/weather')) return url;

  const [path, queryString = ''] = url.split('?');
  const params = new URLSearchParams(queryString);
  const lat = params.get('lat');
  const lon = params.get('lon');

  if (!isValidCoordinate(lat, -90, 90)) {
    params.set('lat', String(DEFAULT_WEATHER_COORDS.lat));
  }

  if (!isValidCoordinate(lon, -180, 180)) {
    params.set('lon', String(DEFAULT_WEATHER_COORDS.lon));
  }

  return `${path}?${params.toString()}`;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => ({
    ...config,
    url: normalizeWeatherUrl(config.url),
  }),
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message;
    console.error('[API Error]', error.config?.url, msg);
    return Promise.reject(error);
  }
);

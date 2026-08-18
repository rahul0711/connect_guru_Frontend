import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ── Base URL ──────────────────────────────────────────────
export const BASE_URL = 'https://api.connectguru.in/api/';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor: attach token if present ──────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: log errors ─────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error?.response?.data ?? error.message);
    return Promise.reject(error);
  },
);

export default api;

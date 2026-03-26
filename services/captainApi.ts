import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * Captain API Service
 */

const API_BASE_URL = __DEV__
  ? "https://eternal-viper-hardly.ngrok-free.app/api"
  : "https://eternal-viper-hardly.ngrok-free.app/api";

const TOKEN_KEY = 'captain_jwt_token';
const USER_KEY = 'captain_user_data';

export const tokenStorage = {
  async save(token: string) { 
    await SecureStore.setItemAsync(TOKEN_KEY, token); 
  },
  async get(): Promise<string | null> { 
    return SecureStore.getItemAsync(TOKEN_KEY); 
  },
  async clear() { 
    await SecureStore.deleteItemAsync(TOKEN_KEY); 
  },

  async saveUser(user: any) { 
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)); 
  },
  async getUser(): Promise<any> {
    const s = await SecureStore.getItemAsync(USER_KEY);
    return s ? JSON.parse(s) : null;
  },
  async clearUser() { 
    await SecureStore.deleteItemAsync(USER_KEY); 
  },
  async clearAll() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};

// Axios Instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto inject token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── AUTH API ───────────────────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async register(data: any) {
    const res = await api.post('/auth/register', { ...data, role: 'captain' });
    return res.data;
  },

  // Firebase Phone Auth
  async firebaseLogin(idToken: string) {
    const res = await api.post('/captain/auth/firebase-login', { idToken });
    return res.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async completeProfile(data: any) {
    const res = await api.post('/captain/auth/complete-profile', data);
    return res.data;
  },
};

// ─── CAPTAIN API ────────────────────────────────────────────────────────────
export const captainApi = {
  async getMyProfile() {
    const res = await api.get('/captain/profile');
    return res.data;
  },

  async getProfile() {
    return this.getMyProfile();
  },

  async updateProfile(data: any) {
    const res = await api.put('/captain/profile', data);
    return res.data;
  },

  async getDashboard() {
    const res = await api.get('/captain/dashboard');
    return res.data;
  },
};

// ─── DJ API ─────────────────────────────────────────────────────────────────
export const djApi = {
  async getAll(params?: any) {
    const res = await api.get('/captain/djs', { params });
    return res.data;
  },

  async getById(id: number) {
    const res = await api.get(`/captain/djs/${id}`);
    return res.data;
  },

  async create(data: any) {
    const res = await api.post('/captain/djs', data);
    return res.data;
  },

  async update(id: number, data: any) {
    const res = await api.put(`/captain/djs/${id}`, data);
    return res.data;
  },

  async toggleAvailability(id: number) {
    const res = await api.put(`/captain/djs/${id}/availability`);
    return res.data;
  },

  async remove(id: number) {
    const res = await api.delete(`/captain/djs/${id}`);
    return res.data;
  },
};

// ─── EQUIPMENT API ──────────────────────────────────────────────────────────
export const equipmentApi = {
  async getAll(params?: any) {
    const res = await api.get('/captain/equipment', { params });
    return res.data;
  },

  async getById(id: number) {
    const res = await api.get(`/captain/equipment/${id}`);
    return res.data;
  },

  async create(data: any) {
    const res = await api.post('/captain/equipment', data);
    return res.data;
  },

  async update(id: number, data: any) {
    const res = await api.put(`/captain/equipment/${id}`, data);
    return res.data;
  },

  async toggleAvailability(id: number) {
    const res = await api.put(`/captain/equipment/${id}/availability`);
    return res.data;
  },

  async remove(id: number) {
    const res = await api.delete(`/captain/equipment/${id}`);
    return res.data;
  },

  CATEGORIES: [
    'Speaker', 'Mixer', 'Turntable', 'Microphone', 'Lighting',
    'Fog Machine', 'Laser', 'LED Panel', 'Amplifier', 'Subwoofer',
    'DJ Controller', 'Projector', 'LED Screen', 'Karaoke System', 'Other'
  ] as const,
};

// ─── BOOKING API ────────────────────────────────────────────────────────────
export const bookingApi = {
  async getAll(params?: any) {
    const res = await api.get('/captain/bookings', { params });
    return res.data;
  },

  async getById(id: number) {
    const res = await api.get(`/captain/bookings/${id}`);
    return res.data;
  },

  async updateStatus(id: number, status: string, captainNotes?: string) {
    const res = await api.put(`/captain/bookings/${id}/status`, { status, captainNotes });
    return res.data;
  },

  async generateOtp(id: number) {
    const res = await api.post(`/captain/bookings/${id}/generate-otp`);
    return res.data;
  },

  async verifyOtp(id: number, otp: string) {
    const res = await api.post(`/captain/bookings/${id}/verify-otp`, { otp });
    return res.data;
  },

  STATUSES: ['Pending', 'Confirmed', 'Equipment Dispatched', 'In Progress', 'Completed', 'Cancelled'] as const,
};

export default api;
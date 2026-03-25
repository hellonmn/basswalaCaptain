import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from './secureStorage';

/**
 * API Service with built-in security features:
 * - Automatic token injection
 * - Token refresh on 401
 * - Request/Response interceptors
 * - Error handling
 */

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' // Development
  : 'https://your-production-api.com/api'; // Production

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add auth token to headers
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await secureStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.api(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await secureStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Refresh the token
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            await secureStorage.saveTokens(accessToken, newRefreshToken);

            // Retry all queued requests
            this.failedQueue.forEach((prom) => prom.resolve());
            this.failedQueue = [];

            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear auth and redirect to login
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            await secureStorage.clearAuth();
            // You can emit an event here to redirect to login
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Process failed queue
   */
  private processQueue(error: Error | null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve();
      }
    });
    this.failedQueue = [];
  }

  // ========== AUTH ENDPOINTS ==========

  async register(email: string, password: string, name: string) {
    const response = await this.api.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async logout() {
    const refreshToken = await secureStorage.getRefreshToken();
    await this.api.post('/auth/logout', { refreshToken });
    await secureStorage.clearAuth();
  }

  async resetPassword(email: string) {
    const response = await this.api.post('/auth/reset-password', {
      email,
    });
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await this.api.post('/auth/verify-email', {
      token,
    });
    return response.data;
  }

  // ========== USER ENDPOINTS ==========

  async getProfile() {
    const response = await this.api.get('/users/profile');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.api.put('/users/profile', data);
    return response.data;
  }

  // ========== DJ EQUIPMENT ENDPOINTS ==========

  async getEquipment(params?: { category?: string; search?: string }) {
    const response = await this.api.get('/equipment', { params });
    return response.data;
  }

  async getEquipmentById(id: string) {
    const response = await this.api.get(`/equipment/${id}`);
    return response.data;
  }

  // ========== RENTAL ENDPOINTS ==========

  async createRental(data: {
    equipmentId: string;
    startDate: string;
    endDate: string;
    deliveryAddress?: string;
  }) {
    const response = await this.api.post('/rentals', data);
    return response.data;
  }

  async getRentals(params?: { status?: string }) {
    const response = await this.api.get('/rentals', { params });
    return response.data;
  }

  async getRentalById(id: string) {
    const response = await this.api.get(`/rentals/${id}`);
    return response.data;
  }

  async cancelRental(id: string) {
    const response = await this.api.delete(`/rentals/${id}`);
    return response.data;
  }

  // ========== PAYMENT ENDPOINTS ==========

  async createPaymentIntent(rentalId: string) {
    const response = await this.api.post('/payments/create-intent', {
      rentalId,
    });
    return response.data;
  }

  async confirmPayment(paymentIntentId: string) {
    const response = await this.api.post('/payments/confirm', {
      paymentIntentId,
    });
    return response.data;
  }
}

export const apiService = new ApiService();
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { secureStorage } from "./secureStorage";

// Use your ngrok or production URL
const API_BASE_URL = __DEV__
  ? "https://eternal-viper-hardly.ngrok-free.app/api"
  : "https://eternal-viper-hardly.ngrok-free.app/api";

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: {
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await secureStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => this.api(originalRequest))
              .catch((err) => Promise.reject(err));
          }
          originalRequest._retry = true;
          this.isRefreshing = true;
          try {
            const refreshToken = await secureStorage.getRefreshToken();
            if (!refreshToken) {
              // Firebase OTP / single-token flows don't issue a refresh token.
              // Clear auth so the app redirects to login rather than looping.
              await secureStorage.clearAuth();
              this.failedQueue.forEach((p) => p.reject(new Error("Session expired")));
              this.failedQueue = [];
              return Promise.reject(new Error("Session expired. Please log in again."));
            }
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            // Fall back to the old token if server doesn't return a new refresh token
            await secureStorage.saveTokens(
              accessToken ?? refreshToken,
              newRefreshToken ?? refreshToken,
            );
            this.failedQueue.forEach((prom) => prom.resolve());
            this.failedQueue = [];
            return this.api(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            await secureStorage.clearAuth();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // ========== AUTH ==========

  async register(data: {
    firstName: string; lastName: string; email: string;
    phone: string; password: string; role?: string; dateOfBirth?: string;
    location?: { latitude: number; longitude: number; address?: Record<string, string> };
  }) {
    const response = await this.api.post("/auth/register", data);
    return response.data;
  }

  async login(credentials: { email?: string; phone?: string; password: string; location?: any }) {
    if (!credentials.email && !credentials.phone) {
      throw new Error("Email or phone is required");
    }
    const response = await this.api.post("/auth/login", credentials);
    return response.data;
  }

  /**
   * Exchange a Firebase ID token for an app JWT.
   * Called after successful OTP verification via Firebase.
   * Backend should verify the idToken with Firebase Admin SDK
   * and return { accessToken, refreshToken, user }.
   */
  async loginWithFirebase(data: {
    idToken: string;
    uid: string;
    phone: string;
  }) {
    const response = await this.api.post("/auth/firebase-login", data);
    return response.data;
  }

  async getMe() {
    const response = await this.api.get("/auth/me");
    return response.data;
  }

  async logout() {
    const refreshToken = await secureStorage.getRefreshToken();
    try { await this.api.post("/auth/logout", { refreshToken }); } catch (_) {}
    await secureStorage.clearAuth();
  }

  async resetPassword(email: string) {
    const response = await this.api.post("/auth/reset-password", { email });
    return response.data;
  }

  async updateProfile(data: Partial<{
    firstName: string; lastName: string; phone: string;
    dateOfBirth: string; profilePicture: string; preferences: any;
  }>) {
    const response = await this.api.put("/auth/profile", data);
    return response.data;
  }

  async updateLocation(data: { latitude: number; longitude: number; address?: Record<string, any> }) {
    const response = await this.api.put("/auth/location", data);
    return response.data;
  }

  // ========== USER ==========

  async getProfile() {
    const response = await this.api.get("/users/profile");
    return response.data;
  }

  async getUserBookings(params?: { status?: string; page?: number; limit?: number }) {
    const response = await this.api.get("/users/bookings", { params });
    return response.data;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await this.api.put("/users/change-password", data);
    return response.data;
  }

  // ========== DJs / EQUIPMENT ==========

  /**
   * Get all available DJs (used as equipment catalog)
   */
  async getDJs(params?: {
    isAvailable?: boolean;
    city?: string;
    search?: string;
    genre?: string;
    minRate?: number;
    maxRate?: number;
    page?: number;
    limit?: number;
  }) {
    const response = await this.api.get("/djs", { params });
    return response.data;
  }

  /**
   * Get nearby DJs based on coordinates
   */
  async getNearbyDJs(params: { latitude: number; longitude: number; maxDistance?: number }) {
    const response = await this.api.get("/djs/nearby", { params });
    return response.data;
  }

  /**
   * Search DJs
   */
  async searchDJs(params?: { genre?: string; minRate?: number; maxRate?: number; city?: string; minRating?: number }) {
    const response = await this.api.get("/djs/search", { params });
    return response.data;
  }

  /**
   * Get single DJ by ID
   */
  async getDJById(id: string | number) {
    const response = await this.api.get(`/djs/${id}`);
    return response.data;
  }

  /**
   * Get DJ equipment details
   */
  async getDJEquipment(id: string | number) {
    const response = await this.api.get(`/djs/${id}/equipment`);
    return response.data;
  }

  // ========== BOOKINGS ==========

  /**
   * Create a standard booking (for DJ hire)
   */
  async createBooking(data: {
    djId: number;
    eventDetails: {
      eventType: string;
      eventDate: string;
      startTime: string;
      endTime: string;
      duration: number;
      guestCount?: number;
      specialRequests?: string;
      basePrice: number;
      additionalCharges?: any[];
      totalAmount?: number;
    };
    eventLocation: {
      latitude: number;
      longitude: number;
      address?: {
        street?: string; city?: string; state?: string;
        zipCode?: string; country?: string;
      };
    };
    pricing?: { basePrice: number; totalAmount: number; additionalCharges?: any[] };
  }) {
    // Map to backend expected format
    const payload = {
      djId: data.djId,
      eventDetails: {
        ...data.eventDetails,
        totalAmount: data.eventDetails.totalAmount || data.eventDetails.basePrice,
      },
      eventLocation: {
        coordinates: [data.eventLocation.longitude, data.eventLocation.latitude],
        address: data.eventLocation.address,
        latitude: data.eventLocation.latitude,
        longitude: data.eventLocation.longitude,
        street: data.eventLocation.address?.street || "",
        city: data.eventLocation.address?.city || "",
        state: data.eventLocation.address?.state || "",
        zipCode: data.eventLocation.address?.zipCode || "",
        country: data.eventLocation.address?.country || "India",
      },
      pricing: data.pricing || {
        basePrice: data.eventDetails.basePrice,
        totalAmount: data.eventDetails.totalAmount || data.eventDetails.basePrice,
        additionalCharges: data.eventDetails.additionalCharges || [],
      },
    };
    const response = await this.api.post("/bookings", payload);
    return response.data;
  }

  /**
   * Get current user's bookings
   */
  async getMyBookings(params?: { status?: string; page?: number; limit?: number }) {
    const response = await this.api.get("/bookings/my-bookings", { params });
    return response.data;
  }

  async getBookingById(id: string | number) {
    const response = await this.api.get(`/bookings/${id}`);
    return response.data;
  }

  async cancelBooking(id: string | number) {
    const response = await this.api.delete(`/bookings/${id}`);
    return response.data;
  }

  async addBookingReview(id: string | number, data: { rating: number; review?: string }) {
    const response = await this.api.put(`/bookings/${id}/review`, data);
    return response.data;
  }

  // ========== PAYMENTS ==========

  /**
   * Step 1 — Create Razorpay order. Amount in rupees.
   */
  async createPaymentOrder(amountInRupees: number) {
    const response = await this.api.post("/payments/create-order", {
      amount: amountInRupees,
      currency: "INR",
      notes: { source: "basswala_app" },
    });
    return response.data;
  }

  /**
   * Step 2 — Verify Razorpay signature after payment.
   */
  async verifyPayment(data: { orderId: string; paymentId: string; signature: string }) {
    const response = await this.api.post("/payments/verify-payment", {
      razorpay_order_id: data.orderId,
      razorpay_payment_id: data.paymentId,
      razorpay_signature: data.signature,
    });
    return response.data;
  }

  /**
   * Step 3 — Create booking after payment verified.
   */
  async createRental(data: {
    equipmentId: string; // djId
    startDate: string;
    endDate: string;
    deliveryAddress?: string;
    paymentId?: string;
    paymentMethod?: string;
    razorpayOrderId?: string;
    eventType?: string;
    startTime?: string;
    endTime?: string;
    guestCount?: number;
    specialRequests?: string;
    basePrice?: number;
    latitude?: number;
    longitude?: number;
  }) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const durationDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );

    const response = await this.api.post("/payments/create-booking", {
      djId: data.equipmentId,
      razorpay_order_id: data.razorpayOrderId,
      razorpay_payment_id: data.paymentId,
      eventDetails: {
        eventType: data.eventType || "Other",
        eventDate: data.startDate,
        startTime: data.startTime || "10:00",
        endTime: data.endTime || "18:00",
        duration: durationDays,
        guestCount: data.guestCount || null,
        specialRequests: data.specialRequests || null,
        basePrice: data.basePrice || 0,
        additionalCharges: [],
      },
      eventLocation: {
        latitude: data.latitude || 26.9124,
        longitude: data.longitude || 75.7873,
        street: data.deliveryAddress || "",
        city: "",
        state: "",
        zipCode: "",
        country: "India",
      },
    });

    const raw = response.data;
    return {
      ...raw,
      rental: raw.booking ?? raw.rental ?? null,
    };
  }

  async getPaymentStatus(orderId: string) {
    const response = await this.api.get(`/payments/status/${orderId}`);
    return response.data;
  }

  async getPaymentHistory(params?: { page?: number; limit?: number; status?: string }) {
    const response = await this.api.get("/payments/history", { params });
    return response.data;
  }

  async getUPIPaymentStatus(paymentId: string) {
    const response = await this.api.get(`/payments/upi-status/${paymentId}`);
    return response.data;
  }

  async initiateRefund(paymentId: string, data?: { amount?: number; reason?: string }) {
    const response = await this.api.post(`/payments/refund/${paymentId}`, data ?? {});
    return response.data;
  }

  // Alias for BookingBottomSheet compatibility
  async initiateUPICollect(data: any) {
    const response = await this.api.post("/payments/upi-collect", data);
    return response.data;
  }
}

export const apiService = new ApiService();
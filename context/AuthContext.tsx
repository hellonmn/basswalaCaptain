import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, tokenStorage } from '../services/captainApi';
import auth from '@react-native-firebase/auth';   // ← react-native-firebase auth

interface CaptainProfile {
  id: number;
  businessName?: string;
  phone?: string;
  locationCity?: string;
  isActive: boolean;
  isVerified: boolean;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  profilePicture?: string;
  captainProfile?: CaptainProfile;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  loginWithOTP: (phone: string) => Promise<any>;           // returns ConfirmationResult
  verifyOTP: (otp: string, confirmationResult: any) => Promise<void>;
  resendOTP: (phone: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await tokenStorage.get();
      if (token) {
        const storedUser = await tokenStorage.getUser();
        if (storedUser) setUser(storedUser);

        const res = await authApi.getMe();
        if (res.success && res.data) {
          setUser(res.data);
          await tokenStorage.saveUser(res.data);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await tokenStorage.clearAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!res.success) throw new Error(res.message || 'Login failed');

    await tokenStorage.save(res.token);
    await tokenStorage.saveUser(res.user);
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await authApi.register(data);
    if (!res.success) throw new Error(res.message || 'Registration failed');

    await tokenStorage.save(res.token);
    await tokenStorage.saveUser(res.user);
    setUser(res.user);
  };

  // ─── OTP Flow with react-native-firebase ─────────────────────────────────────
  const loginWithOTP = async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    try {
      const confirmationResult = await auth().signInWithPhoneNumber(formattedPhone);
      return confirmationResult;                 // important: return this object
    } catch (error: any) {
      console.error('loginWithOTP error:', error);
      throw new Error(error.message || 'Failed to send OTP');
    }
  };

  const verifyOTP = async (otp: string, confirmationResult: any) => {
    try {
      const firebaseCredential = await confirmationResult.confirm(otp);

      const idToken = await firebaseCredential.user.getIdToken();

      // Exchange Firebase ID token for your backend JWT
      const res = await authApi.firebaseLogin(idToken);
      console.log(res)

      if (!res.success) throw new Error(res.message || 'Backend login failed');

      await tokenStorage.save(res.token);
      await tokenStorage.saveUser(res.user);
      setUser(res.user);
    } catch (error: any) {
      console.error('verifyOTP error:', error);
      throw new Error(error.message || 'Invalid OTP. Please try again.');
    }
  };

  const resendOTP = async (phone: string) => {
    // Simply call loginWithOTP again (Firebase handles rate limiting)
    return loginWithOTP(phone);
  };

  const logout = async () => {
    await auth().signOut();           // optional: sign out from Firebase too
    await tokenStorage.clearAll();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        await tokenStorage.saveUser(res.data);
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
      loginWithOTP,
      verifyOTP,
      resendOTP,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
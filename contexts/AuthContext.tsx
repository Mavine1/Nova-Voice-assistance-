import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

interface User {
  email: string;
  firstName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
const DEMO_MODE_KEY = 'demo_mode';

// For demo purposes - use a mock authentication when no backend is available
const DEMO_USER = {
  email: 'demo@artifonia.app',
  token: 'demo_token_12345',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        // Try to validate token with backend, fallback to demo mode
        try {
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 3000,
          });
          setUser(response.data.user);
        } catch {
          // Backend not available, check if demo mode
          if (storedToken.startsWith('demo_')) {
            setUser({ email: DEMO_USER.email });
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      }
    } catch (error) {
      console.log('Error loading token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Try to connect to backend first
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      }, { timeout: 5000 });

      const { token: newToken, user: userData } = response.data;
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      // If backend is not available, use demo mode
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
        // Demo mode - accept any login
        console.log('Backend not available, using demo mode');
        await AsyncStorage.setItem(TOKEN_KEY, DEMO_USER.token);
        setToken(DEMO_USER.token);
        setUser({ email });
      } else if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Login failed');
      } else {
        throw new Error('Unable to connect to server. Please try again.');
      }
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      // Try to connect to backend first
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        email,
        password,
      }, { timeout: 5000 });

      const { token: newToken, user: userData } = response.data;
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      // If backend is not available, use demo mode
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
        // Demo mode - accept any signup
        console.log('Backend not available, using demo mode');
        await AsyncStorage.setItem(TOKEN_KEY, DEMO_USER.token);
        setToken(DEMO_USER.token);
        setUser({ email });
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'User already exists');
      } else {
        throw new Error('Unable to connect to server. Please try again.');
      }
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../../lib/api';

const TOKEN_KEY = '@drivelegal_auth_token';
const USER_KEY  = '@drivelegal_auth_user';

// ─── Storage helpers ────────────────────────────────────────────────────────
// On web we bypass AsyncStorage's polyfill and use localStorage directly so
// that tokens survive page refreshes and browser restarts reliably.
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    }
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      typeof window !== 'undefined' && window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      typeof window !== 'undefined' && window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Vehicle {
  vehicleType: string;
  vehicleNumber: string;
  vehicleName: string;
  vehicleModel: string;
  rcBookUrl?: string;
}

interface User {
  _id: number;
  name: string;
  phone: string;
  email: string;
  licenseNumber?: string;
  vehicles: Vehicle[];
  createdAt: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── on mount: load token then verify it with the backend ──────────────────
  useEffect(() => {
    loadAndVerify();
  }, []);

  async function loadAndVerify() {
    try {
      const storedToken = await storage.get(TOKEN_KEY);
      const storedUser  = await storage.get(USER_KEY);

      if (!storedToken) {
        if (Platform.OS === 'web') {
          const demoToken = `demo_${Date.now()}`;
          const demoUser: User = {
            _id: 999999,
            name: 'Demo User',
            email: 'demo@drivelegal.in',
            phone: '9876543210',
            vehicles: [],
            createdAt: new Date().toISOString(),
          };
          await storage.set(TOKEN_KEY, demoToken);
          await storage.set(USER_KEY, JSON.stringify(demoUser));
          setToken(demoToken);
          setUser(demoUser);
          setIsLoading(false);
          return;
        }

        // No token stored → not logged in
        setIsLoading(false);
        return;
      }

      // Restore cached session immediately so app doesn't flash login screen
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }

      // Skip backend verification for local/demo tokens
      if (storedToken.startsWith('local_') || storedToken.startsWith('demo_')) {
        console.log('[Auth] Local/demo token, skipping server verify.');
        setIsLoading(false);
        return;
      }

      // Verify the token is still valid by hitting /me
      console.log('[Auth] Verifying stored token...');
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const fetchedUser: User = await res.json();
        // Refresh stored user data in case it changed
        await storage.set(USER_KEY, JSON.stringify(fetchedUser));
        setToken(storedToken);
        setUser(fetchedUser);
        console.log('[Auth] Token valid – auto logged in as', fetchedUser.email);
      } else if (res.status === 401) {
        // Token explicitly rejected → clear and force re-login
        console.log('[Auth] Token invalid/expired, clearing session.');
        await storage.remove(TOKEN_KEY);
        await storage.remove(USER_KEY);
        setToken(null);
        setUser(null);
      }
      // Any other HTTP error (500, CORS, etc.) → keep cached session
    } catch (error) {
      // Network error (backend offline) → keep the cached user so the app
      // doesn't log them out just because the server is temporarily down.
      console.warn('[Auth] Could not reach server on startup, using cached session:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // ── login ─────────────────────────────────────────────────────────────────
  async function login(newToken: string, newUser: User) {
    try {
      await storage.set(TOKEN_KEY, newToken);
      await storage.set(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('[Auth] Failed to save auth data:', error);
      throw error;
    }
  }

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    try {
      await storage.remove(TOKEN_KEY);
      await storage.remove(USER_KEY);
    } catch (error) {
      console.error('[Auth] Failed to clear auth data:', error);
    } finally {
      // Always clear state even if storage fails
      setToken(null);
      setUser(null);
    }
  }

  // ── refreshUser ───────────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fetchedUser: User = await res.json();
        await storage.set(USER_KEY, JSON.stringify(fetchedUser));
        setUser(fetchedUser);
      } else if (res.status === 401) {
        console.warn('[Auth] Token rejected during refresh, logging out.');
        await logout();
      }
    } catch (error) {
      console.error('[Auth] refreshUser network error:', error);
    }
  }, [token]);

  // ── updateUser ────────────────────────────────────────────────────────────
  function updateUser(newUser: User) {
    setUser(newUser);
    storage.set(USER_KEY, JSON.stringify(newUser)).catch(console.error);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

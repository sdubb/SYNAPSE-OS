import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  tenantId: string;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, fullName?: string, tenantId?: string) => Promise<void>;
  loginWithApiKey: (apiKey: string) => Promise<void>;
  logout: () => void;
  switchTenant: (newTenantId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [tenantId, setTenantId] = useState<string>(() => api.getTenantId());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user from backend
  const fetchCurrentUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await api.request<{ user: any; tenantId: string }>('/auth/me');
      if (res.user) {
        return {
          id: res.user.id,
          name: res.user.fullName || res.user.email,
          email: res.user.email,
          role: res.user.role,
          tenantId: res.user.tenantId || res.tenantId,
          tenantName: res.user.tenantName || 'Organization',
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Initialize: restore session from saved token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = api.getToken();
        if (savedToken) {
          // Verify token is still valid by fetching current user
          const currentUser = await fetchCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            if (currentUser.tenantId) setTenantId(currentUser.tenantId);
          } else {
            // Token invalid/expired — clear
            api.setToken(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [fetchCurrentUser]);

  // Login with email
  const login = useCallback(async (email: string, _password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.request<{
        token: string;
        user: any;
        expiresIn: number;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, tenantId: api.getTenantId() }),
      });
      api.setToken(res.token);
      setToken(res.token);
      const newTenantId = res.user.tenantId || api.getTenantId();
      setTenantId(newTenantId);

      const profile: UserProfile = {
        id: res.user.id,
        name: res.user.fullName || res.user.email,
        email: res.user.email,
        role: res.user.role,
        tenantId: res.user.tenantId || api.getTenantId(),
        tenantName: res.user.tenantName || 'Organization',
      };
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register new user
  const register = useCallback(async (email: string, fullName?: string, newTenantId?: string) => {
    setIsLoading(true);
    try {
      const regTenant = newTenantId || api.getTenantId();
      await api.request<{ user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, fullName, tenantId: regTenant }),
      });
      // After registration, auto-login
      await login(email);
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // Login with API key
  const loginWithApiKey = useCallback(async (apiKey: string) => {
    setIsLoading(true);
    try {
      const res = await api.request<{
        token: string;
        user: any;
        expiresIn: number;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ apiKey, tenantId: api.getTenantId() }),
      });
      api.setToken(res.token);
      setToken(res.token);
      const newTenantId = res.user.tenantId || api.getTenantId();
      setTenantId(newTenantId);

      const profile: UserProfile = {
        id: res.user.id,
        name: res.user.fullName || res.user.email,
        email: res.user.email,
        role: res.user.role,
        tenantId: res.user.tenantId || api.getTenantId(),
        tenantName: res.user.tenantName || 'Organization',
      };
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  }, []);

  // Switch tenant
  const switchTenant = useCallback((newTenantId: string) => {
    api.setTenantId(newTenantId);
    setTenantId(newTenantId);
    // Refetch user with new tenant context
    fetchCurrentUser().then((u) => {
      if (u) setUser(u);
    });
  }, [fetchCurrentUser]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    if (currentUser) setUser(currentUser);
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token),
        token,
        tenantId,
        user,
        isLoading,
        login,
        register,
        loginWithApiKey,
        logout,
        switchTenant,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import type { UserProfile } from '@/types';

export type SessionSecurityState = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'UNAUTHENTICATED';

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  tenantId: string;
  user: UserProfile | null;
  isLoading: boolean;
  sessionStatus: SessionSecurityState;
  revocationReason: string | null;
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
  const [sessionStatus, setSessionStatus] = useState<SessionSecurityState>(() =>
    api.getToken() ? 'ACTIVE' : 'UNAUTHENTICATED'
  );
  const [revocationReason, setRevocationReason] = useState<string | null>(null);

  // Fetch current user from authoritative backend
  const fetchCurrentUser = useCallback(async (): Promise<{ user: UserProfile | null; status: SessionSecurityState; reason?: string }> => {
    try {
      const res = await api.request<{ user: any; tenantId: string }>('/auth/me');
      if (res.user) {
        return {
          user: {
            id: res.user.id,
            name: res.user.fullName || res.user.email,
            email: res.user.email,
            role: res.user.role || 'operator',
            tenantId: res.user.tenantId || res.tenantId,
            tenantName: res.user.tenantName || 'Enterprise Organization',
          },
          status: 'ACTIVE',
        };
      }
      return { user: null, status: 'EXPIRED' };
    } catch (err: any) {
      const statusCode = err?.status || err?.statusCode;
      const errorMsg = err?.message || '';
      if (statusCode === 403 || errorMsg.includes('REVOKED') || errorMsg.includes('revoked')) {
        return { user: null, status: 'REVOKED', reason: errorMsg || 'Your session or account was revoked by an administrator.' };
      }
      if (statusCode === 401) {
        return { user: null, status: 'EXPIRED', reason: 'Session has expired. Please sign in again.' };
      }
      return { user: null, status: 'UNAUTHENTICATED' };
    }
  }, []);

  // Initialize: restore session from saved token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = api.getToken();
        if (savedToken) {
          const result = await fetchCurrentUser();
          if (result.user && result.status === 'ACTIVE') {
            setUser(result.user);
            setSessionStatus('ACTIVE');
            if (result.user.tenantId) setTenantId(result.user.tenantId);
          } else {
            // Token invalid/expired/revoked — fail closed
            api.setToken(null);
            setToken(null);
            setUser(null);
            setSessionStatus(result.status);
            if (result.reason) setRevocationReason(result.reason);
          }
        } else {
          setSessionStatus('UNAUTHENTICATED');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setSessionStatus('UNAUTHENTICATED');
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [fetchCurrentUser]);

  // Login with email
  const login = useCallback(async (email: string, _password?: string) => {
    setIsLoading(true);
    setRevocationReason(null);
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
        role: res.user.role || 'operator',
        tenantId: res.user.tenantId || api.getTenantId(),
        tenantName: res.user.tenantName || 'Enterprise Organization',
      };
      setUser(profile);
      setSessionStatus('ACTIVE');
    } catch (err: any) {
      if (err?.message?.includes('REVOKED') || err?.status === 403) {
        setSessionStatus('REVOKED');
        setRevocationReason(err.message || 'Account revoked');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register new user
  const register = useCallback(async (email: string, fullName?: string, newTenantId?: string) => {
    setIsLoading(true);
    setRevocationReason(null);
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
    setRevocationReason(null);
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
        role: res.user.role || 'operator',
        tenantId: res.user.tenantId || api.getTenantId(),
        tenantName: res.user.tenantName || 'Enterprise Organization',
      };
      setUser(profile);
      setSessionStatus('ACTIVE');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    setSessionStatus('UNAUTHENTICATED');
    setRevocationReason(null);
  }, []);

  // Switch tenant
  const switchTenant = useCallback((newTenantId: string) => {
    api.setTenantId(newTenantId);
    setTenantId(newTenantId);
    // Refetch user with new tenant context
    fetchCurrentUser().then((result) => {
      if (result.user) setUser(result.user);
    });
  }, [fetchCurrentUser]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const result = await fetchCurrentUser();
    if (result.user) setUser(result.user);
    setSessionStatus(result.status);
    if (result.reason) setRevocationReason(result.reason);
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token) && sessionStatus === 'ACTIVE',
        token,
        tenantId,
        user,
        isLoading,
        sessionStatus,
        revocationReason,
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

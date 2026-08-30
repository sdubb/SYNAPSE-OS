import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { UserProfile } from '@/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  tenantId: string;
  user: UserProfile | null;
  isLoading: boolean;
  login: (apiKeyOrUser?: string) => Promise<void>;
  logout: () => void;
  switchTenant: (newTenantId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [tenantId, setTenantId] = useState<string>(() => api.getTenantId());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = api.getToken();
        if (savedToken) {
          setUser({
            id: 'usr_admin_01',
            name: 'Operator',
            email: 'admin@synapse.os',
            role: 'admin',
            tenantId: api.getTenantId(),
            tenantName: 'Default Tenant',
          });
        } else {
          await login('usr_admin_01');
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (apiKeyOrUser: string = 'usr_admin_01') => {
    setIsLoading(true);
    try {
      const res = await api.login(apiKeyOrUser);
      setToken(res.token);
      setTenantId(res.tenantId);
      setUser({
        id: res.userId,
        name: 'Operator',
        email: 'admin@synapse.os',
        role: 'admin',
        tenantId: res.tenantId,
        tenantName: 'Default Tenant',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const switchTenant = useCallback((newTenantId: string) => {
    api.setTenantId(newTenantId);
    setTenantId(newTenantId);
    if (user) {
      setUser({ ...user, tenantId: newTenantId });
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: Boolean(token), token, tenantId, user, isLoading, login, logout, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

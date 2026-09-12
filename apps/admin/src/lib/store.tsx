'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setAdminToken, clearAdminToken, getAdminToken } from './api';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'FINANCE_ADMIN' | 'SUPPORT_AGENT';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

interface AdminContextType {
  session: AdminSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminSession>;
  logout: () => Promise<void>;
}

const SESSION_KEY = 'vuzki_admin_session';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AdminSession) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ token: string; admin: AdminSession }>('/admin/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setAdminToken(data.token);
    setSession(data.admin);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.admin));
    return data.admin;
  }, []);

  const logout = useCallback(async () => {
    clearAdminToken();
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // Validate the token on mount: if it no longer authenticates, force logout.
  useEffect(() => {
    if (!getAdminToken()) return;
    let cancelled = false;
    setLoading(true);
    api<{ admin: AdminSession }>('/admin/me')
      .then((data) => {
        if (!cancelled) {
          setSession(data.admin);
          localStorage.setItem(SESSION_KEY, JSON.stringify(data.admin));
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAdminToken();
          setSession(null);
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AdminContext.Provider value={{ session, loading, login, logout }}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

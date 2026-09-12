'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setTokens, clearTokens, getAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  gender: string;
  age: number | null;
  countryCode: string | null;
  bio: string | null;
  isPremium: boolean;
  premiumTier: string;
  isVerified: boolean;
  isCreator: boolean;
  creatorStatus: string | null;
  onlineStatus: boolean;
  interests: string[];
  languages: string[];
  onboardingStep: string;
  email: string | null;
  referralCode?: string | null;
  wallet?: { balance: number; currency: string };
  needsOnboarding?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string, otp?: string) => Promise<AuthUser>;
  register: (payload: Record<string, unknown>) => Promise<AuthUser>;
  sendOtp: (identifier: string, purpose: string) => Promise<void>;
  verifyOtp: (identifier: string, otp: string, purpose: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (u: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: AuthUser }>('/auth/me', { auth: true });
      setUser(data.user);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (identifier: string, password?: string, otp?: string) => {
    const data = await api<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string }; needsOnboarding: boolean; onboardingStep: string }>('/auth/login', {
      method: 'POST',
      body: { identifier, password, otp },
    });
    setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const data = await api<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string }; needsOnboarding: boolean; onboardingStep: string }>('/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    });
    setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const sendOtp = useCallback(async (identifier: string, purpose: string) => {
    await api('/auth/send-otp', { method: 'POST', body: { identifier, purpose }, auth: false });
  }, []);

  const verifyOtp = useCallback(async (identifier: string, otp: string, purpose: string) => {
    await api('/auth/verify', { method: 'POST', body: { identifier, otp }, auth: false });
  }, []);

  // TODO(oauth): Google/Apple OAuth are NOT implemented on the backend yet
  // (no authorization redirect, callback, code/token exchange, ID-token
  // verification, account linking, or token issuance). The frontend must not
  // present these as working login methods, and the handlers below are
  // intentionally disabled so neither can be invoked or fake a successful
  // authentication. Re-enable these (and the hidden UI buttons in the auth
  // pages) only after a real end-to-end OAuth flow exists.
  const loginWithGoogle = useCallback(async () => {
    throw new Error(
      'Google sign-in is not yet available. Use email/password or one-time code to log in.'
    );
  }, []);

  const loginWithApple = useCallback(async () => {
    throw new Error(
      'Apple sign-in is not yet available. Use email/password or one-time code to log in.'
    );
  }, []);

  const logout = useCallback(async () => {
    // Authenticated logout revokes this session server-side.
    await api('/auth/logout', { method: 'POST', body: {}, auth: true }).catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        loginWithApple,
        logout,
        refresh,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

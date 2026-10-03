import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getPushToken = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        return await messaging().getToken();
      }
    } catch (e) {
      console.log('Failed to get push token:', e);
    }
    return null;
  };

  const login = async (identifier, password) => {
    const pushToken = await getPushToken();
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, pushToken }),
    });
    const data = await res.json();
    if (data.success) {
      await AsyncStorage.setItem('accessToken', data.data.tokens.accessToken);
      await AsyncStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      setUser(data.data.user);
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const logout = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    setUser(null);
  };

  useEffect(() => {
    async function loadSession() {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        // Attempt refresh
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const pushToken = await getPushToken();
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken, pushToken }),
        });
        const data = await res.json();
        if (data.success) {
          await AsyncStorage.setItem('accessToken', data.data.tokens.accessToken);
          await AsyncStorage.setItem('refreshToken', data.data.tokens.refreshToken);
          // fetch user
          const meRes = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${data.data.tokens.accessToken}` },
          });
          const meData = await meRes.json();
          if (meData.success) setUser(meData.data.user);
        } else {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    }
    loadSession();

    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      if (user) {
        // We trigger a refresh call implicitly to update the token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken, pushToken: newToken }),
          }).catch(() => {});
        }
      }
    });
    return unsubscribe;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

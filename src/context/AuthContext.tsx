import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import { setApiToken } from '../services/api';

export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  location?: string;
  bloodType?: string;
  phone?: string;
  bio?: string;
  donations?: number;
  profileImage?: string;
};

type AuthCtx = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (userData: AuthUser, token: string) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
  logout: () => Promise<void>;
  isLoaded: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const isAuthenticated = !!user;

  useEffect(() => {
    (async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          // Pre-load token into memory
          const token = await AsyncStorage.getItem('token');
          setApiToken(token);
          // ENTER APP IMMEDIATELY
          setIsLoaded(true);
          
          // Background sync
          try {
            const res = await axios.get(`${API_URL}/api/profile`, {
              headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });
            if (res.data) {
              setUser(res.data);
              await AsyncStorage.setItem('user', JSON.stringify(res.data));
            }
          } catch (syncErr) {
            console.warn("Backend sync failed, using cached user data.");
          }
        } else {
          setIsLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load user', e);
        setIsLoaded(true);
      }
    })();
  }, []);

  const login = useCallback(async (userData: AuthUser, token: string) => {
    // UPDATE UI IMMEDIATELY
    setApiToken(token);
    setUser(userData);
    
    // Save in background
    AsyncStorage.setItem('user', JSON.stringify(userData)).catch(e => console.error(e));
    AsyncStorage.setItem('token', token).catch(e => console.error(e));
  }, []);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) return;
    const newUser = { ...user, ...updates };
    setUser(newUser);
    try {
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
    } catch (e) {
      console.error("Failed to update user in storage", e);
    }
  }, [user]);

  const logout = useCallback(async () => {
    setApiToken(null);
    setUser(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    updateUser,
    logout,
    isLoaded
  }), [isAuthenticated, user, login, updateUser, logout, isLoaded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

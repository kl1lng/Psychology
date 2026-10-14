'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import { User, UserRole } from '@/types/user';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  guestLogin: () => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        } catch {}
      }

      const token = Cookies.get('access_token');
      if (token) {
        const res = await authApi.me();
        const userData = res.data as User;
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        return userData;
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { access_token, user: userData } = res.data;
      Cookies.set('access_token', access_token, { expires: 1 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
      }
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const guestLogin = async (): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await authApi.guestLogin();
      const { access_token, guest_id } = res.data;
      Cookies.set('access_token', access_token, { expires: 30 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('guest_id', guest_id);
      }
      const guestUser: User = {
        id: guest_id,
        email: '',
        full_name: 'Анонимный ученик',
        role: 'guest',
        points_balance: 0,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(guestUser));
      }
      setUser(guestUser);
      return guest_id;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove('access_token');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('guest_id');
      window.location.href = '/login';
    }
    setUser(null);
  };

  const role: UserRole | null = (user?.role as UserRole) || null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        guestLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

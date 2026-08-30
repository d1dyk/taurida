import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authFetch, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api-client';

interface AuthContextType {
  isAdmin: boolean;
  adminLogin: string | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  handleLogoClick: () => void;
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminLogin, setAdminLogin] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Easter egg: 5 clicks on logo within 3000ms
  const clickTimestamps = useRef<number[]>([]);

  const handleLogoClick = () => {
    const now = Date.now();
    // Filter timestamps within the last 3000ms
    clickTimestamps.current = clickTimestamps.current.filter(ts => now - ts < 3000);
    clickTimestamps.current.push(now);

    if (clickTimestamps.current.length >= 5) {
      clickTimestamps.current = [];
      setIsAuthModalOpen(true);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.role === 'admin') {
          setIsAdmin(true);
          setAdminLogin(data.login);
          setToken(getStoredToken());
        } else {
          setIsAdmin(false);
          setAdminLogin(null);
          setToken(null);
          removeStoredToken();
        }
      } else {
        setIsAdmin(false);
        setAdminLogin(null);
        setToken(null);
        removeStoredToken();
      }
    } catch (e) {
      console.error('Failed to verify auth:', e);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (login: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, password })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.token) {
          setStoredToken(data.token);
          setToken(data.token);
        }
        setIsAdmin(true);
        setAdminLogin(data.login);
        setIsAuthModalOpen(false);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Неверный логин или пароль' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка подключения к серверу' };
    }
  };

  const logout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      removeStoredToken();
      setToken(null);
      setIsAdmin(false);
      setAdminLogin(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        adminLogin,
        token,
        isLoading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        handleLogoClick,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

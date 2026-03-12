import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ApiError, getCurrentUser, login, logout, register } from '../lib/api';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user ?? null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }
      throw error;
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser()
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function signIn(email: string, password: string) {
    await login(email, password);
    await refreshUser();
  }

  async function signUp(username: string, email: string, password: string) {
    await register(username, email, password);
    await refreshUser();
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

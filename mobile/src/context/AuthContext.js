import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login, logout, register } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function signIn(email, password) {
    await login(email, password);
    const data = await getCurrentUser();
    setUser(data.user);
  }

  async function signUp(username, email, password) {
    await register(username, email, password);
    const data = await getCurrentUser();
    setUser(data.user);
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

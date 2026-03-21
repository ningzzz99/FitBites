import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login, logout, register } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

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
    setIsNewUser(true);
    setUser(data.user);
  }

  function finishOnboarding() {
    setIsNewUser(false);
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  async function refreshUser() {
    const data = await getCurrentUser();
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isNewUser, signIn, signUp, signOut, refreshUser, finishOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

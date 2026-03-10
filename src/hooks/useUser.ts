'use client';

import { useEffect, useState } from 'react';

export interface AppUser {
  id: number;
  username: string;
  email: string;
  height: number | null;
  weight: number | null;
  dietary_req: string | null;
  total_coins: number;
  shown_in_leaderboard: boolean;
  banner_color: string;
  banner_icon: string;
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(({ user }) => { setUser(user ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { user, loading };
}

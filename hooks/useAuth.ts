// hooks/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  username?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/api/users/me');
        if (res && typeof res === 'object' && 'id' in res) {
          setUser(res as User);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {}, { skipRefresh: true });
      window.location.href = '/login';
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      window.location.href = '/login';
    }
  };

  return { user, loading, logout };
}
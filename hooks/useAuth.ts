// hooks/useAuth.ts
'use client';

import { api } from '@/lib/api-client';

export function useAuth() {
  const cleanupClientStorage = () => {
    if (typeof window === 'undefined') return;
    const authKeys = Object.keys(localStorage).filter(key =>
      key.includes('auth') || key.includes('token') || key.includes('session')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  };

  const logout = async () => {
    try {
      cleanupClientStorage();
      const response = await api.post('/api/auth/logout', {});
      if (response.ok) {
        window.location.href = '/login';
      } else {
        alert('Ошибка при выходе из системы');
      }
    } catch (error) {
      console.error('❌ Ошибка при выходе:', error);
      window.location.href = '/login';
    }
  };

  return { logout };
}
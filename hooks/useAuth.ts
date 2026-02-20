// hooks/useAuth.ts
'use client';

import { api } from '@/lib/api-client';

export function useAuth() {
  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {}, { skipRefresh: true });
      // После успешного выхода перенаправляем на логин
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ Ошибка при выходе:', error);
      // Даже если ошибка, пытаемся перенаправить
      window.location.href = '/login';
    }
  };

  return { logout };
}
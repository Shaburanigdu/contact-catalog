// hooks/useTokenRefresh.ts
import { useEffect } from 'react'

export function useTokenRefresh() {
  useEffect(() => {
    const refreshToken = async () => {
      try {
        console.log('🔄 Автоматическое обновление токена...')
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        
        if (response.ok) {
          console.log('✅ Токен автоматически обновлен')
        } else {
          console.log('❌ Автоматическое обновление не удалось')
        }
      } catch (error) {
        console.error('Ошибка автоматического обновления токена:', error)
      }
    }
    
    // Обновляем токен каждые 14 минут (на минуту раньше истечения access токена)
    const refreshInterval = 14 * 60 * 1000 // 14 минут в миллисекундах
    
    const intervalId = setInterval(refreshToken, refreshInterval)
    
    // Обновляем при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshToken()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
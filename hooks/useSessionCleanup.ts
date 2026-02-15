// hooks/useSessionCleanup.ts
import { useEffect } from 'react'
import { api } from '@/lib/api-client'

interface CleanupStats {
  totalSessions: number
  activeSessions: number
  expiredSessions: number
  cleanupRecommended: boolean
}

export function useSessionCleanup() {
  useEffect(() => {
    // Проверяем и предлагаем очистку раз в неделю
    const lastCleanupCheck = localStorage.getItem('last_cleanup_check')
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    if (!lastCleanupCheck || parseInt(lastCleanupCheck) < oneWeekAgo) {
      checkAndCleanup()
    }
    
    // Также проверяем при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        const lastCheck = localStorage.getItem('last_cleanup_check')
        const oneDayAgo = now - 24 * 60 * 60 * 1000
        
        if (!lastCheck || parseInt(lastCheck) < oneDayAgo) {
          checkAndCleanup()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  const checkAndCleanup = async () => {
    try {
      // Сохраняем время проверки
      localStorage.setItem('last_cleanup_check', Date.now().toString())
      
      // Проверяем старые сессии в localStorage
      cleanupLocalStorage()
      
      // Можно также отправить запрос на сервер для проверки
      // await api.post('/api/auth/check-sessions')
      
    } catch (error) {
      console.error('Ошибка при проверке сессий:', error)
    }
  }
  
  const cleanupLocalStorage = () => {
    if (typeof window === 'undefined') return
    
    const keysToClean = [
      'auth_token',
      'user_data',
      'temp_session_data',
      'old_refresh_token'
    ]
    
    keysToClean.forEach(key => {
      if (localStorage.getItem(key)) {
        // Проверяем время создания
        const createdTime = localStorage.getItem(`${key}_created`)
        if (createdTime) {
          const created = parseInt(createdTime)
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          
          if (created < oneWeekAgo) {
            localStorage.removeItem(key)
            localStorage.removeItem(`${key}_created`)
            console.log(`🧹 Удален старый ключ из localStorage: ${key}`)
          }
        }
      }
    })
  }
  
  return {
    checkAndCleanup,
    cleanupLocalStorage
  }
}
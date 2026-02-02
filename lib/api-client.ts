// lib/api-client.ts - ЗАМЕНИТЕ СОДЕРЖИМОЕ
const API_BASE_URL = ''

class ApiClient {
  private isRefreshing = false
  private failedQueue: Array<{resolve: (value?: any) => void; reject: (reason?: any) => void}> = []

  private async refreshToken(): Promise<boolean> {
    try {
      console.log('🔄 API Client: Пытаемся обновить токен...')
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        console.log('✅ API Client: Токен успешно обновлен')
        return true
      } else {
        console.error('❌ API Client: Не удалось обновить токен')
        return false
      }
    } catch (error) {
      console.error('❌ API Client: Ошибка при обновлении токена:', error)
      return false
    }
  }

  async request(url: string, options: RequestInit = {}) {
    // Добавляем credentials для отправки cookies
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    // Первый запрос
    let response = await fetch(url, requestOptions)
    
    // Если получили 401, пробуем обновить токен
    if (response.status === 401 && !url.includes('/auth/refresh')) {
      console.log('🔄 API Client: Получен 401, пытаемся обновить токен...')
      
      const refreshSuccess = await this.refreshToken()
      
      if (refreshSuccess) {
        // Повторяем оригинальный запрос
        response = await fetch(url, requestOptions)
      } else {
        // Если обновление не удалось, редиректим на логин
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('Authentication failed')
      }
    }
    
    return response
  }

  async get(url: string, options?: RequestInit) {
    return this.request(url, { ...options, method: 'GET' })
  }

  async post(url: string, data?: any, options?: RequestInit) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put(url: string, data?: any, options?: RequestInit) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete(url: string, options?: RequestInit) {
    return this.request(url, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient()

// Для обратной совместимости
export default {
  get: (url: string, options?: RequestInit) => api.get(url, options),
  post: (url: string, data?: any, options?: RequestInit) => api.post(url, data, options),
  put: (url: string, data?: any, options?: RequestInit) => api.put(url, data, options),
  delete: (url: string, options?: RequestInit) => api.delete(url, options),
}
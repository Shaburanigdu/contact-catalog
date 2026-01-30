import axios from 'axios'

// Создаем инстанс axios
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true
})

// Перехватчик для обновления токенов
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Если ошибка 401 (Unauthorized) и это не запрос на обновление токенов
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Пытаемся обновить токены
        await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        
        // Повторяем оригинальный запрос с новым токеном
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Если обновление не удалось, редиректим на логин
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
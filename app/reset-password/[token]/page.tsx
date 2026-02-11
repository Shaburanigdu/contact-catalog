'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [isLoading, setIsLoading] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })

  // Используем useRef для отслеживания, был ли уже показан alert
  const hasShownAlert = useRef(false)

  // Проверяем валидность токена при загрузке
  useEffect(() => {
    // Если alert уже показывался, выходим
    if (hasShownAlert.current) return
    
    const checkToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`, {
          method: 'GET'
        })

        if (response.ok) {
          setIsValidToken(true)
          
          // Показываем alert только если он еще не показывался
          if (!hasShownAlert.current) {
            hasShownAlert.current = true
            alert('В реальном приложении пользователь получил бы эту ссылку по email.\n\nТокен проверен. Теперь вы можете установить новый пароль.')
          }
        } else {
          setIsValidToken(false)
          const data = await response.json()
          setError(data.error || 'Неверная или просроченная ссылка')
        }
      } catch (error) {
        console.error('Ошибка проверки токена:', error)
        setError('Ошибка проверки токена')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      checkToken()
    } else {
      setError('Токен не найден')
      setIsLoading(false)
    }
  }, [token]) // Зависимость только от token

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сброса пароля')
      }

      setIsSuccess(true)
      setMessage(data.message || 'Пароль успешно изменен')

      // Через 3 секунды перенаправляем на страницу входа
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-4 text-gray-600">Проверка ссылки...</p>
        </div>
      </div>
    )
  }

  if (!isValidToken && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <div className="h-6 w-6 text-red-600">⚠️</div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Ссылка недействительна</h1>
              <p className="text-gray-600 mt-2">
                {error || 'Ссылка для сброса пароля недействительна или просрочена.'}
              </p>
            </div>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Запросить новую ссылку
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {isSuccess ? (
            <div className="text-center space-y-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Пароль изменен!</h1>
              <p className="text-gray-600">{message}</p>
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
                <p>Вы будете перенаправлены на страницу входа через 3 секунды...</p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                Перейти ко входу сейчас
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <div className="h-6 w-6 text-indigo-600">🔐</div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Новый пароль</h1>
                <p className="text-gray-600 mt-2">
                  Введите новый пароль для вашего аккаунта
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Новый пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Минимум 6 символов"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подтвердите пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Повторите новый пароль"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full py-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Обновление...
                    </>
                  ) : (
                    'Установить новый пароль'
                  )}
                </Button>
              </form>
            </>
          )}

          {!isSuccess && (
            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться ко входу
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
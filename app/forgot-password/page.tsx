'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Loader2, ArrowLeft, Clock } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(4)

  // Обработчик таймера для редиректа
  // Обработчик таймера для редиректа
  useEffect(() => {
    if (isSuccess && resetToken) {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isSuccess, resetToken]);

  // Отдельный эффект для редиректа при countdown === 0
  useEffect(() => {
    if (isSuccess && resetToken && countdown === 0) {
      router.push(`/reset-password/${resetToken}`);
    }
  }, [isSuccess, resetToken, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки запроса')
      }

      setIsSuccess(true)
      setMessage(data.message || 'Инструкции по сбросу пароля отправлены на вашу почту')
      
      // Сохраняем токен для редиректа
      if (data.resetToken) {
        setResetToken(data.resetToken)
        
        // Для демонстрации - показываем токен в alert
        alert(`Демо-режим: Токен для сброса пароля: ${data.resetToken}\n\nВ реальном приложении эта ссылка была бы отправлена на email.\n\nЧерез 4 секунды вы будете перенаправлены на страницу сброса пароля.`)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  // Функция для ручного перехода (если пользователь не хочет ждать)
  const handleManualRedirect = () => {
    if (resetToken) {
      router.push(`/reset-password/${resetToken}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <div className="h-6 w-6 text-indigo-600">🔐</div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Восстановление пароля</h1>
            <p className="text-gray-600 mt-2">
              Введите email вашего аккаунта для получения инструкций
            </p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить инструкции'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{message}</p>
                    <p className="mt-1">
                      Автоматический переход через {countdown} секунд...
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    В демо-режиме вы можете:
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs text-blue-600">1</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Подождать {countdown} секунд</span> - вас автоматически перенаправит
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs text-blue-600">2</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Или нажать кнопку ниже</span> для немедленного перехода
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Показать токен только в демо-режиме */}
                {resetToken && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Демо-информация (токен):
                    </h4>
                    <div className="bg-white p-3 rounded border border-blue-100 overflow-x-auto">
                      <code className="text-xs font-mono text-blue-800">
                        {resetToken}
                      </code>
                    </div>
                  </div>
                )}
                
                <p className="text-gray-500 text-xs">
                  В реальном приложении на эту почту пришло бы письмо со ссылкой для сброса пароля.
                </p>
              </div>
              
              {/* Кнопка для ручного перехода */}
              <Button
                onClick={handleManualRedirect}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700"
              >
                Перейти к сбросу пароля сейчас
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
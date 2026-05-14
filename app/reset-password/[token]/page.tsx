'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const checkToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        if (response.ok) {
          setIsValidToken(true);
        } else {
          const data = await response.json();
          setError(data.error || 'Неверная или просроченная ссылка');
        }
      } catch (error) {
        console.error('Ошибка проверки токена:', error);
        setError('Ошибка проверки токена');
      } finally {
        setIsLoading(false);
      }
    };
    if (token) checkToken();
    else setError('Токен не найден');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Сброс пароля
      const resetResponse = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });
      const resetData = await resetResponse.json();

      if (!resetResponse.ok) {
        throw new Error(resetData.error || 'Ошибка сброса пароля');
      }

      setIsSuccess(true);
      setMessage(resetData.message || 'Пароль успешно изменен');

      // Проверяем, есть ли email в ответе
      if (!resetData.email) {
        console.error('API не вернул email:', resetData);
        setError('Не удалось получить email для автоматического входа. Перенаправление на страницу входа...');
        setTimeout(() => router.push('/login'), 3000);
        setIsAutoLogging(false);
        return;
      }

      setIsAutoLogging(true);

      // 2. Автоматический вход
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetData.email,
          password: formData.password,
        }),
      });
      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        // Успешный вход – на дашборд
        router.push('/dashboard');
      } else {
        console.error('Ошибка автовхода:', loginData);
        setError(`Автоматический вход не удался: ${loginData.error || 'неизвестная ошибка'}. Перенаправление на страницу входа...`);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="ml-2 text-gray-600">Проверка ссылки...</p>
      </div>
    );
  }

  if (!isValidToken && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Ссылка недействительна</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <Link href="/forgot-password" className="inline-block mt-4 text-indigo-600">
            Запросить новую ссылку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {isSuccess ? (
            <div className="text-center space-y-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">Пароль изменен!</h1>
              <p className="text-gray-600">{message}</p>
              {isAutoLogging ? (
                <div className="flex items-center justify-center space-x-2 text-indigo-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Входим в систему...</span>
                </div>
              ) : (
                <Link href="/login" className="inline-flex items-center text-indigo-600">
                  Перейти ко входу
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Новый пароль</h1>
                <p className="text-gray-600">Введите новый пароль для вашего аккаунта</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Новый пароль</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Подтвердите пароль</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  Установить новый пароль
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
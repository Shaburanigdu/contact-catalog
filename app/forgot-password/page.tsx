'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки запроса');
      }

      setIsSuccess(true);
      setMessage(data.message || 'Инструкции по сбросу пароля отправлены на вашу почту');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

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
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
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

              <Button type="submit" className="w-full py-3" disabled={isLoading}>
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
                <p className="font-medium">{message}</p>
                <p className="mt-1 text-sm">
                  Проверьте почту (в том числе папку «Спам») и перейдите по ссылке из письма.
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Вернуться ко входу
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Contact Catalog - Ваш персональный CRM',
  description: 'Управляйте контактами, событиями и напоминаниями',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}

// app/layout.tsx или app/providers.tsx
import { initializeSessionCleanup } from '@/lib/init-cleanup'

// Только на сервере
if (typeof window === 'undefined') {
  // Запускаем при старте сервера (можно с задержкой)
  setTimeout(async () => {
    await initializeSessionCleanup()
  }, 5000) // Через 5 секунд после старта
}
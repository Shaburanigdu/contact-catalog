/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '26.37.252.171',
        port: '3000',
        pathname: '/uploads/**',
      },
      // Для любого хоста (на всякий случай)
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
  // Убираем webpack конфиг полностью - он больше не нужен в Next.js 16+
  // Убираем serverActions из конфига - это стандартная функция
  // turbopack оставляем по умолчанию (не указываем)
}

module.exports = nextConfig
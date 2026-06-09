import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Кастомная метрика для отслеживания ошибок
const errorRate = new Rate('error_rate');

// Конфигурация теста
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '1m', target: 50 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],    // Доля ошибок не более 5%
    http_req_duration: ['p(95)<500'],  // 95% запросов быстрее 500 мс
    error_rate: ['rate<0.05'],
  },
};

// Основная функция, запускаемая для каждого виртуального пользователя
export default function () {
  // 1. Логин (один раз на виртуального пользователя, но т.к. k6 может создавать новых,
  //    будем логиниться в каждой итерации – для простоты. Можно использовать sharedState,
  //    но для нагрузочного теста это допустимо)
  const loginPayload = JSON.stringify({
    email: 'test@example.com',      // замените на реального тестового пользователя
    password: '111111',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post('http://localhost:3000/api/auth/login', loginPayload, loginParams);
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  // Получаем cookies (k6 автоматически сохранит их в jar)
  // Если API возвращает токен в теле, можно извлечь, но обычно JWT в httpOnly cookie

  // Небольшая пауза после логина
  sleep(1);

  // 2. Тестируем GET /api/contacts (список)
  const contactsRes = http.get('http://localhost:3000/api/contacts?page=1&limit=20');
  check(contactsRes, {
    'contacts status 200': (r) => r.status === 200,
    'contacts response has data': (r) => r.json('data') !== undefined,
  }) || errorRate.add(1);

  // Измеряем длительность (автоматически попадает в метрику http_req_duration)

  sleep(0.5);

  // 3. Тестируем GET /api/contacts?search=... (полнотекстовый поиск)
  const searchRes = http.get('http://localhost:3000/api/contacts?search=test&page=1&limit=20');
  check(searchRes, {
    'search returns array': (r) => {
      const body = r.json();
      // Ожидаем либо { data: { contacts: [] } }, либо напрямую массив в data
      return Array.isArray(body?.data?.contacts) || Array.isArray(body?.data);
    },
  }) || errorRate.add(1);

  // Имитация реального поведения: пауза между действиями
  sleep(1);
}
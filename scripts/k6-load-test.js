// Load test: login, contact list and full-text search per iteration.
//   k6 run -e BASE_URL=http://localhost:3000 -e TEST_EMAIL=... -e TEST_PASSWORD=... scripts/k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Share of failed checks (each check records true/false, so this is a real rate)
const errorRate = new Rate('error_rate');

// Same profile as the thesis run: up to 200 virtual users over 5 minutes
export const options = {
  // keep auth cookies between iterations (needed for LOGIN_ONCE)
  noCookiesReset: true,
  stages: [
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
    error_rate: ['rate<0.05'],
    // Per-endpoint view: login is deliberately slow (bcrypt), browsing must stay fast
    'http_req_duration{name:login}': ['p(95)<2000'],
    'http_req_duration{name:contacts}': ['p(95)<500'],
    'http_req_duration{name:search}': ['p(95)<500'],
  },
};

function record(res, checks) {
  const ok = check(res, checks);
  errorRate.add(!ok);
}

// LOGIN_ONCE=true: each virtual user signs in once and then keeps browsing
// (realistic, the access token lives 15 minutes). Default: sign in on every
// iteration, as in the thesis run — a login storm that stresses bcrypt.
const LOGIN_ONCE = __ENV.LOGIN_ONCE === 'true';

export default function () {
  if (LOGIN_ONCE && __ITER > 0) {
    browse();
    return;
  }
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_EMAIL || 'test@example.com',
      password: __ENV.TEST_PASSWORD || 'password123',
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  record(loginRes, { 'login status is 200': (r) => r.status === 200 });
  sleep(1);
  browse();
}

function browse() {
  const contactsRes = http.get(`${BASE_URL}/api/contacts?page=1&limit=20`, { tags: { name: 'contacts' } });
  record(contactsRes, {
    'contacts status 200': (r) => r.status === 200,
    'contacts response has data': (r) => r.json('data') !== undefined,
  });
  sleep(0.5);

  const searchRes = http.get(`${BASE_URL}/api/contacts?search=test&page=1&limit=20`, { tags: { name: 'search' } });
  record(searchRes, {
    'search returns array': (r) => r.status === 200 && Array.isArray(r.json('data.contacts')),
  });
  sleep(1);
}

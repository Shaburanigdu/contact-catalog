# Load testing with k6

Script: [`scripts/k6-load-test.js`](../../scripts/k6-load-test.js). Profile: ramp
up to 200 virtual users and back over 5 minutes. Each iteration requests the
contact list and a full-text contact search; by default it also signs in on
every iteration, like the original thesis run.

```bash
k6 run -e BASE_URL=http://localhost:3000 -e TEST_EMAIL=... -e TEST_PASSWORD=... scripts/k6-load-test.js
k6 run -e LOGIN_ONCE=true ... scripts/k6-load-test.js   # sign in once per user
```

All runs below were made on the same machine (Windows, Docker Desktop with
12 CPUs / 3 GB RAM), against the Docker Compose stack with 100 contacts.
The thesis run ([`k6.txt`](k6.txt)) was made earlier against the development
server, because the production build did not compile at the time.

## Results

| Run | req/s | median | p95 | errors |
| --- | ---: | ---: | ---: | ---: |
| Thesis (dev server, `bcryptjs`) | 26 | 1.79 s | 6.19 s | 0% * |
| Production build, `bcryptjs` | 28 | 2.12 s | 8.81 s | 0.21% |
| Production build, native `bcrypt` | 88 | 144 ms | 1.88 s | 0% |
| + `UV_THREADPOOL_SIZE=8` | **112** | **79 ms** | **536 ms** | 0% |
| Same, sign in once per user (`LOGIN_ONCE=true`) | **134** | **18 ms** | **300 ms** | 0% |

\* The thesis script reported `error_rate = 100%` because it only ever recorded
failures into the rate metric; the HTTP error rate was 0%.

Per endpoint in the last two runs (p95):

| Endpoint | login every iteration | sign in once |
| --- | ---: | ---: |
| `POST /api/auth/login` | 752 ms | 213 ms |
| `GET /api/contacts` | 252 ms | 246 ms |
| `GET /api/contacts?search=` | 349 ms | 340 ms |

## What was slow

Idle, the contact list answers in ~10 ms and search in ~15 ms, but a login takes
~100 ms of bcrypt work. The project used `bcryptjs`, a pure-JavaScript
implementation that runs on the main thread, so every login blocked the whole
Node.js process. With ~10 logins per second the event loop was busy hashing
passwords almost all the time and every other request waited in the queue.

Switching to the native `bcrypt` package moves hashing to libuv worker threads
(hashes stay compatible, existing passwords keep working). Raising
`UV_THREADPOOL_SIZE` from the default 4 to 8 lets more logins hash in parallel.

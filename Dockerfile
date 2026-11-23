# syntax=docker/dockerfile:1

# ---- dependencies ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build (also used by the one-off `migrate` service) ----
FROM deps AS builder
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# UV_THREADPOOL_SIZE: bcrypt hashes on libuv worker threads (default 4)
ENV NODE_ENV=production \
    UV_THREADPOOL_SIZE=8 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads

RUN groupadd --system app && useradd --system --gid app app \
 && mkdir -p /data/uploads && chown -R app:app /data

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 3000
VOLUME ["/data/uploads"]
CMD ["node", "server.js"]

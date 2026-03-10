# ── Stage 1: Build web ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /workspace/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build:web

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /workspace/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY server/ ./server/
COPY --from=builder /workspace/app/dist ./dist

# SQLite DB lives here — mount a named volume to persist across restarts
RUN mkdir -p /data
ENV FOXOPS_DB_DIR=/data

ENV NODE_ENV=production
ENV PORT=8787

# Required — point at the openclaw Gateway (e.g. wss://<tailscale-host>:18789)
ENV OPENCLAW_GATEWAY_URL=ws://localhost:18789
ENV OPENCLAW_GATEWAY_TOKEN=

EXPOSE 8787
CMD ["node_modules/.bin/tsx", "server/index.ts"]

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
RUN yarn install --frozen-lockfile
COPY server/ ./server/
COPY --from=builder /workspace/app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8787
CMD ["node_modules/.bin/tsx", "server/index.ts"]

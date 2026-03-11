# FoxOps

An operational dashboard for monitoring [openclaw](https://openclaw.ai) AI agent sessions, cron jobs, and [FoxMemory](https://github.com/Foxlight-Foundation/foxmemory-store) health — built by [Foxlight Imagineering](https://github.com/Foxlight-Foundation).

---

## What is this?

If you're running an autonomous AI agent (like Kite) on top of openclaw, you have a bunch of things running in the background at all times: agent sessions talking to LLMs, scheduled cron jobs firing on timers, a memory system ingesting and organizing information. There's no built-in web UI for any of that.

FoxOps Dashboard gives you one. It's a read-mostly operational panel — like a cockpit — that lets you see what's running, what's healthy, and what's broken, at a glance.

---

## What it shows

### Agent Sessions
Live view of every active openclaw session across all agents. Shows model, token usage, context window fill, age, and whether the last run aborted cleanly. You can delete or send a kill request to any non-main session directly from the UI.

### Cron Jobs
All scheduled cron jobs with their status, schedule, last run time, duration, next run, and consecutive error count. Expand any job to see its full configuration and a run history table (last 10 runs with per-run token usage, duration, status, and error detail). Enabled jobs have a **Run now** button — useful for re-firing a job stuck in an error state without waiting for its next scheduled run.

### FoxMemory
Live stats from the FoxMemory memory store: total memory count, write activity by day (30-day chart), memory event breakdown (adds/updates/deletes), search quality stats, recent write activity feed, and Neo4j graph health. Includes a graph explorer — force-directed visualization of the memory knowledge graph — and a prompt editor for tuning extraction, update, and graph prompts live.

### Model Config
View and edit the LLM and embedding model configuration for FoxMemory. Manage the model catalog (add, edit, remove models by role). Model changes require MFA verification.

---

## How it works

The dashboard is a two-tier app:

```
[Browser]
    │
    ▼
[Express API server]  ──── WebSocket ────▶  [openclaw Gateway]
                      ──── HTTP ──────────▶  [FoxMemory API]
                      ──── HTTP ──────────▶  [Qdrant]
```

- **Frontend** — React 18 + MUI 6, built to static assets, served by Express in production
- **Backend** — Express 4 on Node.js, communicates with openclaw via its Gateway WebSocket RPC API (no CLI required), and with FoxMemory over HTTP
- **Auth** — Google OAuth 2.0 (primary) + local email/password + TOTP MFA
- **Data persistence** — SQLite (user accounts, kill audit log)

Because the backend talks to openclaw over a WebSocket rather than a local CLI, **the dashboard can run anywhere** — a VPS, a home server, a cloud container platform — as long as it can reach the openclaw Gateway over the network. Tailscale is the recommended way to connect them securely.

---

## Prerequisites

Before you set up the dashboard, you need the following already running:

1. **openclaw** — running on some machine with its Gateway service active
   - You'll need the Gateway's shared token: `openclaw config get gateway.auth.token`
   - For remote deployment, the Gateway needs to accept connections over Tailscale (see below)

2. **FoxMemory** — the memory API server reachable at a stable URL
   - Required for the FoxMemory tab; the rest of the dashboard works without it

3. **Tailscale** — recommended for connecting the dashboard container to openclaw securely when running on separate machines

4. **Docker** — for containerized deployment (recommended). Or Node.js 20+ and yarn for local/bare-metal.

---

## Tailscale setup

> Skip this section if you're running the dashboard on the **same machine** as openclaw.

The openclaw Gateway runs as a WebSocket server. By default it only listens on loopback (`127.0.0.1`). To reach it from another machine over Tailscale, run the following **on the openclaw machine**:

```bash
# Tell the gateway to bind to the Tailscale interface
openclaw config set gateway.bind tailnet

# Expose it via Tailscale Serve (encrypted, restricted to tailnet members)
openclaw config set gateway.tailscale.mode serve

# Restart the gateway to apply
openclaw gateway restart
```

After this, the Gateway is reachable at `wss://<your-tailscale-hostname>:18789` from any machine on your tailnet. The gateway also requires its own shared token (`OPENCLAW_GATEWAY_TOKEN`) as a second auth layer on top of Tailscale membership.

To find your Tailscale hostname:
```bash
tailscale status | head -3
```

---

## Quick start — local development

Run the dashboard locally on the same machine as openclaw. No Tailscale needed.

```bash
# Clone the repo
git clone https://github.com/Foxlight-Foundation/acp-session-dashboard.git
cd acp-session-dashboard

# Install dependencies
yarn install

# Set up environment
cp .env.example .env
# Edit .env — see Environment Variables section below
# At minimum: FOXMEMORY_BASE_URL, FOXMEMORY_USER_ID, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
# OPENCLAW_GATEWAY_TOKEN is auto-read from ~/.openclaw/openclaw.json in local dev if not set

# Start both servers
yarn start
```

Open **http://localhost:5177** and log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Docker deployment (recommended for production)

### Pull the pre-built image

Every push to `main` builds and publishes an image to GitHub Container Registry:

```bash
docker pull ghcr.io/foxlight-foundation/acp-session-dashboard:main
```

### Set up your environment file

```bash
cp .env.example .env
# Edit with your values — see Environment Variables section
```

### Run with Docker Compose (recommended)

```bash
docker compose up -d
```

This automatically creates a named Docker volume at `/data` inside the container for SQLite persistence (user accounts, kill log). The volume survives container restarts and image upgrades.

Open the app at **http://your-host:8787**.

### Run with plain Docker

```bash
docker run -d \
  --name foxops \
  --env-file .env \
  -p 8787:8787 \
  -v foxops-data:/data \
  ghcr.io/foxlight-foundation/acp-session-dashboard:main
```

### Build locally instead

```bash
git clone https://github.com/Foxlight-Foundation/acp-session-dashboard.git
cd acp-session-dashboard
docker build -t foxops-dashboard .
docker run -d --name foxops --env-file .env -p 8787:8787 -v foxops-data:/data foxops-dashboard
```

---

## Authentication

### Initial admin account

On first start, the server creates one admin user using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env`. These env vars are **only used once** — if any users already exist in the database, they're ignored on subsequent starts.

Log in at `/` with those credentials.

### Google OAuth (recommended for ongoing access)

Google OAuth is the recommended login path. To set it up:

1. Go to [Google Cloud Console → APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add authorized redirect URIs:
   - Local dev: `http://localhost:5177/auth/google/callback`
   - Production: `https://your-domain.com/auth/google/callback`
5. Copy the Client ID and Client Secret into your `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ALLOWED_EMAILS=you@gmail.com,colleague@gmail.com
   APP_BASE_URL=https://your-domain.com
   ```
6. Set `ALLOWED_EMAILS` to a comma-separated list of Google account emails that are allowed to sign in. Leave it blank to allow any Google account (not recommended in production).

### MFA enrollment

After first login, you'll be prompted to enroll in TOTP (time-based one-time password) authentication. This protects sensitive operations like model config changes.

1. Log in with Google or email/password
2. Click **Set up authenticator** when prompted
3. Scan the QR code with any TOTP app — Google Authenticator, Authy, 1Password, etc.
4. Enter the 6-digit code to confirm enrollment
5. On subsequent logins, enter your 6-digit code when prompted

**MFA is required** for model configuration changes (PUT/DELETE on model settings). If you see "MFA verification required", log out and back in, completing MFA at login.

---

## Environment variables

Copy `.env.example` to `.env`. All values are read by the server at startup.

### Required

| Variable | Description |
|---|---|
| `SESSION_SECRET` | Long random string for signing session cookies. Generate with: `openssl rand -hex 32` |
| `ADMIN_EMAIL` | Email for the first admin user, seeded on first start |
| `ADMIN_PASSWORD` | Password for the first admin user, seeded on first start |
| `FOXMEMORY_BASE_URL` | URL of your FoxMemory API, e.g. `http://192.168.x.x:8082` |
| `FOXMEMORY_USER_ID` | User ID for FoxMemory queries (typically your email address) |
| `OPENCLAW_GATEWAY_URL` | WebSocket URL of the openclaw Gateway. Same machine: `ws://localhost:18789`. Remote via Tailscale: `wss://<tailscale-hostname>:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Shared token from `openclaw config get gateway.auth.token`. In local dev, auto-read from `~/.openclaw/openclaw.json` if omitted |

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8787` | Port the Express server listens on |
| `APP_BASE_URL` | `http://localhost:5177` | Public base URL of the app — used for Google OAuth redirect URI |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (required to enable Google login) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `ALLOWED_EMAILS` | _(all)_ | Comma-separated Google emails allowed to sign in |
| `QDRANT_BASE_URL` | Host from `FOXMEMORY_BASE_URL` on port `6333` | Override the Qdrant URL used for memory count |
| `FOXOPS_DB_DIR` | `~/.foxops` | Where to store `foxops.db`. In Docker this is `/data` (the named volume) |
| `NODE_ENV` | — | Set to `production` to enable static file serving from `dist/` |

---

## Keeping it up to date

The CI/CD pipeline publishes a new image on every push to `main`. To pull and redeploy:

```bash
docker compose pull
docker compose up -d
```

Version tags (e.g. `v1.2.0`) also publish pinned image tags if you prefer stable releases over rolling `main`.

---

## Project structure

```
.github/
  workflows/
    docker.yml          # Builds and pushes to GHCR on main push or version tag
server/
  index.ts              # Express API — all endpoints and middleware
  gateway.ts            # openclaw Gateway WebSocket client
  db.ts                 # SQLite schema + helpers (users, kill log)
web/
  src/
    App.tsx             # Root layout and data orchestration
    store.ts            # Redux store (RTK Query + persist)
    types.ts            # Shared TypeScript interfaces
    services/
      dashboardApi.ts   # All RTK Query endpoints (polling + mutations)
    components/
      AcpSessionsSection/  # Agent sessions table
      CronJobsSection/     # Cron jobs table + run history
      FoxMemorySection/    # Memory stats, graph explorer, prompt editor
      ModelConfigSection/  # Model config editor
      Sidebar/             # Navigation sidebar + health badges
      shared/              # Shared styled primitives (GlassPaper, etc.)
Dockerfile              # Multi-stage build: web assets + production runtime
docker-compose.yml      # Service + named volume definition
.env.example            # Template for all environment variables
container_migration.md  # Notes on the architecture and containerization decisions
```

---

## Development commands

```bash
yarn start              # API + Vite dev server concurrently (recommended)
yarn dev:api            # Express API only — http://localhost:8787
yarn dev:web            # Vite dev server only — http://localhost:5177
yarn typecheck:web      # TypeScript check (frontend)
yarn typecheck:server   # TypeScript check (backend)
yarn build:web          # Production build → dist/
yarn test               # Vitest unit tests
```

---

## Troubleshooting

### Sessions or cron jobs show an error / won't load

The server can't reach the openclaw Gateway. Check:
- `OPENCLAW_GATEWAY_URL` is correct and the port is reachable
- `OPENCLAW_GATEWAY_TOKEN` matches `openclaw config get gateway.auth.token` on the openclaw machine
- The Gateway is running: `openclaw gateway status`
- If using Tailscale: both machines are connected (`tailscale status`) and the gateway is bound to the tailnet (`openclaw config get gateway.bind` → should be `tailnet`)

### FoxMemory tab shows no data

- Verify `FOXMEMORY_BASE_URL` is reachable from where the server is running
- Test: `curl $FOXMEMORY_BASE_URL/v2/health`
- Full troubleshooting: [docs/FOXMEMORY_HEALTH_TROUBLESHOOTING.md](docs/FOXMEMORY_HEALTH_TROUBLESHOOTING.md)

### Google OAuth redirects to the wrong place or fails

- `APP_BASE_URL` must match the URL you're accessing the app from
- The redirect URI in Google Cloud Console must be exactly `$APP_BASE_URL/auth/google/callback`
- In local dev, make sure you're accessing the app on the Vite port (`:5177`), not the API port

### "MFA verification required" on model changes

Log out and log back in, completing MFA enrollment or verification when prompted. MFA sessions expire with the login cookie (7 days).

### Auth data lost after container restart

Confirm your Docker volume is mounted correctly. With `docker compose`, the `foxops-data` named volume is created automatically. With plain `docker run`, pass `-v foxops-data:/data`. Check with: `docker volume ls | grep foxops`

---

## Built by Foxlight Imagineering

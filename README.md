# FoxOps Dashboard

A local operational dashboard for monitoring ACP (Agent Control Protocol) session status and FoxMemory health. Built for the FoxLight Imagineering internal toolchain.

## What it does

- **ACP Sessions** — live view of the session registry (status, purpose, run IDs, outcomes) with per-row kill buttons
- **Kill workflow** — attempts immediate session termination via the `openclaw` CLI; falls back to queuing the kill request in the kill queue markdown file
- **FoxMemory** — probes a remote FoxMemory API to show memory count by day, ingestion queue depth, retrieval quality (from eval artifacts), auto-capture health, plugin telemetry, and recent error log samples
- **Persistent UI** — theme (dark/light), selected section, and chart range survive page reloads

## UX guardrails

This dashboard is optimized for *operational* decisions (fast, at-a-glance actions), not deep analytics.

- Small set of actionable KPI cards over dense charting
- Status chips with tooltip explanations for every state
- Kill action is low-friction (single click + optional reason prompt)
- Auto-polls every 15 seconds; pauses when window loses focus

## Architecture

### Frontend (`web/`)

| Tech | Purpose |
|---|---|
| React 18 + Vite 5 | UI framework and dev server |
| MUI 6 | Component library |
| `@emotion/styled` via `@mui/material/styles` | Custom styled components |
| Redux Toolkit + RTK Query | State management and data fetching with polling |
| redux-persist | Persists UI preferences to localStorage |
| Recharts | Bar and pie charts |
| TypeScript | Full type safety |

### Backend (`server/`)

| Tech | Purpose |
|---|---|
| Express 4 | HTTP API server |
| Node.js ES modules + tsx | TypeScript execution |
| File I/O | Reads registry markdown, gateway logs, eval artifacts |
| `fetch` | Probes remote FoxMemory API |
| `execFileSync` | Calls `openclaw` CLI for kill actions |

## Project layout

```
web/
  src/
    App.tsx            # Main UI — layout, sections, styled components
    main.tsx           # React entry point
    store.ts           # Redux store + RootState/AppDispatch exports
    uiSlice.ts         # Theme/section/chartRange slice
    types.ts           # Shared TypeScript interfaces
    services/
      dashboardApi.ts  # RTK Query endpoints (registry, foxmemory, kill)
  tsconfig.json
  vite.config.ts
server/
  index.ts             # Express server + all data loading logic
  tsconfig.json
```

## Requirements

- Node.js 18+
- yarn
- `openclaw` CLI on `PATH` (required for the kill feature)
- FoxMemory server reachable at the configured URL

## Setup

```bash
yarn install
yarn start          # runs API server + Vite dev server concurrently
```

Open: **http://localhost:5177**

### Run servers separately

```bash
yarn dev:api        # Express on :8787
yarn dev:web        # Vite on :5177 (proxies /api → :8787)
```

### Type-check

```bash
yarn typecheck:web
yarn typecheck:server
```

### Production build

```bash
yarn build:web      # outputs static bundle to dist/
yarn start:api      # runs Express server in production mode
```

## Configuration

Environment variables for the API server:

| Variable | Default | Purpose |
|---|---|---|
| `FOXMEMORY_BASE_URL` | `http://192.168.0.118:8082` | FoxMemory server address |
| `FOXMEMORY_USER_ID` | `thomastupper92618@gmail.com` | User ID for memory queries |
| `PORT` | `8787` | Express server port |

## Data sources

| Source | Used for |
|---|---|
| `docs/ACP_SESSION_REGISTRY.md` | Session rows (parsed from markdown table) |
| `docs/ACP_KILL_QUEUE.md` | Kill request audit trail (appended by kill endpoint) |
| `~/.openclaw/logs/gateway.log` | Auto-capture health + plugin telemetry |
| `~/.openclaw/logs/gateway.err.log` | Recent FoxMemory error samples |
| `artifacts/root-cause-eval-*.json` | Retrieval quality percentage |
| FoxMemory API (`/health`, `/stats`, `/v1/memories`) | Live memory system data |

> All file paths are resolved relative to the workspace root (two levels above `server/`).

## Workflows

### Register a new ACP run

```bash
scripts/acp-session-registry-add.sh --purpose "..." --status spawned
```

### Update a run

```bash
scripts/acp-session-registry-update.sh --run-id <runId> --status completed --outcome "..."
```

### Kill a session from the dashboard

Click the trash icon on any non-terminal session row. The server:

1. Calls `openclaw sessions --all-agents --json` to resolve the live session ID
2. Sends a stop directive via `openclaw agent --session-id <id> --message "STOP NOW..."`
3. Records the kill request in `docs/ACP_KILL_QUEUE.md`
4. Updates the registry row status to `killed`

If the immediate kill fails (session not found, CLI unavailable), the kill is queued and the registry is still updated.

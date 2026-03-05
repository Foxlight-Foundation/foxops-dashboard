# CLAUDE.md — FoxOps Dashboard

## Tech stack
- **Frontend**: React 18, TypeScript, Vite, MUI 6, `@emotion/styled` (via `@mui/material/styles`), Redux Toolkit + RTK Query, redux-persist, Recharts
- **Backend**: Express 4, TypeScript, Node.js ES modules, run via `tsx`
- **Package manager**: yarn — never use npm or npx

## Conventions
- TypeScript everywhere — no `.js` or `.jsx` files
- Use `styled` from `@mui/material/styles` for custom components; avoid inline `sx` props for anything beyond one-liner spacing
- Keep MUI component imports; wrap them with `styled()` rather than replacing them
- All shared types live in `web/src/types.ts`
- Export `RootState` and `AppDispatch` from `web/src/store.ts`

## How to run
```bash
yarn start          # both servers (recommended)
yarn dev:api        # Express on :8787
yarn dev:web        # Vite on :5177
yarn typecheck:web
yarn typecheck:server
yarn build:web
```

## Architecture
- Frontend at `web/src/`, backend at `server/index.ts`
- Vite proxies `/api/*` → `http://localhost:8787`
- RTK Query polls every 15s (`skipPollingIfUnfocused: true`)
- UI preferences (theme, section, chartRange) persisted via redux-persist to localStorage
- All file paths in the server resolve relative to workspace root (`path.resolve(__dirname, '..', '..')` — two levels above `server/`)

## Data sources (server)
- `docs/ACP_SESSION_REGISTRY.md` — parsed markdown table
- `docs/ACP_KILL_QUEUE.md` — kill request audit trail
- `~/.openclaw/logs/gateway.log` / `gateway.err.log` — log parsing
- `artifacts/root-cause-eval-*.json` — retrieval quality
- Remote FoxMemory API (`FOXMEMORY_BASE_URL`, default `http://192.168.0.118:8082`)

## What NOT to do
- Don't add client-side routing — this is a single-page operational dashboard
- Don't change the markdown-as-database pattern for the registry/kill queue
- Don't replace MUI components — extend them with `styled()`
- Don't add test infrastructure unless explicitly asked
- Never auto-commit — always wait for explicit instruction to commit or push

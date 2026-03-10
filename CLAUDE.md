# CLAUDE.md — FoxOps Dashboard

## Tech stack
- **Frontend**: React 18, TypeScript, Vite, MUI 6, `@emotion/styled` (via `@mui/material/styles`), Redux Toolkit + RTK Query, redux-persist, Recharts
- **Backend**: Express 4, TypeScript, Node.js ES modules, run via `tsx`
- **Package manager**: yarn — never use npm or npx

## Conventions
- TypeScript everywhere — no `.js` or `.jsx` files
- Use `styled` from `@mui/material/styles` for custom components; avoid inline `sx` props for anything beyond one-liner spacing
- Keep MUI component imports; wrap them with `styled()` rather than replacing them
- All shared types live in `web/src/types.ts`; component-local types in `ComponentName/ComponentName.types.ts`
- Export `RootState` and `AppDispatch` from `web/src/store.ts`

## Component architecture
- All components live under `web/src/components/<ComponentName>/`
- Every component folder contains exactly:
  - `ComponentName.tsx` — the component
  - `ComponentName.types.ts` — props and local types (imported by the component, not re-exported from types.ts unless shared)
  - `ComponentName.spec.tsx` — tests (Vitest + React Testing Library)
  - `ComponentName.stories.tsx` — Storybook stories
- Shared styled primitives used by multiple components go in `web/src/components/shared/`
- `App.tsx` is a thin orchestrator only — no business logic, no inline styled components

## Testing
- Test runner: Vitest
- Component tests: React Testing Library
- File naming: `*.spec.tsx` for component tests

## Storybook
- Builder: `@storybook/react-vite`
- Stories file naming: `*.stories.tsx`

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
- Sessions/crons fetched via openclaw Gateway WebSocket RPC (`server/gateway.ts`)
- Auth DB (SQLite) stored at `FOXOPS_DB_DIR` (default `~/.foxops/foxops.db`)

## Data sources (server)
- openclaw Gateway WS (`OPENCLAW_GATEWAY_URL`) — sessions, crons, cron run history
- Remote FoxMemory API (`FOXMEMORY_BASE_URL`) — memory stats, graph, config
- SQLite DB (`FOXOPS_DB_DIR/foxops.db`) — user auth, kill audit log

## What NOT to do
- Don't add client-side routing — this is a single-page operational dashboard
- Don't replace MUI components — extend them with `styled()`
- Never auto-commit — always wait for explicit instruction to commit or push

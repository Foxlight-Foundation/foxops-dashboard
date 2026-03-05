# ACP Session Dashboard (local)

Tiny local Vite + React + Node app (Material UI) for tracking ACP session intent and completion status.

UI direction is now based on the Material Dashboard React pattern (left nav + top app bar + KPI cards + data table).

State/data architecture:
- Redux Toolkit store + RTK Query for endpoint access
- redux-persist for UI preferences (theme, selected section, chart range)
- automatic polling/refetch for health and memory data (no manual refresh required)

## UX guardrails (operational dashboard mode)

This dashboard is optimized for *operational* decisions (fast, at-a-glance actions), not deep analytics.

- Prioritize a small set of actionable metrics.
- Prefer simple encodings (status chips, counts, tables) over dense charting.
- Keep critical actions (refresh, kill) visible and low-friction.
- Use tooltips for compressed context instead of adding clutter.

## What it shows

- Session purpose (why created)
- run_id + child_session_key
- status (`spawned`, `running`, `silent`, `completed`, `failed`, `killed`)
- done timestamp + outcome summary
- per-row **Kill** button (tries immediate stop; falls back to queued request)
- status badge mouseover tooltips explaining each state
- FoxMemory nav section with live overview hooks (health probe, ingestion queue when available, retrieval-quality artifact read, recent memory-related error samples)
- FoxMemory visuals: memories-stored count tile + "memories stored by day" bar chart (default last 7 days)
- FoxMemory auto-capture health strip (last capture timestamp, success count in recent window, last capture error)

Data source: `docs/ACP_SESSION_REGISTRY.md`

## Run locally

```bash
cd acp-session-dashboard
yarn install
```

One command (recommended):
```bash
yarn start
```

(Still available separately if needed)
```bash
yarn dev:api
yarn dev:web
```

Open: `http://localhost:5177`

Optional env vars for API server:
- `FOXMEMORY_BASE_URL` (default: `http://192.168.0.118:8082`)

## Workflow

1. Spawn ACP run.
2. Append row:
   ```bash
   echo "$SPAWN_JSON" | ../scripts/acp-session-registry-add.sh --purpose "..." --status spawned
   ```
3. Update when done:
   ```bash
   ../scripts/acp-session-registry-update.sh --run-id <runId> --status completed --outcome "..."
   ```

Kill-button behavior:
- Clicking **Kill** attempts an immediate stop against the resolved session first.
- If immediate stop is unavailable, it falls back to `docs/ACP_KILL_QUEUE.md` and still updates registry status to `killed`.

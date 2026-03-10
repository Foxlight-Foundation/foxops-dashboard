# Container Migration Plan

**Goal:** Run the FoxOps dashboard in a container on a machine that has no local openclaw installation. The openclaw instance continues to run on the Mac Mini (or wherever it lives). Communication happens via the openclaw Gateway WebSocket, exposed over Tailscale.

---

## Current architecture (local-only)

```
[Browser] → [Express server, same machine]
                 ├── execFileSync('openclaw', ...) ← CLI on local PATH
                 ├── fs.readFile / fs.appendFile   ← local filesystem
                 └── fetch(foxmemoryBaseUrl)        ← network (already remote)
```

---

## Target architecture (containerized)

```
[Browser] → [Container: Express + built web app]
                 ├── WebSocket → openclaw Gateway (via Tailscale)
                 ├── fetch(FOXMEMORY_BASE_URL)       ← network (unchanged)
                 └── SQLite volume mount             ← auth DB
```

---

## What needs to change

### 1. CLI calls → Gateway WebSocket RPC

All three `execFileSync('openclaw', ...)` data-fetching calls have confirmed Gateway equivalents:

| Endpoint | Current | Gateway RPC | Confirmed? |
|---|---|---|---|
| `GET /api/sessions` | `openclaw sessions --all-agents --json` | `sessions.list` | ✅ tested |
| `GET /api/crons` | `openclaw cron list --json` | `cron.list` | ✅ tested |
| `GET /api/crons/:id/runs` | `openclaw cron runs --id <id> --limit <n>` | `cron.runs` with `{id, limit}` | ✅ tested |
| `POST /api/sessions/kill` | `openclaw agent --session-id ... --message ...` | ⚠️ no direct RPC — see below | |
| `POST /api/sessions/delete` | `openclaw sessions cleanup ...` + `fs.unlinkSync` | `sessions.delete` with `{key}` | ✅ tested (exists, rejects main session as expected) |

**Kill session:** No `agent.abort` or `agent.kill` RPC exists. The current implementation sends a stop message via `openclaw agent --session-id ... --message ...`. The closest available approach via Gateway is `cron.update` (to disable a job), but for sending a stop message to a running agent session there is no confirmed remote equivalent yet. Options:
- Accept that kill is a "best effort" feature and disable it in remote mode, or
- Investigate `openclaw agent --help` further to see if the CLI wraps a Gateway call that could be replicated directly over the WS protocol

### 2. Filesystem dependencies to eliminate

| File | Current use | Migration path |
|---|---|---|
| `docs/ACP_KILL_QUEUE.md` | Kill audit log, appended by server | Replace with a SQLite table in the auth DB (already present), or drop entirely if kill is disabled in remote mode |
| `~/.openclaw/agents/<id>/sessions/<id>.jsonl` | Deleted by `sessions/delete` | `sessions.delete` Gateway RPC handles this server-side — no file access needed from the container |
| `~/.foxops/foxops.db` | Auth user DB | Mount as a Docker volume — already a file, just needs persistence |

### 3. Gateway WebSocket exposure via Tailscale

The Gateway currently runs with:
```json
{ "bind": "loopback", "tailscale": { "mode": "off" } }
```

To expose it to the container on another machine:

```bash
# On the openclaw machine — run once
openclaw config set gateway.bind tailnet
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

Then the Gateway is reachable at `wss://<tailscale-hostname>:18789` (or whatever Tailscale assigns). The container connects using this URL + the existing token auth.

### 4. New environment variables needed

Add to `.env` / container env:

```env
# OpenClaw Gateway WebSocket URL (e.g. wss://kite-mac.tailnet-name.ts.net:18789)
OPENCLAW_GATEWAY_URL=ws://localhost:18789

# Token required by the gateway (from openclaw config get gateway.auth.token)
OPENCLAW_GATEWAY_TOKEN=
```

Existing vars (already in `.env.example`, no change needed):
- `FOXMEMORY_BASE_URL` — FoxMemory API (reachable over Tailscale/LAN as-is)
- `FOXMEMORY_USER_ID`
- `QDRANT_BASE_URL` — optional override

### 5. Gateway client in the server

Replace `execFileSync` calls with a lightweight Gateway WS client. The Gateway protocol is JSON-RPC over WebSocket. A minimal implementation:

```ts
// server/gateway.ts
import WebSocket from 'ws';

const url = process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:18789';
const token = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export const gatewayCall = (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: token ? { 'x-openclaw-token': token } : {},
    });
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => { ws.close(); reject(new Error('Gateway timeout')); }, 10000);
    ws.on('open', () => ws.send(JSON.stringify({ id, method, params })));
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.close();
        if (msg.error) reject(new Error(msg.error.message ?? String(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
};
```

> **Note:** Need to verify the exact Gateway WS protocol (auth handshake, message envelope shape). The `openclaw gateway call` CLI source is the ground truth. If the token is passed as a connect param rather than a header, the client above needs adjusting.

---

## Migration steps (ordered)

1. **Verify Gateway WS protocol** — inspect how `openclaw gateway call` authenticates (header vs. connect param vs. first message)
2. **Write `server/gateway.ts`** — the WS client above, adjusted for real protocol
3. **Replace CLI calls** — swap `execFileSync` in `/api/sessions`, `/api/crons`, `/api/crons/:id/runs`, `/api/sessions/delete`
4. **Handle kill** — decide: disable in remote mode, or implement via Gateway if a method is found
5. **Replace `ACP_KILL_QUEUE.md`** — add a `kill_log` table to the SQLite DB (simple INSERT, no file I/O)
6. **Add `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN` to `.env.example`**
7. **Write `Dockerfile`** — multi-stage: build web → Node runtime + built assets
8. **Write `docker-compose.yml`** — mounts SQLite volume, passes env vars
9. **Configure Tailscale on openclaw machine** — `gateway.bind = tailnet`, `tailscale.mode = serve`
10. **Test end-to-end** — container on a separate machine, all data flowing via Gateway + Tailscale

---

## What does NOT need to change

- All FoxMemory endpoints — already pure HTTP proxy, reachable over Tailscale/LAN
- Auth system (Google OAuth, local login, MFA) — runs entirely in the Express server
- Frontend (React/Vite) — built into static assets, served by Express in production
- RTK Query polling — no changes needed once the API responses remain the same shape

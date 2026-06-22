# How the Local Dashboard Server Works

The extension runs a small HTTP server on `127.0.0.1:49830` inside the Copilot App process. This page explains the lifecycle and what to do when the panel stops responding.

---

## Architecture overview

```
Copilot App
 └── extension.mjs (Node.js fork)
       ├── joinSession()     — registers the canvas with the Copilot runtime
       ├── http.Server       — binds to 127.0.0.1:49830 at startup
       └── refreshAll()      — populates state on each /api/dashboard request
             ├── refreshAuth()     → gh api /user
             ├── refreshLive()     → session.rpc.usage.getMetrics()
             ├── refreshBilling()  → gh api /users/{login}/billing/copilot
             └── refreshSessions() → ~/.copilot/session-state/*/events.jsonl

User opens the "Copilot App Cost" panel
 └── Copilot calls open() → returns { url: "http://127.0.0.1:49830/" }
       └── WebView loads index.html
             └── JS polls GET /api/dashboard every 2 seconds
```

### Why port 49830 is fixed

The canvas `open()` callback returns the URL once. The WebView panel caches that URL and reuses it across restarts. If the port were random, a restarted extension would bind on a different port and the cached URL would produce `ERR_CONNECTION_REFUSED`. Binding to `49830` at startup keeps existing panel tabs working through extension reloads.

If `49830` is already in use by another process the server falls back to an OS-assigned ephemeral port, but the panel URL will be stale — close and re-open the panel to get the new URL.

---

## Request lifecycle

```
GET /api/dashboard?force=true
 ↓
refreshAll(session, force=true)
 ├── auth    → state.auth   (cached 60 s)
 ├── live    → state.live   (no cache, always fresh)
 ├── billing → state.billing (cached 120 s, or forced)
 └── sessions→ state.sessions (cached 30 s, or forced)
 ↓
buildDashboard()  — pure function, combines all state into one JSON object
 ↓
HTTP 200 JSON → index.html re-renders the dashboard
```

`GET /` serves `assets/index.html` (the single-page dashboard UI).
`GET /api/settings` and `POST /api/settings` read/write the persistent settings file.
`POST /api/refresh` forces an immediate full refresh.

---

## Security boundaries

- The server only binds to `127.0.0.1` — it is never reachable from outside the machine.
- `gh api` is called via `child_process.execFile` with a fixed argument list; no shell interpolation takes place.
- No tokens, prompts, or source code are written to disk, logged, or included in API responses.

---

## Troubleshooting: panel not loading

### 1. Check whether the extension is running

Open the Copilot App extension list and look for `copilot-app-cost`.

- **Status: running** — server is up; go to step 2.
- **Status: failed** — the extension process exited; reload the extension (see step 3).
- **Status: not listed** — the extension is not installed; follow `docs/INSTALL.md`.

### 2. Verify the server is listening

Open a terminal and run:

```bash
# Windows
netstat -an | findstr 49830

# macOS / Linux
lsof -i :49830
```

If you see a `LISTENING` (or `LISTEN`) line the server is up and the problem is in the panel URL. Close the panel tab and re-open it from the Copilot App panel menu.

If there is no output, the server is not running — continue to step 3.

### 3. Reload the extension

In the Copilot App:

1. Open the extension list.
2. Click the three-dot menu next to `copilot-app-cost`.
3. Choose **Reload** (or **Disable then Enable**).

The extension process will restart, bind the server, and re-register the canvas. If the panel tab is already open, close and re-open it so the WebView fetches a fresh URL.

### 4. Re-import the extension (last resort)

If reloading does not help:

1. Remove the extension from the panel.
2. Click **Add to panel** → **Import canvas from repo**.
3. Select `.github/extensions/copilot-app-cost`.
4. Click **Import**.

### 5. Check extension logs

Each extension writes a log file. The path is shown in the extension details panel inside Copilot App. Common log messages:

| Message | Meaning |
|---|---|
| `server listening on 127.0.0.1:49830` | Server is up normally. |
| `port 49830 in use, falling back to ephemeral port` | Another process took 49830; note the fallback port. |
| `joinSession error` | Runtime handshake failed; try reloading the extension. |
| `gh api error` | GitHub CLI not authenticated; run `gh auth login`. |

### 6. Override the port (advanced)

Set the environment variable `COPILOT_APP_COST_PORT` before Copilot App launches:

```bash
# Windows PowerShell
$env:COPILOT_APP_COST_PORT = "49831"

# macOS / Linux
export COPILOT_APP_COST_PORT=49831
```

Then restart Copilot App. The extension will bind on the specified port. After changing the port, close and re-open the panel so the WebView resolves the new URL.

---

## Data freshness

| Source | Cache TTL | Force-refresh trigger |
|---|---|---|
| Auth (`gh api /user`) | 60 s | Settings save |
| Live session metrics | No cache | Every poll (2 s) |
| GitHub billing | 120 s | Refresh button |
| Session history | 30 s | Refresh button |

The panel polls `/api/dashboard` every 2 seconds. Live metrics are always fetched from the runtime; billing and history are served from the in-memory cache until the TTL expires or a manual refresh is triggered.

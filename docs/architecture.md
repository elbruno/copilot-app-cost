# Architecture

## Overview

`copilot-app-cost` is a project-scoped GitHub Copilot Canvas extension that displays near-real-time AI-credit usage and USD cost for the active Copilot session, local session history, and official GitHub billing data.

The extension runs as a Node.js process managed by the Copilot CLI runtime. It exposes a local HTTP server that serves the Canvas UI and handles API requests from the canvas front-end.

## Runtime Contract

The extension registers itself via:

```js
joinSession({ canvases: [createCanvas({ title, open })] });
```

The `open` callback is invoked once per canvas instance. It receives `{ session, instanceId }` and must return an object with `{ title, status, url }`. The URL points to the per-instance HTTP server started by the extension.

## Module Map

```
.github/extensions/copilot-app-cost/
├── extension.mjs          Main entrypoint — canvas registration, HTTP server, state management
├── package.json           Extension metadata
├── assets/
│   └── index.html         Single-page dashboard UI (served with __INSTANCE_ID__ substitution)
└── lib/
    ├── cost.mjs           Pure cost calculation, model rate table, plan allowances
    ├── history.mjs        Local JSONL session event parser
    ├── billing.mjs        GitHub Billing API adapter (gh api, fixed args)
    └── settings.mjs       Local settings persistence and validation
```

## Data Flow

```
Canvas UI (index.html)
    │
    │ fetch /api/dashboard
    │ fetch /api/refresh/<provider>
    │ fetch /api/action/<name>
    ▼
extension.mjs (HTTP server)
    ├── Live provider ──────────── session.rpc.usage.getMetrics()
    │                              → cost.mjs → metricsToSessionUsage, calculateSessionEstimate
    ├── Sessions provider ──────── history.mjs → listRecentSessionUsages
    │                              reads ~/.copilot/session-state/<id>/events.jsonl
    └── Billing provider ────────── billing.mjs → buildGhArgs → execFile("gh", ["api", ...])
                                   ← normalizeBillingResponse
```

## State Model

A single `state` object is kept in memory for the lifetime of the extension process:

| Field | Description |
|-------|-------------|
| `state.settings` | Current settings (loaded from disk at startup, merged on save) |
| `state.providers.live` | Live provider health, timestamps, error state |
| `state.providers.billing` | Billing provider health, timestamps, error state |
| `state.providers.sessions` | Local sessions provider health, timestamps, error state |
| `state.data.live` | Latest session usage estimate |
| `state.data.billing` | Latest normalized billing response |
| `state.data.sessions` | Recent completed sessions from local JSONL history |
| `state.data.liveTimeline` | Circular buffer of live snapshots (max 120) for the session graph |

## Security Properties

- No tokens are stored or logged.
- `gh api` is called via `execFile` with a fixed allow-list of arguments — no shell interpolation.
- Prompts, source code, and transcripts are never read or persisted.
- GitHub billing, budgets, policies, and Copilot settings are never mutated.
- The HTTP server binds to `127.0.0.1` only on a random port.
- HTML output is always escaped before insertion into the dashboard.

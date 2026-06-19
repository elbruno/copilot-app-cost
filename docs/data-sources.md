# Data Sources

This document describes every data source used by `copilot-app-cost`, including scope, freshness, confidence, and known limitations.

---

## 1. Live Session Estimate (`session.rpc.usage.getMetrics`)

| Attribute | Value |
|-----------|-------|
| Source label | `LIVE ESTIMATE` |
| Scope | `active-session` |
| Transport | Copilot SDK `session.rpc.usage.getMetrics()` |
| Freshness | Polled every 2–10 seconds (configurable) |
| Confidence | `estimated` |
| Reliability | `live-estimate` |

### What it provides

- `totalNanoAiu` — session-level AI units (1 000 000 000 nano AIU = 1 AI credit)
- `totalUserRequests` — total requests in the current session
- `modelMetrics` — per-model token buckets (input, cached, output, reasoning, cacheWrite)
- `currentModel` — active model name
- `sessionStartTime` — session start time
- `codeChanges` — lines added/removed, files modified

### Cost calculation

When `totalNanoAiu > 0`, cost is derived directly:

```
aiCredits = totalNanoAiu / 1_000_000_000
totalUsd   = aiCredits * 0.01
```

When `totalNanoAiu` is `0` or unavailable, cost is estimated from token counts using the model rate table in `lib/cost.mjs`. This is clearly labelled as `token-rate-estimate`.

### Limitations

- `totalNanoAiu = 0` is a valid reported value (no usage yet). It must not be treated as missing.
- Token counts for internal Copilot models (e.g. `chamomile`) are not exposed; those sessions will show $0.00 until a premium model is invoked.
- The `session.capabilities.canvases` flag was observed as `false` even when the canvas functioned correctly. It must not be used as a gate.

---

## 2. Local Session History (`~/.copilot/session-state`)

| Attribute | Value |
|-----------|-------|
| Source label | `LOCAL SESSION` |
| Scope | `local-history` |
| Transport | File system — `fs.readFileSync` |
| Freshness | Polled every 30–300 seconds (configurable) |
| Confidence | `estimated` |
| Reliability | `local-estimate` |

### What it provides

Completed (non-active) session costs derived from:

- `~/.copilot/session-state/<id>/events.jsonl` — JSONL event log; metrics events carry `data.modelMetrics` and `data.totalNanoAiu`
- `~/.copilot/session-state/<id>/workspace.yaml` — session name, CWD, repo, branch

### Limitations

- Only sessions whose event files contain usage metrics are shown.
- Deleted session directories are not recoverable.
- The reader is read-only and never modifies event files.

---

## 3. GitHub Billing API

| Attribute | Value |
|-----------|-------|
| Source label | `GITHUB BILLING` |
| Scope | `user` or `organization` |
| Transport | `gh api` via `execFile` (fixed argument allowlist) |
| Freshness | Point-in-time; polled every 5–60 minutes (configurable) |
| Confidence | `official` |
| Reliability | `authoritative-scope` when data is present |

### Endpoints

```
GET /users/{user}/settings/billing/ai_credit/usage?year=&month=
GET /organizations/{org}/settings/billing/ai_credit/usage?year=&month=
```

API version header: `X-GitHub-Api-Version: 2026-03-10`

### Required scopes

- **User scope**: requires the `user` GitHub OAuth scope  
  Fix: `gh auth refresh -h github.com -s user`
- **Organization scope**: requires `read:org` and the organization's Copilot billing to be enabled

### Known limitations

- Personal billing returns empty or 404 for accounts whose Copilot usage is managed and billed through an organization or enterprise (pooled). This is classified as `managed-license-or-no-personal-usage`, not an error.
- The billing API returns month-level data. Intra-month data may be incomplete until the month closes.
- Session-level costs in the billing API roll up to monthly totals. There is no per-session breakdown in the billing response.

### Error classifications

| Classification | Meaning |
|----------------|---------|
| `missing-user-scope` | `gh` token lacks the `user` OAuth scope |
| `missing-organization-permission` | No read access to org billing |
| `unauthorized` | Token not authenticated |
| `forbidden` | Token lacks required permissions |
| `not-found-or-no-org-access` | Org not found or no billing access |
| `not-found-or-no-billed-usage` | User endpoint returned 404 |
| `rate-limited` | API rate limit hit |
| `server-error` | GitHub API 5xx |
| `request-failed` | Network or other error |

---

## Label Legend

| Label | Meaning |
|-------|---------|
| **Source** | Which system produced the data |
| **Scope** | `active-session`, `local-history`, `user`, `organization` |
| **Freshness** | How recently the data was fetched |
| **Confidence** | `estimated` (calculated from tokens/rates) or `official` (from GitHub billing) |
| **Reliability** | `live-estimate`, `local-estimate`, `authoritative-scope`, `managed-license-or-no-personal-usage` |

---

## Important: Never mix scopes

- Session-level estimates (`active-session`, `local-history`) and billing totals (`user`, `organization`) represent different things and must never be summed.
- Estimates must not be presented as official billing.
- Zero values must not replace genuinely unavailable values; use `null` and surface an explicit label.

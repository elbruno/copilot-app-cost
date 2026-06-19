# API Reference

## Canvas Actions

The extension provides 13 read-only, agent-callable actions for cost analysis and reporting. All actions accept optional filters and return JSON.

### 1. **Get Session Estimate**
Fetch the current live session cost estimate.

```
POST /api/action/get-session-estimate
```

**Request Body:**
```json
{
  "billReasoningTokens": false
}
```

**Response:**
```json
{
  "sessionId": "sess-uuid",
  "totalUsd": 0.42,
  "aiCredits": 42,
  "currentModel": "gpt-5-mini",
  "totalRequests": 5,
  "calculationMethod": "token-estimate",
  "modelBreakdown": [
    {
      "model": "gpt-5-mini",
      "requests": 5,
      "totalUsd": 0.42,
      "aiCredits": 42,
      "inputTokens": 2000,
      "outputTokens": 1500
    }
  ]
}
```

### 2. **Get Session History**
Fetch completed sessions from local session state.

```
POST /api/action/list-session-history
```

**Request Body:**
```json
{
  "limit": 10,
  "minUsd": 0
}
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "sess-1",
      "repository": "elbruno/my-app",
      "branch": "main",
      "startTime": "2026-06-19T10:00:00Z",
      "durationSeconds": 3600,
      "estimate": {
        "totalUsd": 1.25,
        "aiCredits": 125,
        "topModel": "claude-sonnet-4.6",
        "topModelRequests": 3
      }
    }
  ],
  "count": 1
}
```

### 3. **Get Billing Data**
Fetch official GitHub billing usage for the current month.

```
POST /api/action/get-billing-usage
```

**Request Body:**
```json
{
  "year": 2026,
  "month": 6
}
```

**Response:**
```json
{
  "source": "GITHUB BILLING",
  "scope": "user",
  "account": "elbruno",
  "timePeriod": { "year": 2026, "month": 6 },
  "totals": {
    "netQuantity": 150,
    "netAmount": 1.50
  },
  "usageByModel": [
    {
      "model": "gpt-5-mini",
      "netQuantity": 100,
      "netAmount": 1.00
    }
  ],
  "permissionStatus": "authorized"
}
```

### 4. **Get Plan Allowance**
Get the monthly AI credit allowance for a given plan.

```
POST /api/action/get-plan-allowance
```

**Request Body:**
```json
{
  "plan": "pro"
}
```

**Response:**
```json
{
  "plan": "pro",
  "baseAiCredits": 1000,
  "flexAiCredits": 500,
  "totalAiCredits": 1500,
  "pooled": false
}
```

### 5. **Calculate Monthly Remaining**
Calculate remaining credits for the month based on billing usage and plan.

```
POST /api/action/get-monthly-remaining
```

**Request Body:**
```json
{
  "plan": "pro",
  "year": 2026,
  "month": 6
}
```

**Response:**
```json
{
  "plan": "pro",
  "allowanceCredits": 1500,
  "usedCredits": 150,
  "remainingCredits": 1350,
  "usagePercentage": 10.0,
  "pooled": false
}
```

### 6. **Aggregate Models**
Get a summary of model usage across sessions or billing data.

```
POST /api/action/aggregate-models
```

**Request Body:**
```json
{
  "scope": "local-sessions",
  "limit": 10
}
```

**Response:**
```json
{
  "models": [
    {
      "model": "gpt-5-mini",
      "totalUsd": 2.50,
      "aiCredits": 250,
      "requestCount": 15,
      "samples": 3
    }
  ]
}
```

### 7. **Get Session Timeline**
Fetch a time-series of live session cost snapshots (for graphing).

```
POST /api/action/get-session-timeline
```

**Request Body:**
```json
{
  "intervalSeconds": 60,
  "maxDataPoints": 120
}
```

**Response:**
```json
{
  "timeline": [
    {
      "timestamp": "2026-06-19T10:00:00Z",
      "totalUsd": 0.05,
      "aiCredits": 5,
      "cumulativeUsd": 0.05,
      "model": "gpt-5-mini"
    }
  ],
  "intervalSeconds": 60
}
```

### 8. **Export Dashboard**
Export the current dashboard state as JSON.

```
POST /api/action/export-dashboard
```

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "exportedAt": "2026-06-19T10:00:00Z",
  "extension": "copilot-app-cost",
  "version": "0.1.0",
  "live": { ... },
  "billing": { ... },
  "sessions": [ ... ],
  "settings": { ... }
}
```

### 9. **Get Alert Status**
Check if any configured alerts are triggered.

```
POST /api/action/get-alert-status
```

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "alerts": [
    {
      "type": "session-cost-exceeded",
      "threshold": 2.0,
      "current": 2.15,
      "triggered": true
    }
  ]
}
```

### 10. **Get Extension Status**
Health check and metadata.

```
POST /api/action/get-extension-status
```

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "version": "0.1.0",
  "uptime": 3600,
  "providers": {
    "live": { "available": true, "lastError": null },
    "billing": { "available": true, "lastError": null },
    "sessions": { "available": true, "lastError": null }
  },
  "memoryMb": 45.2
}
```

### 11. **Analyze Cost Trend**
Compare costs across recent sessions or months (for trend analysis).

```
POST /api/action/analyze-trend
```

**Request Body:**
```json
{
  "metric": "session-cost",
  "limit": 7
}
```

**Response:**
```json
{
  "metric": "session-cost",
  "samples": [
    { "timestamp": "2026-06-19", "value": 1.25, "unit": "USD" },
    { "timestamp": "2026-06-18", "value": 0.95, "unit": "USD" }
  ],
  "average": 1.10,
  "min": 0.95,
  "max": 1.25
}
```

### 12. **Validate Settings**
Check if current settings are valid and suggest fixes.

```
POST /api/action/validate-settings
```

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "valid": true,
  "issues": [],
  "warnings": []
}
```

### 13. **Get Diagnostic Report**
Detailed diagnostics for troubleshooting.

```
POST /api/action/get-diagnostic-report
```

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "timestamp": "2026-06-19T10:00:00Z",
  "providers": {
    "live": { "status": "healthy", "lastAttempt": "2026-06-19T10:05:00Z" },
    "billing": { "status": "auth-required", "lastError": "missing-user-scope" },
    "sessions": { "status": "healthy", "lastAttempt": "2026-06-19T10:04:00Z" }
  },
  "environment": {
    "platform": "win32",
    "sessionId": "sess-uuid",
    "instanceId": "instance-uuid"
  }
}
```

---

## HTTP API Endpoints

The extension runs an HTTP server (localhost on a random port). The Canvas UI communicates via these endpoints:

### Dashboard

```
GET /api/dashboard
```

Returns the complete dashboard state (live, billing, sessions, settings, timeline, alerts).

### Refresh Provider

```
POST /api/refresh/{provider}
```

Force refresh a specific provider (`live`, `billing`, or `sessions`). Returns updated provider state.

### Settings

```
GET /api/settings
POST /api/settings
```

Get or update extension settings.

### Health Check

```
GET /health
```

Simple health check endpoint (always returns `{ ok: true }`).

---

## Agent-Callable Pattern

When an agent calls a Canvas action, use this pattern:

```python
# Pseudocode
response = await session.rpc.canvas.action("get-session-estimate", {
  "billReasoningTokens": False
})
```

All actions are **read-only** — no state mutations, no side effects beyond fetching data.

---

## Error Responses

All endpoints return `{ error, code, details }` on failure:

```json
{
  "error": "Failed to fetch billing data",
  "code": "missing-user-scope",
  "details": "GitHub auth token missing 'user' scope. Run: gh auth refresh -h github.com -s user"
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| `missing-user-scope` | GitHub token lacks `user` scope |
| `invalid-request` | Bad request payload |
| `auth-error` | Billing auth failed |
| `not-found` | Resource not found |
| `rate-limited` | API rate limit hit |
| `server-error` | Internal error |

---

## Limits & Guarantees

- **Timeout:** All endpoints timeout after 10 seconds
- **Max results:** History/trend endpoints return max 100 items
- **Freshness:** Live data is polled every 2–10 seconds; billing every 5 minutes
- **Idempotency:** All endpoints are read-only; calling them multiple times is safe
- **Rate limits:** No per-action limits (GitHub API rate limits apply to billing)

---

## Changelog

### v0.1.0 (Initial Release)
- All 13 actions implemented
- Full dashboard HTTP API
- Local session history parsing
- GitHub Billing integration (with `user` scope)

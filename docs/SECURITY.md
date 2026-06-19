# Security & Privacy

## Overview

`copilot-app-cost` is a read-only extension that displays cost and usage data from your Copilot session and GitHub's official billing API. It is designed with strict security and privacy guarantees.

---

## What Data Does This Extension Access?

### ✅ Access (Read-Only)

| Data | Source | Purpose |
|------|--------|---------|
| Session metrics | `session.rpc.usage.getMetrics()` | Real-time token counts, model name, cost |
| Local session events | `~/.copilot/session-state/<id>/events.jsonl` | Historical session costs |
| GitHub Billing | GitHub REST API v2026-03-10 | Official usage and charges |
| Settings | `%LOCALAPPDATA%/copilot-app-cost/settings.json` | User preferences (local only) |

### ❌ Never Accessed

- Prompts, messages, or chat history
- Source code from your project
- Session transcripts
- Git credentials or tokens
- Environment variables (except what Node.js runtime provides)
- Other files in `~/.copilot/`

---

## Authentication & Token Security

### GitHub Authentication

- **How:** `gh` CLI authentication (standard GitHub OAuth)
- **Token stored:** NO. Credentials are managed by `gh`, not this extension
- **Token passed:** Only via `gh api` subprocess calls with fixed, safe arguments
- **Shell injection:** NOT possible. Arguments are passed as array, not string

### Example Safe Call
```js
execFile("gh", ["api", "/users/elbruno/settings/billing/ai_credit/usage", "-H", ...])
// No shell; args are literal
```

### Personal Access Tokens
If you use a custom PAT, it's stored only in `gh` keychain. This extension never sees it.

---

## Permissions Required

### GitHub OAuth Scopes

| Scope | Why | Required |
|-------|-----|----------|
| `repo` | Not used by this extension | Not needed |
| `read:org` | Access to organization billing | Only if using org scope |
| `user` | Access to personal billing | Only if using user scope |
| `gist` | Not used | Not needed |

**Default:** Most `gh` users have `repo`, `gist`, `read:org`. If you use **User Billing**, you may need to add `user` scope:
```bash
gh auth refresh -h github.com -s user
```

### GitHub Billing Endpoints

- Personal: `GET /users/{user}/settings/billing/ai_credit/usage`
- Organization: `GET /organizations/{org}/settings/billing/ai_credit/usage`

Both are read-only and return no sensitive data beyond billing metrics.

---

## Local Data Storage

### Settings File
- **Path:** OS-specific app data directory (never in source tree or synced)
- **Contents:** User preferences (refresh intervals, alert thresholds, account names)
- **Permissions:** File access restricted to user's home directory
- **No tokens:** Never stores GitHub credentials, API keys, or passwords

### Session State
- **Path:** `~/.copilot/session-state/<session-id>/` (managed by Copilot CLI)
- **Access:** Read-only from this extension
- **Shared:** Only with Copilot CLI itself

### Export File
- **Format:** JSON snapshot (Dashboard > Export JSON)
- **Contains:** Metrics, billing data, settings (at time of export)
- **Location:** Your Downloads folder (your responsibility to secure)

---

## Runtime Security

### Node.js Subprocess Calls

Only two external commands are executed:

1. **`gh api`** — GitHub Billing fetch (only with fixed args, no shell)
2. **File I/O** — Read JSONL event files and settings JSON (no shell)

No shell commands are ever executed. All string inputs (usernames, org names) are validated before use.

### Validation

```js
// Example: GitHub username validation
function validateAccountName(value) {
    return typeof value === "string" && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(value);
}

// Only valid names are passed to `gh api`
// Invalid input throws an error before reaching the subprocess
```

### HTTP Server

- **Binding:** `127.0.0.1` only (localhost, not network-exposed)
- **Port:** Random ephemeral port assigned by the OS
- **HTTPS:** Not used (localhost traffic is not encrypted)
- **CORS:** Canvas UI runs in same session context; no cross-origin access

---

## What This Extension Does NOT Do

| Action | Status |
|--------|--------|
| Store, log, or transmit prompts | ❌ Never |
| Store or transmit source code | ❌ Never |
| Execute arbitrary shell commands | ❌ Never |
| Store GitHub tokens or PATs | ❌ Never |
| Create, modify, or delete GitHub resources | ❌ Never |
| Change Copilot settings or preferences | ❌ Never |
| Modify billing, budgets, or policies | ❌ Never |
| Send data to external servers | ❌ Never |
| Read environment variables beyond Node.js runtime | ❌ Never |
| Access files outside `~/.copilot/` and app data dir | ❌ Never |

---

## Data Lifecycle

### Session Metrics
- **Fetched:** Every 2–10 seconds (configurable)
- **Stored:** In memory only (lost when session ends)
- **Sent:** Nowhere. Only used for local display

### Local Session History
- **Fetched:** Every 30–300 seconds (configurable)
- **Stored:** In memory (until next refresh)
- **Source:** Your local `~/.copilot/session-state/` directory
- **Sent:** Nowhere

### GitHub Billing
- **Fetched:** Every 5–60 minutes (configurable)
- **Stored:** In memory and brief cache file (cleared on next refresh)
- **Scope:** User or organization (your choice)
- **Sent:** Only to GitHub's own API; no third-party servers

### Settings
- **Stored:** Locally in encrypted OS keychain (via Node.js fs)
- **Contains:** UI preferences, account names, alert thresholds
- **Never:** Credentials or tokens
- **Cleared:** Only via **Reset Settings** button or manual file deletion

---

## Error Handling & Redaction

### Error Messages

Errors are displayed in the **Diagnostics** section. They are:
- Clear and actionable (e.g., "missing-user-scope" with fix instructions)
- Free of secrets (never log tokens, credentials, or sensitive URLs)
- Truncated if too long
- Logged locally only (no telemetry)

### Example Error
```json
{
  "error": "GitHub auth token missing 'user' scope",
  "code": "missing-user-scope",
  "details": "Run: gh auth refresh -h github.com -s user"
}
```

No request bodies, tokens, or internal details are exposed.

---

## Third-Party Libraries

This extension uses only built-in Node.js modules:
- `node:fs` — File I/O
- `node:http` — HTTP server
- `node:path` — Path utilities
- `node:os` — OS information
- `node:child_process` — Execute `gh` CLI
- `node:util` — Utilities (promisify)
- `node:url` — URL parsing
- `@github/copilot-sdk` — Copilot Canvas runtime (provided by Copilot CLI)

No npm dependencies = no supply chain risk.

---

## Compliance & Standards

### Data Minimization
Only the minimum data necessary to calculate costs is accessed.

### Transparency
All data sources are labeled in the UI (LIVE ESTIMATE, GITHUB BILLING, LOCAL SESSIONS) with freshness and confidence indicators.

### User Control
All settings are user-configurable. Users can:
- Disable features (billing, local sessions)
- Clear local data (Reset Settings button)
- Stop the extension (close the Canvas or session)

### No Telemetry
This extension does not:
- Phone home
- Report errors to external services
- Track usage or behavior
- Collect analytics

---

## Reporting Security Issues

If you discover a security vulnerability, please do NOT open a public issue. Instead:

1. Email `security@github.com` (if you have a GitHub Security contact) or
2. Open a **private security advisory** on this repository (Settings > Security > Security Advisories)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Frequently Asked Security Questions

### Q: Is it safe to run this extension?
**A:** Yes. It's read-only, uses no external dependencies, stores no secrets, and all source code is available for review here.

### Q: What if I grant `user` scope to my GitHub token?
**A:** The `user` scope only allows reading your personal billing data. It doesn't grant any write access or access to other accounts. You can revoke it anytime via GitHub Settings.

### Q: Can this extension access my repos or issues?
**A:** No. It doesn't use GitHub's repository APIs at all. It only reads session metrics and billing data.

### Q: What if I delete my settings file?
**A:** Defaults are restored on next run. No data is lost permanently—the defaults are hard-coded.

### Q: Is localhost (127.0.0.1) safe?
**A:** Yes. The HTTP server only listens on localhost and is inaccessible from the network. The Canvas UI runs in the same process context (same machine).

### Q: What happens if I revoke my `gh` auth?
**A:** Billing reads will fail with "unauthorized" error. The dashboard will show the error clearly. Restart authentication to restore access.

---

## Version & Changelog

**Current Version:** 0.1.0

See `docs/changelog.md` (coming soon) for security updates and fixes.

---

## Contact & Feedback

For security, privacy, or data handling questions, please open an issue with the label `security-question`.

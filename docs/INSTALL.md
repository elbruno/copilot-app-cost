# Installation & Setup: copilot-app-cost Canvas

A GitHub Copilot App Canvas extension for monitoring AI-credit usage.

## Quick Start (2 minutes)

### 1. Clone the repository

```bash
git clone https://github.com/elbruno/copilot-app-cost.git
cd copilot-app-cost
```

### 2. Authenticate with GitHub

```bash
gh auth status
```

If not authenticated:
```bash
gh auth login
```

If you want to see official billing, add the `user` scope:
```bash
gh auth refresh -h github.com -s user
```

### 3. Open the Canvas

#### In GitHub Copilot CLI:

```bash
copilot
```

Then ask Copilot to load the extension:

```
Load the canvas extension at .github/extensions/copilot-app-cost
```

Canvas opens in the side panel.

#### In VS Code (Copilot Chat):

1. Open Copilot Chat
2. Reference the extension:

```
Use the canvas at .github/extensions/copilot-app-cost to show AI-credit usage
```

3. Canvas appears in the right panel

#### In GitHub.com:

1. Start a Copilot Chat conversation
2. Ask Copilot to load `.github/extensions/copilot-app-cost`
3. Canvas opens in the side panel

### 4. Explore the Dashboard

Once open, you'll see:

- **Overview**: Live session cost + GitHub billing
- **Live Session**: Real-time metrics (model, tokens, cost)
- **Billing**: Your official AI-credit usage
- **Sessions**: Local completed sessions
- **Settings**: Refresh rates, billing scope
- **Diagnostics**: Provider status and debug info

## Features

### Live Session Metrics

✅ **Automatic** — no setup required

Shows real-time cost from your active Copilot conversation:
- Model name
- Token usage (input, output, cached)
- AI credits consumed
- USD cost estimate
- Per-model breakdown

Refreshes every 2–10 seconds (configurable in Settings).

### Official GitHub Billing

Shows your official AI-credit usage from GitHub.

**Personal Billing:**
```bash
gh auth refresh -h github.com -s user
```

Reads: `/users/{username}/settings/billing/ai_credit/usage`

**Organization Billing:**
```bash
gh auth refresh -h github.com -s read:org
```

Reads: `/organizations/{orgname}/settings/billing/ai_credit/usage`

Requires `read:org` permission for your organization.

### Local Session History

Shows completed sessions from `~/.copilot/session-state/`:
- Session ID, model, time range
- Estimated cost
- No prompts or source code shown

### Configurable Settings

- **Live Refresh**: How often to check session metrics (2–10 sec)
- **Billing Refresh**: How often to check official billing (1–60 min)
- **Billing Scope**: Personal (`user`) or organization (`org`)
- **Alert Threshold**: Optional cost warning level

Settings persist locally.

## Authentication

### Live Metrics

✅ Works automatically. Uses `session.rpc.usage.getMetrics()` from Copilot SDK.

### GitHub Billing

Requires:
1. GitHub CLI authentication: `gh auth status`
2. Correct OAuth scope:
   - Personal: `gh auth refresh -h github.com -s user`
   - Organization: `gh auth refresh -h github.com -s read:org`

If billing shows "unavailable":
- Check: `gh auth status`
- Add scope: `gh auth refresh -h github.com -s user`
- Wait a few minutes for billing to cache
- For org billing, verify you have `read:org` permission

This is **not an error**. Live session data works independently.

## Troubleshooting

### Canvas won't load

**Problem:** Copilot CLI/Chat can't open the extension

**Solution:**
1. Check syntax: `node -c .github/extensions/copilot-app-cost/extension.mjs`
2. Verify package.json: `cat .github/extensions/copilot-app-cost/package.json`
3. Restart Copilot: `exit` then `copilot` again
4. Try from a different directory or scope

### Live metrics show "unavailable"

**Problem:** Canvas shows "No active session metrics available"

**Solution:**
1. Create an active Copilot conversation in your editor
2. Make a Copilot request (code completion, chat, etc.)
3. Wait 2–10 seconds for data to refresh
4. Watch the "Last Refresh" timestamp

### Billing shows "unavailable" or "permission denied"

**Problem:** Can't see official GitHub billing

**Solution:**
1. Verify: `gh auth status`
2. Add scope: `gh auth refresh -h github.com -s user`
3. For org: `gh auth refresh -h github.com -s read:org`
4. Check Diagnostics tab for specific error

### Settings don't persist

**Problem:** Settings reset when canvas reloads

**Solution:**

Settings are stored at:
- **Windows:** `%LOCALAPPDATA%\copilot-app-cost\settings.json`
- **macOS:** `~/Library/Application Support/copilot-app-cost/settings.json`
- **Linux:** `~/.local/state/copilot-app-cost/settings.json`

If corrupted, delete the file (defaults will be restored).

### Canvas is blank or shows errors

**Problem:** Canvas loads but displays nothing

**Solution:**
1. Check **Diagnostics** tab for error messages
2. Look at provider status (Live, Billing, Sessions)
3. Click "Refresh" buttons to retry
4. Check browser console (Ctrl+Shift+I)
5. Verify lib files exist: `ls .github/extensions/copilot-app-cost/lib/`

## Development

### Run Tests

```bash
npm test                    # All 88 tests
npm test -- cost.test.mjs   # Specific test file
```

### Dev Setup

```bash
./scripts/dev-setup.sh
```

Installs/verifies prerequisites.

### Code Structure

```
.github/extensions/copilot-app-cost/
├── extension.mjs            # Canvas entry (6 KB)
├── package.json             # Metadata
├── artifacts/
│   └── dashboard.json       # State schema
└── lib/
    ├── cost.mjs             # Cost calculations
    ├── billing.mjs          # GitHub API
    ├── history.mjs          # Session parser
    └── settings.mjs         # Settings
```

## Canvas Capabilities

The extension exposes 6 agent-callable capabilities:

- `refresh-live`: Fetch active session metrics
- `refresh-billing`: Fetch GitHub billing
- `refresh-sessions`: Fetch local session history
- `update-settings`: Save preferences
- `update-ui`: Update UI state
- `export-data`: Export normalized JSON

Agent can call these to update the canvas in real-time.

## Documentation

- **User Guide:** [`docs/USER_GUIDE.md`](USER_GUIDE.md) — How to read the dashboard
- **API Reference:** [`docs/API.md`](API.md) — All capabilities explained
- **FAQ:** [`docs/FAQ.md`](FAQ.md) — Common questions
- **Security & Privacy:** [`docs/SECURITY.md`](SECURITY.md) — Data handling

## Notes

- **No HTTP server**: Canvas runs directly in Copilot App (CLI, VS Code, GitHub.com)
- **No external dependencies**: Only Node.js built-ins
- **No token storage**: Credentials never saved
- **No prompt access**: Prompts, code, transcripts never read or persisted
- **Read-only**: All data sources are read-only (no mutations)
- **88 tests passing**: All unit, integration, and edge-case tests pass

---

**Ready to use.** Questions? See [`FAQ.md`](FAQ.md) or [`SECURITY.md`](SECURITY.md).

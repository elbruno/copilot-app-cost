# Installation and Setup

## Prerequisites

- **Copilot CLI** (v1.0.64+) with active session
- **`gh` CLI** (v2.95.0+) with GitHub authentication
- **Node.js** (v18+) — for running tests
- **Windows/macOS/Linux** — tested on Windows_NT

## How the Extension Works

`copilot-app-cost` is a **project-scoped Canvas extension**. It is automatically loaded and started by the Copilot CLI when you open a session in this repository — no manual installation needed.

The extension:
1. Starts a local HTTP server on a random port
2. Auto-opens a Canvas instance with the dashboard UI
3. Polls live session metrics, local session history, and GitHub billing data
4. Provides 13 agent-callable actions for cost analysis

## First Run

After cloning the repository, open a Copilot session in any active project context:

```bash
copilot
```

The Canvas dashboard will open automatically. You should see:
- **LIVE ESTIMATE** — active session cost (refreshes every 2–10 seconds)
- **LOCAL SESSIONS** — recent completed sessions from `~/.copilot/session-state/`

## Unlock GitHub Billing Reads

To see official GitHub billing data in the **GITHUB BILLING** section, grant the `user` OAuth scope to your GitHub token:

```bash
gh auth refresh -h github.com -s user
```

Verify the new scope:

```bash
gh auth status
```

You should see `user` in the **Scopes** list.

**Note:** Organization billing requires `read:org` scope and your organization's Copilot usage to be enabled for billing export.

## Run Tests

Unit tests are included for cost calculations, billing normalization, and settings validation:

```bash
npm test
```

All 67 tests should pass (cost, billing, settings modules).

## Configuration

Settings are stored locally in your app data directory:
- **Windows:** `%LOCALAPPDATA%\copilot-app-cost\settings.json`
- **macOS:** `~/Library/Application Support/copilot-app-cost/settings.json`
- **Linux:** `~/.local/state/copilot-app-cost/settings.json`

You can adjust from the Canvas **Settings** tab:
- Live refresh interval (2–10 seconds)
- Session history refresh interval (10–300 seconds)
- Billing refresh interval (1–60 minutes)
- Alert thresholds (session cost, monthly usage %)
- Billing scope (user or organization)
- Cost calculation options (e.g., bill reasoning tokens)

## Troubleshooting

### Canvas doesn't open
- Check that you have an active Copilot session (`copilot` command)
- Check the extension logs: `~/.copilot/logs/extensions/project-copilot-app-cost-*.log`

### LIVE ESTIMATE shows $0.00
- Internal Copilot models (e.g., `chamomile`) don't expose token counts
- Switch to a premium model (GPT-5, Claude, Gemini) to see cost data

### GITHUB BILLING shows "missing-user-scope"
- Run `gh auth refresh -h github.com -s user`
- Restart your Copilot session

### GITHUB BILLING shows "managed-license-or-no-personal-usage"
- Your Copilot usage is managed by an organization
- Switch **Billing Scope** to **organization** in Settings and enter the org name

## Key Files

- **Extension entrypoint:** `.github/extensions/copilot-app-cost/extension.mjs`
- **Cost calculations:** `.github/extensions/copilot-app-cost/lib/cost.mjs`
- **GitHub Billing API:** `.github/extensions/copilot-app-cost/lib/billing.mjs`
- **Local session history:** `.github/extensions/copilot-app-cost/lib/history.mjs`
- **Settings persistence:** `.github/extensions/copilot-app-cost/lib/settings.mjs`
- **Dashboard UI:** `.github/extensions/copilot-app-cost/assets/index.html`

## Data Privacy & Security

- **No tokens are stored** — GitHub credentials come from `gh` CLI
- **No prompts, code, or transcripts** are read or persisted
- **Read-only** — the extension never mutates GitHub billing or Copilot settings
- **Local HTTP only** — the server binds to `127.0.0.1` only

For complete security and scope details, see `docs/data-sources.md` and `.github/copilot-instructions.md`.

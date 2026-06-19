# Frequently Asked Questions

## General

### What is copilot-app-cost?
It's a GitHub Copilot Canvas extension that shows you real-time and historical AI-credit costs from your Copilot usage and official GitHub billing data in one place.

### Does it work with Copilot Pro, Pro+, Max, Business, or Enterprise?
Yes—all personal plans (Pro, Pro+, Max) and organization plans (Business, Enterprise) are supported.

### Can I use it with GitHub.com and GitHub Enterprise?
Currently, it works with GitHub.com. GitHub Enterprise support would require configuring custom API endpoints.

---

## Installation & Setup

### Do I need to install anything?
No. The extension is project-scoped and auto-loads when you open a Copilot session in this repository.

### I don't see the Canvas dashboard.
1. Verify you have an active Copilot session (`copilot` command)
2. Check that the extension loaded by looking at `~/.copilot/logs/extensions/project-copilot-app-cost-*.log`
3. If there's an error, share the log details

### The Canvas opened but shows "no data".
- **LIVE ESTIMATE:** You may be using an internal Copilot model (e.g., `chamomile`) that doesn't expose costs. Try a premium model.
- **LOCAL SESSIONS:** No completed sessions found. Run a few sessions first.
- **GITHUB BILLING:** You likely need to grant the `user` scope. Run `gh auth refresh -h github.com -s user`.

---

## Data & Billing

### Why is LIVE ESTIMATE different from GITHUB BILLING?
They measure different things:
- **LIVE ESTIMATE** = estimated cost of your current session only (token-rate or AIU-based)
- **GITHUB BILLING** = official, final cost of all your usage this month (from GitHub)

Estimates are always lower and are calculated differently. Use GitHub Billing for actual charges.

### Will this help me understand my GitHub bill?
Yes! GitHub Billing shows the official totals by model. The User Guide explains how to interpret it. But for per-session analysis, use the Local Sessions tab.

### Can I export my data?
Yes. Use the **Export JSON** button in the Canvas to download a snapshot of all current data.

### Why is my organization's personal billing empty?
If your organization manages Copilot usage and billing for you, individual billing is empty. Switch **Billing Scope** to **organization** in Settings and enter your org name.

### What if I'm in multiple organizations?
You can only view one org at a time via the Settings. Switch the **Org Account** field to view a different org's billing.

---

## Costs & Calculations

### Why does my session show $0.00?
Possible reasons:
1. You haven't used any premium AI models yet (only internal Copilot models like `chamomile`)
2. The session is very new and metrics haven't been populated
3. Metric data is unavailable (rare; check Diagnostics)

### How are costs calculated?
Two ways (in order of preference):
1. **Direct AIU:** If the Copilot SDK reports `totalNanoAiu`, cost = nanoAIU / 1,000,000,000 * $0.01
2. **Token-Rate Estimate:** Otherwise, cost is estimated from token counts using published model rates

The dashboard labels which method was used.

### What about cache savings?
Cached input tokens cost 10% of uncached input. The token counts show cached vs. uncached separately, and the cost calculation reflects the savings.

### Do you bill for reasoning tokens (Claude)?
By default, no. But you can enable billing for reasoning tokens in **Settings** > **Bill Reasoning Tokens**.

### What's a "long-context" tier?
Some models (GPT-5.5, Claude Opus) have higher rates when you exceed a token threshold (e.g., > 272,000 input tokens). The "long-context" tier applies automatically based on your token usage.

---

## Settings & Customization

### Can I set alerts?
Yes. Go to **Settings** and set thresholds for:
- Session cost (alert if this session exceeds $X)
- Monthly usage % (alert if usage exceeds X% of your allowance)
- Monthly cost (alert if billing hits $X)

### Can I change the refresh frequency?
Yes, in **Settings**:
- **Live Refresh:** 2–10 seconds (how often live session updates)
- **Session History Refresh:** 10–300 seconds (how often local sessions are rescanned)
- **Billing Refresh:** 1–60 minutes (how often GitHub Billing is fetched)

### Where are my settings stored?
Locally in your app data directory (never synced):
- **Windows:** `%LOCALAPPDATA%\copilot-app-cost\settings.json`
- **macOS:** `~/Library/Application Support/copilot-app-cost/settings.json`
- **Linux:** `~/.local/state/copilot-app-cost/settings.json`

### Can I reset settings?
There's a **Reset Settings** button in the Settings tab. This will restore all defaults.

---

## Diagnostics & Troubleshooting

### What's in the Diagnostics tab?
Health status of three data providers:
- **Live:** Session metric polling
- **Billing:** GitHub Billing API access
- **Sessions:** Local session history scanning

Each shows status, last attempt time, any errors, and data freshness.

### I see "missing-user-scope".
Fix: `gh auth refresh -h github.com -s user`

Then restart your Copilot session.

### I see "rate-limited".
GitHub API rate limit hit. Wait a minute and try refreshing. Billing data is cached for 5 minutes minimum.

### I see "managed-license-or-no-personal-usage".
Your organization covers your Copilot billing. Personal billing data is empty (expected). Switch to **organization** scope in Settings if you have access.

### Extension crashes or logs errors.
Share the extension log file: `~/.copilot/logs/extensions/project-copilot-app-cost-*.log`

---

## Privacy & Security

### Does this extension access my prompts or source code?
No. It only reads:
- Session metrics (token counts, model names, costs)
- Local session event files (if they contain metrics)
- GitHub Billing API (official usage data)

Prompts, source code, transcripts, and chat history are never accessed or stored.

### Where is my GitHub token stored?
Nowhere. Authentication comes from your `gh` CLI. The extension calls `gh api` with fixed arguments (no shell interpolation).

### Can this extension modify my GitHub settings or billing?
No. All operations are read-only. It cannot:
- Change billing settings
- Modify budget policies
- Update organization settings
- Mutate Copilot preferences

### What if I revoke access?
The extension will show clear error messages explaining what permission is needed. No data is stored or cached beyond the current session.

---

## Performance & Limits

### Will this slow down my Copilot session?
No. The extension runs in a separate process and polls data asynchronously. Session responsiveness is unaffected.

### How much data does it store?
Settings and recent session history are stored locally (~few MB max). No cloud syncing.

### Can I run multiple instances?
Yes. Each Copilot session gets its own Canvas instance.

### Is there a history limit?
Local sessions display the 20 most recent. Older sessions are still in `~/.copilot/session-state/` but not listed.

---

## Contributing & Development

### I want to report a bug.
Please open an issue with:
- Your OS and Copilot CLI version (`copilot --version`)
- The error from `~/.copilot/logs/extensions/project-copilot-app-cost-*.log`
- Steps to reproduce

### I want to add a feature.
See `docs/CONTRIBUTING.md` (if it exists) or open a discussion first.

### How do I run the extension in dev mode?
See `docs/INSTALL.md` under "Developer Setup".

---

## Still have questions?
Check:
- `docs/USER_GUIDE.md` — how to read the dashboard
- `docs/API.md` — what actions and endpoints are available
- `docs/data-sources.md` — where each data point comes from
- `docs/SECURITY.md` — detailed security & privacy info

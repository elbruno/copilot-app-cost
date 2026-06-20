# copilot-app-cost

Monitor AI-credit usage from your active GitHub Copilot session and official GitHub billing.

## Quick Start (recommended) ⚡

Use the **repo extension** path (most reliable in Copilot App):

1. Open **GitHub Copilot App** in this repository session.
2. Click **Add to panel...**.
3. Click **Import canvas from repo**.
4. Select extension: **copilot-app-cost** (`.github/extensions/copilot-app-cost`).

The canvas appears in the right panel and shows real-time AI-credit costs.

## What It Shows

- **Live Metrics**: Real-time session cost (model, tokens, credits, USD)
- **Official Billing**: Your GitHub AI-credit usage
- **Session History**: Cost of past sessions from local storage
- **Settings**: Refresh rates, alert thresholds, billing scope
- **Diagnostics**: Provider status and debug info

## Documentation

- **Install & Setup:** [`docs/INSTALL.md`](docs/INSTALL.md) — 1-minute setup guide
- **User Guide:** [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — How to read the dashboard
- **API Reference:** [`docs/API.md`](docs/API.md) — Canvas capabilities
- **FAQ:** [`docs/FAQ.md`](docs/FAQ.md) — Common questions
- **Security & Privacy:** [`docs/SECURITY.md`](docs/SECURITY.md) — Data handling

## Key Features

✅ Real-time session cost (live metrics)  
✅ Official GitHub billing data  
✅ Local session history  
✅ Configurable settings (refresh rates, alerts)  
✅ No token storage, no prompt access  
✅ Read-only, safe for agent use  
✅ 88 tests passing  

## Setup

```bash
# 1. Open GitHub Copilot App (VS Code, GitHub.com, or CLI)
# 2. Click: Add to panel → Import canvas from repo
# 3. Select: .github/extensions/copilot-app-cost
# 4. (Optional) For billing: gh auth refresh -h github.com -s user
```

---

**Questions?** See [`docs/INSTALL.md`](docs/INSTALL.md) or [`docs/FAQ.md`](docs/FAQ.md)

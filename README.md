# copilot-app-cost

Monitor AI-credit usage from your active GitHub Copilot session and official GitHub billing.

## Quick Start (1 minute) ⚡

Open **GitHub Copilot App** → Click **"Add to panel..."** → **"Import canvas from gist/URL"** → Paste:

```
https://gist.github.com/elbruno/43fa7650da08f976d6347492c8af9241
```

**Done!** Canvas shows real-time AI-credit costs.

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
# 2. Click: Add to panel → Import canvas from gist/URL
# 3. Paste the gist URL above
# 4. (Optional) For billing: gh auth refresh -h github.com -s user
```

---

**Questions?** See [`docs/INSTALL.md`](docs/INSTALL.md) or [`docs/FAQ.md`](docs/FAQ.md)

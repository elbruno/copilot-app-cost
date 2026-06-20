# Installation: copilot-app-cost Canvas

A GitHub Copilot App Canvas extension for monitoring AI-credit usage.

## 1-Minute Setup ⚡

### Step 1: Open GitHub Copilot App

Open **GitHub Copilot App** in VS Code, GitHub.com, or Copilot CLI.

Click **"Add to panel..."** → **"Import canvas from gist/URL"**

### Step 2: Paste the Gist URL

Paste the full gist URL:
```
https://gist.github.com/elbruno/43fa7650da08f976d6347492c8af9241
```

(You can also try just the gist ID: `43fa7650da08f976d6347492c8af9241`, but the full URL is more reliable)

Click **Import**. ✅ Canvas opens in your panel!

### Step 3: (Optional) Add GitHub Billing

To see official billing data:

```bash
gh auth refresh -h github.com -s user
```

---

## What You'll See

- **Live Metrics** — Real-time cost from your active Copilot session (updates every 2–10 sec)
- **Official Billing** — Your GitHub AI-credit usage
- **Session History** — Cost of past sessions from `~/.copilot/session-state/`
- **Settings** — Refresh rates, alert thresholds, billing scope
- **Diagnostics** — Provider status and debug info

## Billing (Optional)

### Personal Billing (Default)

```bash
gh auth refresh -h github.com -s user
```

### Organization Billing

```bash
gh auth refresh -h github.com -s read:org
```

## Troubleshooting

### Canvas won't import ("No results found" or "missing `copilot-extension.json`")

- **Try the full gist URL** instead of just the gist ID: `https://gist.github.com/elbruno/43fa7650da08f976d6347492c8af9241`
- **Clear the cache** in your Copilot App:
  - Restart GitHub Copilot (close and reopen VS Code / the Copilot CLI / GitHub.com)
  - Try the import again
- **Check internet connection** — the import needs to download the gist
- **Verify the gist is public** at https://gist.github.com/elbruno/43fa7650da08f976d6347492c8af9241

### Canvas imports but shows "unavailable" for all metrics

- **For live session metrics**: Start an active Copilot conversation and make a request (code completion, chat message)
- **For GitHub billing**: Run `gh auth refresh -h github.com -s user` and wait a few seconds for data to load

### Settings don't persist

Settings are stored locally at:
- **Windows:** `%LOCALAPPDATA%\copilot-app-cost\settings.json`
- **macOS:** `~/Library/Application Support/copilot-app-cost/settings.json`
- **Linux:** `~/.local/state/copilot-app-cost/settings.json`

Delete the file if corrupted (defaults will be restored).

---

## Documentation

- **User Guide:** [docs/USER_GUIDE.md](USER_GUIDE.md)
- **API Reference:** [docs/API.md](API.md)
- **FAQ:** [docs/FAQ.md](FAQ.md)
- **Security:** [docs/SECURITY.md](SECURITY.md)

**All set!** 🎉

# Installation: copilot-app-cost Canvas

A GitHub Copilot App Canvas extension for monitoring AI-credit usage.

## 1-Minute Setup ⚡

### Step 1: Open GitHub Copilot App

Open **GitHub Copilot App** in VS Code, GitHub.com, or Copilot CLI.

Click **"Add to panel..."** → **"Import canvas from gist/URL"**

### Step 2: Paste the Gist URL

```
https://gist.githubusercontent.com/elbruno/43fa7650da08f976d6347492c8af9241/raw/extension.mjs
```

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

### Canvas won't import

- Try pasting the URL again
- Restart your Copilot App
- Check browser console (Ctrl+Shift+I) for errors

### Live metrics show "unavailable"

- Create an active Copilot conversation
- Make a Copilot request (code completion, chat)
- Wait 2–10 seconds for metrics to populate

### Billing shows "permission denied"

- Run `gh auth status` to verify login
- Add scope: `gh auth refresh -h github.com -s user`
- Wait a few minutes for cache to update

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

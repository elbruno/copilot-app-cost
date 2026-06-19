# Screenshots & Installation Guide: copilot-app-cost Canvas

This guide explains how to install the Canvas extension locally and take screenshots to document the dashboard.

## Important Note

The `copilot-app-cost` extension is now a proper **Canvas extension** for the GitHub Copilot App. It does NOT run as an HTTP server anymore. Instead, it opens directly in:

- GitHub Copilot CLI side panel
- VS Code Copilot Chat side panel
- GitHub.com Copilot Chat side panel

To see the Canvas and take screenshots, you need to have an active Copilot environment set up.

## Installation Steps for Screenshot Capture

### 1. Clone the Repository

```bash
git clone https://github.com/elbruno/copilot-app-cost.git
cd copilot-app-cost
```

### 2. Set Up GitHub Authentication

```bash
# Verify you're authenticated
gh auth status

# Add user scope for billing data
gh auth refresh -h github.com -s user

# Optional: Add org scope for organization billing
gh auth refresh -h github.com -s read:org
```

### 3. Choose Your Environment

#### Option A: GitHub Copilot CLI (Recommended for Clearest Screenshots)

```bash
# Verify Copilot CLI is installed (v1.0.64+)
copilot --version

# Start a session
copilot
```

In the Copilot CLI prompt:

```
Load the canvas extension at .github/extensions/copilot-app-cost
```

The Canvas will open in the right side panel.

#### Option B: VS Code Copilot Chat

1. Ensure GitHub Copilot Chat extension is installed
2. Open VS Code in the `copilot-app-cost` directory
3. Open Copilot Chat (Ctrl+Shift+I or Cmd+Shift+I)
4. Ask Copilot to load the extension:

```
Use the canvas at .github/extensions/copilot-app-cost for monitoring AI-credit usage
```

5. Canvas appears in the right side panel

#### Option C: GitHub.com

1. Open your repo on GitHub.com
2. Start a Copilot Chat conversation
3. Ask Copilot to load the extension:

```
load .github/extensions/copilot-app-cost canvas
```

## What to Capture in Screenshots

Once the Canvas is open, take screenshots of each tab/section below:

### 1. Overview Tab (Main Dashboard)

**What to capture:**
- Title: "Copilot App Cost"
- Three main cards:
  - LIVE ESTIMATE: Session cost (model, tokens, AI credits, USD)
  - GITHUB BILLING: Official billing data
  - LOCAL SESSIONS: Recent completed sessions
- Provider status badges (Live, Billing, Sessions)
- Last refresh timestamps

**Suggested filename:** `01-overview-tab.png`

### 2. Live Session Details

**What to capture:**
- Model name
- Token breakdown (input, output, cached)
- AI credits and USD cost
- Calculation method (direct AIU or token-rate estimate)
- Per-model breakdown table
- Auto-refresh countdown

**Suggested filename:** `02-live-session-tab.png`

### 3. Official GitHub Billing

**What to capture:**
- Billing scope selector (user / organization)
- Account name field
- Billing data table:
  - Model names
  - Usage quantities
  - Cost per unit
  - Total cost
- Refresh button and timestamp

**Suggested filename:** `03-billing-tab.png`

### 4. Local Sessions History

**What to capture:**
- List of completed sessions
- For each session:
  - Session ID
  - Model used
  - Start time
  - Duration / Last activity
  - Estimated AI credits
  - Estimated USD cost
- Session detail expansion (click to expand)
- Load more button (if applicable)

**Suggested filename:** `04-sessions-history-tab.png`

### 5. Settings Tab

**What to capture:**
- Refresh intervals (Live, Billing, Sessions)
- Billing scope selector
- Alert threshold settings
- Bill reasoning tokens toggle
- Save/Reset buttons
- Settings persistence note

**Suggested filename:** `05-settings-tab.png`

### 6. Diagnostics Tab

**What to capture:**
- Extension version
- Provider status (Live, Billing, Sessions)
- Last attempt / success / error for each
- Local cache paths (Windows, macOS, Linux examples if available)
- GitHub API version
- No sensitive data should be visible

**Suggested filename:** `06-diagnostics-tab.png`

### 7. Error States (Optional but helpful)

**What to capture:**
- Canvas with no active Copilot session (live metrics unavailable)
- Canvas with billing permission error (auth scope missing)
- Canvas with network error (provider offline)
- Canvas loading state (spinner/skeleton screens)

**Suggested filenames:**
- `error-no-session.png`
- `error-no-billing-auth.png`
- `error-network.png`
- `loading-state.png`

## Creating Documentation with Screenshots

### Step 1: Create Screenshot Directory

```bash
mkdir -p docs/screenshots
```

### Step 2: Save Screenshots

Place all PNG files in `docs/screenshots/` with consistent naming.

### Step 3: Update USER_GUIDE.md

Add an "Visual Walkthrough" section with markdown image references:

```markdown
## Visual Walkthrough

### Overview Tab
![Overview tab showing live session cost, billing summary, and session history](../screenshots/01-overview-tab.png)

### Live Session Details
![Live session tab with model, tokens, and per-model cost breakdown](../screenshots/02-live-session-tab.png)

### GitHub Billing
![Billing tab showing official AI-credit usage and cost](../screenshots/03-billing-tab.png)

### Sessions History
![Sessions tab with completed sessions and estimated costs](../screenshots/04-sessions-history-tab.png)

### Settings
![Settings tab with refresh intervals and alert configuration](../screenshots/05-settings-tab.png)

### Diagnostics
![Diagnostics tab with provider status and system information](../screenshots/06-diagnostics-tab.png)
```

### Step 4: Update INSTALL.md

Add screenshots to the "First Run" section showing:
- How to open the Canvas in each environment
- What to expect after opening
- Where to find key features

### Step 5: Commit Screenshots

```bash
git add docs/screenshots/
git commit -m "docs: Add Canvas dashboard screenshots

- 6 main tab screenshots (Overview, Live, Billing, Sessions, Settings, Diagnostics)
- Screenshots show Canvas in GitHub Copilot CLI environment
- Images demonstrate all key features and data sources

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push
```

## Quick Test Checklist

Before taking final screenshots, verify:

- [ ] Canvas opens without errors
- [ ] Live metrics appear (or show "unavailable" gracefully)
- [ ] GitHub billing is accessible (or shows permission error clearly)
- [ ] Local sessions populate (at least 1 session available)
- [ ] All tabs are clickable and responsive
- [ ] Settings persist after toggle
- [ ] Export button works (downloads JSON)
- [ ] Refresh buttons update data

## Verifying Everything Works

```bash
# 1. Run all tests
npm test

# 2. Check syntax
node -c .github/extensions/copilot-app-cost/extension.mjs

# 3. Verify all files exist
ls -R .github/extensions/copilot-app-cost/

# 4. Verify documentation
ls docs/*.md
```

## Next Steps After Screenshots

1. **Commit screenshots** to GitHub with proper attribution
2. **Update USER_GUIDE.md** with visual walkthrough
3. **Update INSTALL.md** with screenshot references
4. **Create QUICK_START.md** with screenshot-based tutorial
5. **Consider adding screen-recording** of Canvas interactions (optional)

## Notes

- Ensure no sensitive data is visible in screenshots (tokens, auth details, etc.)
- Blur or redact any personal usernames if needed
- Show both success states and error states for completeness
- Include system UI (VS Code title bar, Copilot Chat header) for context
- Use consistent crop/sizing for professional appearance
- Ensure text is readable at 1x zoom

---

Once screenshots are captured and committed, the documentation will be **complete and production-ready** with visual aids for users.

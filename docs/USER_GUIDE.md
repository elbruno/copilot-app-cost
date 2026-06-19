# User Guide

## Overview

The `copilot-app-cost` Canvas dashboard shows you three independent data sources about AI-credit and USD costs:

1. **LIVE ESTIMATE** — Real-time costs from your active Copilot session
2. **LOCAL SESSIONS** — Completed sessions stored on your computer
3. **GITHUB BILLING** — Official monthly costs from GitHub

This guide explains what each section shows and how to interpret the numbers.

---

## LIVE ESTIMATE

This is a **real-time estimate** of what your current Copilot session has cost so far.

### What it shows

| Field | Meaning |
|-------|---------|
| **Status** | `available` = session is active; `unavailable` = Copilot not running |
| **Current Model** | The AI model being used right now |
| **Total Cost** | Estimated USD cost of your session (updates every 2–10 seconds) |
| **Total AI Credits** | Same cost expressed in GitHub's AI credit units (1 credit = $0.01) |
| **Requests** | How many times you've called the AI |
| **Total Tokens** | Total input + output tokens sent/received (for transparency) |

### Why it's an estimate

The live estimate can be calculated two ways:

- **Direct AIU** — Copilot SDK reports the actual `totalNanoAiu` value. This is the most accurate.
- **Token-Rate Estimate** — If AIU data isn't available, cost is estimated from token counts using published model rates. This is less accurate because:
  - Token rates may not match what GitHub actually charges
  - Caching and other factors aren't modeled perfectly
  - Reasoning tokens may or may not be billed (configurable in Settings)

The dashboard clearly labels which method was used under "Calculation Method".

### Model Breakdown

The "Model Breakdown" section shows how much each AI model contributed to your session cost. For example:

| Model | Requests | Cost | Method |
|-------|----------|------|--------|
| gpt-5-mini | 3 | $0.05 | token-rate-estimate |
| claude-sonnet-4.6 | 1 | $0.15 | copilot-aiu |

If you see $0.00 for a model, it might be:
- An internal Copilot model (e.g., `chamomile`) that doesn't expose token counts
- A session with no usage yet
- A cached response (some cached input is cheaper)

### Remaining Allowance

If you're on a **personal plan** (Pro, Pro+, Max), you have a monthly AI credit allowance. The dashboard shows:

- **Included Credits** — Your plan's monthly budget
- **Used So Far** — Credits used this month (from GitHub Billing)
- **Remaining** — Credits left

**Note:** If you're on a **pooled plan** (Business, Enterprise) or your usage is managed by an organization, this section won't show a remaining allowance—those credits are shared across your organization.

### Why is it different from GitHub Billing?

Live estimates are always lower than GitHub Billing because:
- GitHub Billing is **official and final** (includes all sessions, discounts, etc.)
- Live Estimate is **for this session only** (doesn't include other parallel sessions)
- Different rounding and calculation methods may apply
- GitHub Billing includes enterprise adjustments and applied discounts

**Never use the Live Estimate to check if you've exceeded your budget.** Always check GitHub Billing instead.

---

## LOCAL SESSIONS

This section shows completed Copilot sessions from the last 30 days (configurable in Settings).

### What it shows

A table of recent sessions with:

| Field | Meaning |
|-------|---------|
| **Repository** | Git repo name (if available) |
| **Duration** | How long the session ran |
| **Cost** | Estimated USD cost of the session |
| **Top Model** | Which AI model was used most |
| **Requests** | Total requests in the session |

### How it works

Copilot CLI automatically saves session data to `~/.copilot/session-state/<session-id>/events.jsonl`. The dashboard reads these files to show you historical costs.

### Limitations

- Only sessions with recorded usage metrics appear
- Costs are estimates (same caveats as Live Estimate)
- Deleted session files are not recoverable
- Very recent sessions may not appear immediately (refresh every 30 seconds)

---

## GITHUB BILLING

This is your **official, authoritative** usage from GitHub's billing system.

### What it shows

| Field | Meaning |
|-------|---------|
| **Status** | `authorized` = data loaded; `missing-user-scope` = requires `gh` auth fix; `no-data` = no usage this month |
| **Scope** | `user` (personal) or `organization` (shared team budget) |
| **Time Period** | Year and month being displayed |
| **Total Usage** | Official total AI credits used (from GitHub) |
| **Total Cost** | Official USD amount charged |
| **Usage by Model** | Breakdown of which models were used |

### How to enable it

1. Run: `gh auth refresh -h github.com -s user`
2. Verify: `gh auth status` (should show `user` scope)
3. Reload the Canvas dashboard

If you're in an organization with shared billing:
1. Go to **Settings** in the Canvas
2. Change **Billing Scope** to **organization**
3. Enter your organization name

### What's NOT in GitHub Billing

- Per-session breakdown (only monthly totals)
- Real-time updates (data is final only after month closes)
- Intra-month costs until month ends (may be incomplete)
- Discounts or refunds (those appear in your billing portal separately)

### Why might it be zero or empty?

- **No usage this month** — You haven't used premium models yet
- **Managed billing** — Your organization covers Copilot costs; personal billing is empty
- **Wrong scope** — You're looking at user data when you should look at organization data

---

## SETTINGS

Customize how the dashboard behaves:

| Setting | Default | Range | Effect |
|---------|---------|-------|--------|
| **Live Refresh** | 2 sec | 2–10 sec | How often live session cost updates |
| **Session History Refresh** | 30 sec | 10–300 sec | How often local session list refreshes |
| **Billing Refresh** | 5 min | 1–60 min | How often GitHub Billing data is fetched |
| **Billing Scope** | User | user/org | Switch between personal and organization billing |
| **Org Account** | (blank) | text | Organization name (if using org billing) |
| **Bill Reasoning Tokens** | Off | on/off | Count Claude reasoning tokens as billable output |
| **Alerts** | (none) | thresholds | Alert if session cost or monthly % exceeds threshold |
| **Diagnostics** | On | on/off | Show detailed error and status info |

### Alert Examples

- **Session Cost Alert:** Set to $2 to be notified when this session hits $2
- **Monthly % Alert:** Set to 80 to be notified when you've used 80% of monthly allowance
- **Monthly $ Alert:** Set to $100 to be notified when you've spent $100 this month

---

## DIAGNOSTICS

If something looks wrong, check the **Diagnostics** section. It shows:

| Item | What it means |
|------|---------------|
| **Provider Status** | Health of each data source (live, billing, sessions) |
| **Last Attempt** | When we last tried to fetch data |
| **Last Error** | Any error messages (often actionable) |
| **Data Freshness** | How old the current data is |
| **Extension Version** | Your installed version |

### Common Diagnostics Messages

| Message | Fix |
|---------|-----|
| `missing-user-scope` | Run `gh auth refresh -h github.com -s user` |
| `managed-license-or-no-personal-usage` | Use org scope in Settings if your billing is org-managed |
| `not-found-or-no-billed-usage` | Check your organization settings in GitHub; personal billing may be empty if org covers it |
| `rate-limited` | Wait a minute and refresh (GitHub API rate limit hit) |
| `server-error` | GitHub is having issues; try again in a moment |

---

## Tips & Tricks

1. **Export your data:** Use the **Export JSON** button to download a snapshot of all current metrics for analysis or record-keeping.

2. **Set realistic alerts:** Alert thresholds are per-session or per-month. Personal plans typically have 1,500–20,000 credits/month.

3. **Compare estimates to billing:** At month-end, compare your Live Estimate totals to GitHub Billing to understand the difference. Discrepancies are normal due to rounding, discounts, and concurrent sessions.

4. **Track model usage:** Check the Model Breakdown to see which models cost the most. You can switch to cheaper models (e.g., `gpt-5-mini` vs `gpt-5.5`) to save money.

5. **Understand caching:** Cached input tokens cost 10% of uncached input. If you reuse prompts or code context, you'll see lower costs.

6. **Use local sessions for trend analysis:** Run queries across your recent sessions to find patterns (e.g., "Which repos cost the most?").

---

## Questions?

- **Installation/setup:** See `docs/INSTALL.md`
- **Architecture & internals:** See `docs/architecture.md`
- **Data source details:** See `docs/data-sources.md`
- **Common questions:** See `docs/FAQ.md`

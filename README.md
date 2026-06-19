# copilot-app-cost

Project-scoped GitHub Copilot Canvas extension for:
- near-real-time active-session AI-credit and USD estimates
- model and token-bucket breakdowns
- compatible local completed-session history
- official GitHub billing usage for authorized user or organization scopes
- read-only agent-callable cost and usage capabilities

## Location
- Extension: `.github/extensions/copilot-app-cost`
- PRD: `docs/PRD.md`
- Spike results: `docs/spikes/`
- Manual validation: `docs/manual-validation.md`

## Important rules
- `LIVE ESTIMATE` and `GITHUB BILLING` stay separate.
- Unavailable data is shown as unavailable, never zero.
- No prompts, source code, or transcripts are read or persisted.
- Billing access depends on valid GitHub authentication and scope-specific permissions.

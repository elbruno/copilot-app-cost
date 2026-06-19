# copilot-app-cost

Project-scoped GitHub Copilot Canvas extension for:
- near-real-time active-session AI-credit and USD estimates
- model and token-bucket breakdowns
- compatible local completed-session history
- official GitHub billing usage for authorized user or organization scopes
- read-only agent-callable cost and usage capabilities

## Quick Start

See **[`docs/INSTALL.md`](docs/INSTALL.md)** for setup, first run, and troubleshooting.

## Documentation

- **Install & Setup:** [`docs/INSTALL.md`](docs/INSTALL.md)
- **User Guide:** [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- **API Reference:** [`docs/API.md`](docs/API.md)
- **FAQ:** [`docs/FAQ.md`](docs/FAQ.md)
- **Security & Privacy:** [`docs/SECURITY.md`](docs/SECURITY.md)
- **Product Spec:** [`docs/PRD.md`](docs/PRD.md)
- **Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Data Sources:** [`docs/data-sources.md`](docs/data-sources.md)
- **Implementation Plan:** [`docs/implementation-plan.md`](docs/implementation-plan.md)
- **Phase 0 Spike Results:** [`docs/spikes/`](docs/spikes/)

## Location

- Extension: `.github/extensions/copilot-app-cost`

## Important rules
- `LIVE ESTIMATE` and `GITHUB BILLING` stay separate.
- Unavailable data is shown as unavailable, never zero.
- No prompts, source code, or transcripts are read or persisted.
- Billing access depends on valid GitHub authentication and scope-specific permissions.

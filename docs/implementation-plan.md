# Copilot App Cost Implementation Plan

## Authoritative inputs
- `docs/PRD.md` is the product source of truth.
- GitHub Canvas runtime scaffold generated for `.github/extensions/copilot-app-cost` is the runtime contract source of truth.
- Official GitHub billing usage REST documentation defines supported billing endpoints and API version requirements.

## Delivery rule
Do not build the complete dashboard until both Phase 0 spikes are attempted in the real extension/runtime path and their outcomes are documented in `docs/spikes/canvas-session-rpc.md` and `docs/spikes/billing-auth.md`.

## Phase 0 - Repository and runtime spike
### Goals
1. Preserve the generated project-scoped Canvas scaffold.
2. Prove the Canvas can render and refresh in place.
3. Validate whether active-session metrics are reachable from the extension via the real session RPC path.
4. Validate the safest supported billing authentication path.
5. Document blockers honestly when an integration is unavailable.

### Scope
- Add `.github/copilot-instructions.md` from PRD guardrails.
- Keep the generated `createCanvas` / `joinSession` structure in `extension.mjs`.
- Add only minimal code needed for a refreshable Phase 0 spike canvas.
- Prefer read-only probes and local diagnostics.
- Keep fixtures out of the production data path.

### Spike A: Canvas session RPC
#### Attempt order
1. Detect session and runtime capabilities.
2. Attempt `session.rpc.usage.getMetrics()` from the extension-owned runtime path.
3. Normalize only non-sensitive usage metadata needed for diagnostics.
4. Show explicit unavailable/unsupported/error states when metrics are absent.

#### Exit criteria
- Document whether the call works, partially works, or is unavailable.
- Record the tested API name and observed response shape at a high level.
- Record safe fallback behavior.
- Do not claim live integration success unless a real non-fixture response is observed.

### Spike B: Billing authentication
#### Attempt order
1. Inspect whether the runtime exposes reusable auth/account status.
2. Check whether a host-provided authenticated GitHub REST path exists.
3. Attempt a fixed-argument `gh api` adapter using existing GitHub CLI auth.
4. Document environment-token fallback rules without persisting tokens.
5. Keep manual JSON import as the final fallback only.

#### Exit criteria
- Document which method is technically supported.
- Record real results separately from fixture-only behavior.
- Record required permissions and expected failure modes (`401`, `403`, missing managed-license data, etc.).
- Do not store or echo tokens.

## Planned implementation after Phase 0 go/no-go
### Phase 1 - Domain and fixtures
- Domain types, source metadata, staleness, price/plan configuration, pure calculations, tests.

### Phase 2 - Live session MVP
- Session RPC adapter, refresh coordinator, current-session cards, token buckets, diagnostics.

### Phase 3 - Local session history
- Compatible local snapshot reader, completed-session parser, session comparison, privacy-safe history.

### Phase 4 - Official billing
- Personal and organization billing providers, caching, backoff, permission handling, billing views.

### Phase 5 - Agent capabilities and alerts
- Read-only capabilities, local thresholds, JSON export, capability contract tests.

### Phase 6 - Hardening and docs
- Security, privacy, accessibility, cross-platform validation, packaging, README and troubleshooting.

## Technical guardrails
- Never present an estimate as official billing.
- Never merge incompatible scopes.
- Never substitute zero for unavailable data.
- Never persist tokens.
- Never read or persist prompts, source code, or transcripts.
- Never execute arbitrary shell commands.
- Never use fixtures in the production path.
- Never mutate GitHub billing, subscriptions, budgets, policies, or Copilot settings.
- Keep external integrations behind adapters and calculations in pure functions.

## Immediate files
- `docs/implementation-plan.md`
- `.github/copilot-instructions.md`
- `docs/spikes/canvas-session-rpc.md`
- `docs/spikes/billing-auth.md`
- `.github/extensions/copilot-app-cost/extension.mjs` (generated scaffold, then minimal Phase 0 implementation)

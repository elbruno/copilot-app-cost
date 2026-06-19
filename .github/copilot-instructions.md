# Copilot implementation instructions for Copilot App Cost

## Read first
- Read `docs/PRD.md` before proposing or implementing changes.
- Treat `docs/PRD.md` as the authoritative product specification.
- Treat the generated Canvas scaffold under `.github/extensions/copilot-app-cost` as the authoritative runtime contract.

## Phase ordering
- Start with the two technical spikes before the complete dashboard.
- Do not claim a full integration works until it has been attempted through the real Canvas/runtime path and documented.
- If blocked by runtime limitations, stop, document the blocker, and implement only the honest fallback.

## Runtime and API guardrails
- Never fabricate unsupported Canvas APIs, lifecycle events, authentication mechanisms, or host capabilities.
- Do not assume `session.rpc.usage.getMetrics()` is available until proven in the Canvas runtime.
- Preserve the generated Canvas structure and APIs from the scaffold.
- Keep runtime-specific code behind adapters.
- Prefer modern ESM with minimal dependencies.

## Data integrity guardrails
- Keep live estimates and official billing values structurally and visually separate.
- Never present an estimate as official GitHub billing.
- Never combine incompatible scopes.
- Never replace unavailable values with zero.
- Clearly label source, scope, freshness, and confidence.
- Prefer Copilot-reported AI credits over token-rate fallback when available.
- Never use fixture data in the production path.

## Security and privacy guardrails
- Never persist secrets or tokens in source, settings, artifacts, logs, exports, or tests.
- Never read, persist, export, or display prompts, source code, or transcripts.
- Do not use a shell for `gh` execution; if `gh api` is needed, invoke it through a fixed-argument adapter.
- Do not execute arbitrary commands.
- Restrict file access to known Copilot data paths and extension-owned cache paths.
- Validate usernames and organization names before API use.
- Redact authentication and provider errors.
- Do not enable telemetry by default.

## Design and quality guardrails
- Prefer adapters and pure functions.
- Keep calculations pure, versioned, and tested.
- Use effective-dated pricing and plan data.
- Do not label organization pooled credits as an individual allowance.
- Do not retry terminal authorization or not-found errors indefinitely.
- Keep changes small, reviewable, and compatible with the current runtime.
- Update tests and documentation with every externally visible behavior.
- Run validation before declaring a phase complete.

## Required deliverables for Phase 0
- `docs/spikes/canvas-session-rpc.md`
- `docs/spikes/billing-auth.md`
- A minimal refreshable Canvas
- Honest go/no-go findings for session RPC and billing authentication

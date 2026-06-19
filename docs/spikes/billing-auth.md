# Spike B: Billing authentication

## Objective
Validate the supported, safe authentication method for official GitHub billing reads from the Canvas extension context.

## Authoritative references
- `docs/PRD.md`
- GitHub REST billing usage documentation
- Local Copilot SDK auth/session RPC types

## Required endpoint scope
For personal AI-credit usage, the documented endpoint is:
- `GET /users/{username}/settings/billing/ai_credit/usage`

The current REST documentation indicates this may require additional token permission beyond the default CLI scopes.

## Attempt order
1. Host-provided authenticated GitHub API access
2. Fixed-argument `gh api` adapter using existing CLI auth
3. Environment-provided token, never persisted
4. Manual billing JSON import as last resort

## Findings
### 1. Host-provided authenticated GitHub API access
No documented general-purpose GitHub REST client was found in the local Canvas/extension SDK. The SDK does expose `session.rpc.auth.getStatus()` for account metadata, but no authoritative host GitHub billing REST helper was identified in the inspected runtime types.

The live canvas runtime did successfully return auth metadata:
- `isAuthenticated: true`
- `authType: "user"`
- `host: "https://github.com"`
- `login: "elbruno"`
- `copilotPlan: "enterprise"`

**Result:** account identity is available, but not a documented direct REST billing integration path.

### 2. `gh api` using existing authentication
A real baseline probe outside the extension confirmed:
- `gh` is installed
- the active login is `elbruno`
- current token scopes are `gist`, `read:org`, `repo`, `workflow`

The same fixed-argument billing probe was then executed through the live canvas runtime against:
- `GET /users/elbruno/settings/billing/ai_credit/usage`

Observed real result:
- `available: false`
- `result: "failed"`
- `classification: "missing-user-scope"`
- HTTP `404`
- `gh` guidance that the API operation needs the `user` scope

This is a valuable real result: the endpoint was attempted from the extension-backed path, and the current authenticated CLI token is insufficient for personal billing reads.

**Result:** technically viable adapter path, but currently blocked by token scope/authorization.

### 3. Environment token
Not attempted with a real token during Phase 0 because no token should be requested, stored, or persisted automatically.

**Result:** still a potential fallback, but must remain opt-in and ephemeral.

### 4. Manual import
Not implemented in Phase 0. Remains the final fallback for later phases if live billing auth is unavailable.

## Safe adapter requirements
If the extension uses `gh api` later, it must:
- invoke `gh` directly without a shell
- use a fixed endpoint allowlist
- validate usernames and organization names
- pass arguments separately
- set a timeout
- capture stdout/stderr separately
- redact errors
- never log environment variables or tokens

## Go / no-go decision
### Personal billing via current `gh` auth
**No-go for now** with the current local credential scopes.

### Technical path viability
**Go** for a fixed-argument `gh api` adapter as an implementation path, provided the user has the required scopes/permissions.

## Honest product implication
The Canvas must treat official billing as conditionally available. Missing permission must surface as a permission/auth message, not as zero usage and not as a fake successful integration.

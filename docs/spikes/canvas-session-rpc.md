# Spike A: Canvas session RPC access

## Objective
Validate whether the project-scoped Copilot App Cost Canvas can access active-session metrics through the real extension runtime, without inventing unsupported APIs.

## Authoritative references
- `docs/PRD.md`
- GitHub Copilot Canvas documentation
- Local Copilot SDK types at `copilot-sdk/generated/rpc.d.ts`
- Reference implementation: `DamianEdwards/copilot-cli-cost`

## Hypothesis
The extension runtime attached to the foreground session can call `session.rpc.usage.getMetrics()` and surface a safe, read-only subset in the Canvas.

## What was validated before implementation
SDK type inspection confirms an experimental session RPC method:
- `session.rpc.usage.getMetrics()`
- `UsageGetMetricsResult` includes `totalNanoAiu`, `totalUserRequests`, `totalApiDurationMs`, `sessionStartTime`, `currentModel`, `lastCallInputTokens`, `lastCallOutputTokens`, `codeChanges`, and per-model token usage including `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, and optional `reasoningTokens`.

## Phase 0 implementation approach
- Preserve the generated `joinSession({ canvases: [createCanvas(...)] })` scaffold.
- Keep a per-instance local HTTP server owned by the extension.
- Add a read-only JSON endpoint that attempts `session.rpc.usage.getMetrics()` on demand.
- Render a minimal canvas page that refreshes in place and shows:
  - session RPC availability state
  - current model
  - request count
  - reported nano AIU when available
  - token-bucket summary
  - last refresh timestamp
- Do not show prompts, source code, transcript text, or secrets.

## Real integration status
Status: **Validated with a real runtime response**

The project-scoped canvas was reloaded and auto-opened through `session.rpc.canvas.open()`. The canvas-backed local server returned a non-fixture response from `GET /api/status`, which calls `session.rpc.usage.getMetrics()` from the extension runtime.

### Observed runtime result
Observed at runtime on 2026-06-19:
- canvas open succeeded with `availability: "ready"`
- live probe returned `available: true`
- `source: "LIVE ESTIMATE"`
- `scope: "active-session"`
- `freshness: "live"`
- `confidence: "reported"`
- `currentModel: "chamomile"`
- `totalUserRequests: 1`
- `totalPremiumRequestCost: 1`
- `totalNanoAiu: 0`
- `lastCallInputTokens: 36677`
- `lastCallOutputTokens: 149`
- per-model token buckets were present for `inputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `outputTokens`, and `reasoningTokens`

This proves the active Canvas runtime can access real active-session usage metadata through `session.rpc.usage.getMetrics()`.

## Notes and caveats
- The runtime probe reported `canvases: false` in `session.capabilities`, even though the canvas opened successfully. Capability flags therefore should not be treated as the authority for canvas availability.
- `totalNanoAiu` was present but reported as `0` for the observed session snapshot. This must remain a reported value, not be reinterpreted as missing or as official billing.
- These values are live estimates/telemetry for the active session only, not official GitHub billing.

## Expected failure modes
- Method unavailable in another runtime build
- Call throws because the current host/session does not expose usage RPC
- Empty or partial metrics because there is no compatible active usage yet

## Honest fallback if unavailable
- Show `unavailable`, never zero
- Continue supporting local completed-session parsing in later phases
- Document the blocker rather than claiming live support

## Go / no-go decision
**Go** for building the live active-session estimate path on top of `session.rpc.usage.getMetrics()`, with explicit labeling that it is an estimate and with graceful handling for unavailable or partial fields.

# Manual validation

## Prerequisites
- GitHub Copilot CLI with Canvas extension support.
- Project extension reloaded successfully.
- `gh auth status` valid for the account you want to inspect.

## Open the Canvas
1. Open the `copilot-app-cost` Canvas from the current repository session.
2. Confirm the header shows `Copilot App Cost`.
3. Confirm provider badges render for:
   - `LIVE ESTIMATE`
   - `GITHUB BILLING`
   - `LOCAL SESSION`

## Live session checks
1. Trigger a Copilot request in the active session.
2. Return to the Canvas.
3. Confirm the Overview card updates within a few seconds.
4. Confirm Live Session shows:
   - active model
   - AI credits
   - estimated USD
   - token buckets by model
   - raw normalized JSON in diagnostics/details
5. If live credits are unavailable, confirm the UI still shows `TOKEN-RATE FALLBACK` behavior rather than zero.

## Local session history checks
1. Confirm the Sessions tab lists compatible local sessions from `~/.copilot/session-state`.
2. Confirm each row shows session id, model, estimated AI credits, estimated USD, and last activity.
3. Confirm no prompts, source code, or transcripts are displayed.

## Billing checks
### User scope
1. Keep Settings scope as `user`.
2. Confirm the user account defaults to the authenticated login when available.
3. Refresh billing.
4. If the token lacks required scope, confirm the Canvas shows an unavailable/permission state instead of zero.

### Organization scope
1. Set Settings scope to `organization`.
2. Enter an organization name.
3. Refresh billing.
4. Confirm permission failures are clearly scoped to billing and do not hide valid live estimates.

## Settings and export checks
1. Change refresh intervals and save settings.
2. Reload the Canvas and confirm settings persist locally.
3. Set an alert threshold below the current value and confirm a warning appears.
4. Click Export JSON and confirm a normalized JSON download is returned without tokens, prompts, source code, or transcripts.

## Diagnostics checks
1. Open Diagnostics.
2. Confirm it shows:
   - extension version
   - runtime info
   - provider last attempt/success/error state
   - selected billing scope
   - local cache paths
   - billing API version
3. Confirm no secrets or raw authorization headers are displayed.

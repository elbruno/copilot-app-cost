# Product Requirements Document: Copilot App Cost

**Repository:** `copilot-app-cost`  
**Product name:** Copilot App Cost  
**Primary surface:** GitHub Copilot App Canvas extension  
**Document version:** 1.0  
**Status:** Ready for implementation  
**Date:** June 19, 2026  
**Language:** English  

---

## 1. Executive Summary

Copilot App Cost is a project-scoped Canvas extension for the GitHub Copilot App that helps developers understand the cost and AI-credit consumption of their Copilot activity.

The product combines two different classes of information:

1. **Live session estimates** obtained from the active Copilot session or compatible local Copilot session data.
2. **Official billing usage** obtained from GitHub billing APIs at the user, organization, or enterprise level when the authenticated user has the required permissions.

The Canvas must never present an estimate as an official invoice amount. Every value must identify its source, freshness, scope, and confidence.

The MVP will focus on a single developer using the GitHub Copilot App. It will provide a live view of the current session, local session history, official monthly billing data when available, per-model breakdowns, and configurable local alerts.

This is a read-only cost-observability product. It must not change GitHub billing settings, budgets, Copilot policies, subscriptions, models, or organization configuration.

---

## 2. Background and Opportunity

GitHub Copilot usage is increasingly measured through GitHub AI Credits. A long agentic session can consume materially more tokens and credits than a simple chat request, but developers do not always have an immediate, understandable view of that consumption while they work.

The reference project, `DamianEdwards/copilot-cli-cost`, demonstrates that Copilot CLI session metrics can be normalized into an estimated cost and AI-credit view. It reads active-session metrics through the Copilot session RPC API, parses completed local sessions, maintains live snapshots, and presents per-model token buckets and usage estimates.

Reference repository:

https://github.com/DamianEdwards/copilot-cli-cost

GitHub Copilot App Canvas extensions provide an interactive, bidirectional surface in which a human and an agent can operate on shared state. A cost dashboard is a strong fit for this model because the user needs a persistent visual surface, while the agent should also be able to answer questions such as:

- What did this session cost?
- Which model consumed the most credits?
- Why did the last interaction cost more?
- How much official usage has been reported this month?
- Is the billing data stale?
- Which recent sessions were the most expensive?

Official Canvas documentation:

https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions

Official GitHub billing API documentation:

https://docs.github.com/en/rest/billing/usage

Official GitHub usage-reporting guidance:

https://docs.github.com/en/billing/tutorials/automate-usage-reporting

Official AI-credit billing concepts:

https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises

---

## 3. Product Vision

Give every Copilot App user a clear, honest, near-real-time understanding of Copilot consumption without leaving the development workflow.

The Canvas should make cost observable in the same way that a performance dashboard makes latency observable: visible, attributable, explainable, and difficult to misinterpret.

---

## 4. Product Principles

### 4.1 Source transparency

Every number must identify its source:

- `LIVE ESTIMATE`
- `LOCAL SESSION`
- `GITHUB BILLING`
- `CALCULATED FALLBACK`
- `IMPORTED DATA`

### 4.2 Estimate and billing separation

Live estimates and official billing values must be visually and structurally separated. They may be compared, but they must never be silently merged.

### 4.3 Read-only by default and by design

The application may read usage, calculate estimates, store local preferences, and create local alerts. It must not mutate GitHub billing, policies, budgets, subscriptions, organization settings, or Copilot settings.

### 4.4 Graceful degradation

The Canvas must remain useful when one data source is unavailable. It must not invent data or display sample data as real data.

### 4.5 Local-first privacy

User-specific session data and billing snapshots are local runtime data. They must not be committed to the repository or sent to an external service.

### 4.6 Minimal required privileges

The product must request only the permissions required to read the selected billing scope.

### 4.7 Data-driven pricing

Model prices, plan allowances, promotional periods, and conversion rules can change. They must be isolated behind versioned configuration and effective dates rather than scattered as constants throughout the UI.

---

## 5. Goals

The MVP must:

1. Run as a project-scoped Canvas extension in the GitHub Copilot App.
2. Show the current Copilot session's estimated AI credits and USD cost when the runtime exposes session metrics.
3. Show the active model and token-bucket breakdown.
4. Refresh live session metrics without requiring the user to reload the Canvas.
5. Read and display completed local Copilot sessions when compatible session data exists.
6. Retrieve official GitHub AI-credit billing usage for a personal account when authorized.
7. Support organization billing usage when the user explicitly selects an organization and has permission.
8. Clearly display data source, scope, freshness, and errors.
9. Provide per-model and per-session breakdowns.
10. Expose safe, read-only agent-callable capabilities.
11. Provide local usage-threshold alerts.
12. Include automated tests, fixtures, documentation, and manual validation instructions.
13. Preserve attribution and license notices for any reused MIT-licensed source code.

---

## 6. Non-Goals

The MVP will not:

1. Modify budgets, spending limits, Copilot policies, subscriptions, or billing settings.
2. Promise invoice-grade real-time totals across every Copilot product.
3. Aggregate usage from every IDE, device, account, or organization without an official data source.
4. Provide a hosted multi-tenant backend.
5. Upload session prompts, source code, or transcripts to an external service.
6. Automatically select a cheaper model or interrupt a Copilot session.
7. Implement enterprise chargeback, cost-center management, or finance approval workflows.
8. Replace GitHub's official billing dashboard.
9. Claim that a local estimate is the final amount that GitHub will invoice.
10. Depend on undocumented APIs without an abstraction and a tested fallback.
11. Commit personal billing data or session history to Git.
12. Include telemetry by default.

---

## 7. Terminology

### 7.1 AI Credit

A GitHub billing unit used for supported Copilot AI-model usage. The conversion between credits and USD must be obtained from current GitHub documentation or API data and must not be assumed forever.

### 7.2 Live session estimate

A near-real-time calculation based on the active session's reported AI credits or token usage. It is not an invoice.

### 7.3 Official billing usage

Usage returned by a GitHub billing endpoint for the selected user, organization, or enterprise scope.

### 7.4 Billing scope

The account whose usage is being reported:

- User
- Organization
- Enterprise

### 7.5 Session snapshot

A normalized local representation of session metrics at a point in time.

### 7.6 Freshness

The elapsed time since a data source last returned a successful value.

### 7.7 Stale data

Data that is still displayed but has exceeded the source-specific freshness threshold.

---

## 8. Target Users

### 8.1 Individual developer

A developer with a personal paid Copilot plan who wants to understand current-session usage and monthly consumption.

### 8.2 Organization member

A developer whose Copilot license is billed through an organization. They may be able to see live local estimates but may not have organization billing permissions.

### 8.3 Organization owner or billing manager

A user who can access organization-level official usage and wants to compare aggregate billing data with local session activity.

### 8.4 Developer advocate or technical evaluator

A user running model and agent experiments who wants to compare the cost characteristics of sessions and models.

---

## 9. Core User Stories

### Live session

- As a developer, I want to see the estimated cost of my active Copilot session so that I understand consumption while I work.
- As a developer, I want to see AI credits and USD together so that the billing unit is understandable.
- As a developer, I want to see which model and token buckets contributed to the estimate.
- As a developer, I want to know when live metrics are unavailable rather than seeing fabricated zeroes.

### Official billing

- As a personal-plan user, I want to see GitHub-reported usage for the current month.
- As an organization owner, I want to choose an organization and view its GitHub-reported AI-credit usage.
- As a user without billing permissions, I want a clear permission message and instructions that do not expose credentials.
- As a user with an organization-managed license, I want the Canvas to explain why personal billing endpoints may not include my usage.

### History and analysis

- As a developer, I want to compare recent sessions by credits and estimated cost.
- As a developer, I want to group usage by model.
- As a developer, I want the agent to explain why one session appears more expensive than another.
- As a developer, I want to export normalized, non-secret usage data for my own analysis.

### Alerts

- As a developer, I want a local warning when the active session crosses a credit threshold.
- As a developer, I want a local warning when official monthly usage crosses a percentage threshold.
- As a developer, I want alerts to be informational and not alter my Copilot configuration.

---

## 10. Feasibility and Required Technical Spike

The project is feasible, but two integration points must be validated in the actual GitHub Copilot App Canvas runtime before the implementation is considered stable.

### Spike A: active-session RPC access

Validate whether the Canvas extension can access the current session object and call a compatible API such as:

```javascript
await session.rpc.usage.getMetrics()
```

The reference repository reports that this response can include:

- Per-model request counts
- Copilot-reported AI-credit usage
- Input tokens
- Cached-input tokens
- Cache-write tokens
- Output tokens
- Reasoning tokens
- Active model
- Last-call input and output token counts
- API duration
- Code-change counters

The implementation must treat the exact runtime scaffold and APIs generated by the GitHub Copilot App `/create-canvas` skill as the source of truth.

### Spike B: authenticated billing access

Validate which of these methods is permitted and reliable from the Canvas runtime:

1. Direct authenticated GitHub REST API calls through a host-provided authentication mechanism.
2. A fixed `gh api` invocation that reuses the user's existing GitHub CLI authentication.
3. A user-provided token through an environment variable, never persisted by the extension.
4. Manual import of a GitHub billing JSON response as the last-resort fallback.

### Spike deliverables

Before full feature implementation, Copilot must create:

- `docs/spikes/canvas-session-rpc.md`
- `docs/spikes/billing-auth.md`
- A minimal Canvas proving that a value can refresh in place
- A fixture-based fallback proving the UI can operate without live APIs
- A documented go/no-go decision for each integration path

### Prohibited spike behavior

- Do not hardcode sample numbers into the production data path.
- Do not report a successful integration when only a mock or fixture is working.
- Do not store an access token in source, JSON artifacts, logs, screenshots, or test snapshots.

---

## 11. MVP Scope

### 11.1 Overview dashboard

The default Canvas view must include:

- Product title
- Active source status
- Last successful refresh time
- Manual refresh action
- Current-session estimated cost
- Current-session AI credits
- Official month-to-date usage, when available
- Official net amount, when available
- Active model
- Most-used model for the selected period
- Data freshness indicators
- Warning and error summary

### 11.2 Live session detail

The live-session view must include:

- Session identifier
- Session title when available
- Active model
- Request count
- AI credits
- Estimated USD
- Calculation source
- Input tokens
- Cached-input tokens
- Cache-write tokens
- Output tokens
- Reasoning tokens
- Last-request input tokens
- Last-request output tokens
- API duration when available
- Session start time when available
- Last update time
- Data-source badge
- Raw normalized JSON in a collapsed diagnostics panel

### 11.3 Official billing detail

The billing view must include:

- Selected account scope
- Account name
- Time period
- Gross quantity
- Discount quantity
- Net quantity
- Gross amount
- Discount amount
- Net amount
- Per-model usage
- Product and SKU when supplied
- Last successful synchronization
- API version
- Permission status
- Staleness status
- Explanation that billing data may not update instantly

### 11.4 Local session history

The history view must include:

- Searchable session list
- Session identifier
- Optional title
- Last activity
- Active or completed status
- Model or models
- AI credits
- Estimated USD
- Calculation source
- Local data source
- Sort by cost, credits, date, or duration
- Filter by model and data source

### 11.5 Settings

The settings view must include:

- Billing scope: user or organization
- Username, defaulting to the authenticated login when detectable
- Organization name
- Live refresh interval
- Local-history refresh interval
- Billing refresh interval
- Current display currency
- Warning threshold for active-session credits
- Warning threshold for monthly usage percentage
- Enable or disable local notifications
- Retention period for local snapshots
- Reset to safe defaults
- Clear locally persisted usage snapshots
- Diagnostics toggle

Settings must not include a plain-text token field that is persisted.

### 11.6 Diagnostics

The diagnostics view must show:

- Extension version
- Canvas runtime information when available
- Enabled providers
- Last success and last error per provider
- Current refresh interval
- Next scheduled refresh
- Selected account scope
- Local cache paths
- API version
- Redacted authentication method
- Effective price-table version
- Effective plan-table version

Diagnostics must never display secrets, raw authorization headers, full prompts, source code, or session transcripts.

---

## 12. User Experience Specification

### 12.1 Header

Example:

```text
Copilot App Cost                         Refresh

LIVE ESTIMATE • Updated 2 seconds ago
GITHUB BILLING • Updated 4 minutes ago
```

The status indicator must use both text and an icon. Color alone is insufficient.

### 12.2 Primary cards

#### Current session

```text
Current Session
42.8 AI credits
~$0.43 USD
LIVE ESTIMATE
```

#### Official monthly usage

```text
Month-to-Date
4,320 net AI credits
$43.20 net
GITHUB BILLING
```

#### Remaining allowance

Only show this card when the allowance and scope are reliable.

```text
Account Pool Remaining
2,680 AI credits
38.3%
CALCULATED FROM BILLING DATA
```

For organization and enterprise pooled allowances, never label the value as the individual user's remaining allowance.

#### Additional usage

```text
Additional Usage
$0.00
GITHUB BILLING
```

Only show this when the API response supports the calculation.

### 12.3 Navigation

Recommended sections:

- Overview
- Live Session
- Billing
- Sessions
- Settings
- Diagnostics

The final navigation implementation must follow the patterns supported by the generated Canvas scaffold.

### 12.4 Charts

The MVP should include:

1. Cumulative live-session cost over time.
2. Month-to-date usage by model.
3. Recent sessions ranked by AI credits.

Charts must have:

- Accessible labels
- Tabular alternatives
- Tooltips
- Source labels
- Empty states
- No misleading interpolated data

### 12.5 Source labels

Use exact, consistent labels:

- `LIVE ESTIMATE`
- `GITHUB BILLING`
- `LOCAL SESSION`
- `TOKEN-RATE FALLBACK`
- `IMPORTED BILLING JSON`

### 12.6 Staleness

Suggested defaults:

- Live session stale after 10 seconds.
- Local session list stale after 60 seconds.
- Billing data stale after 15 minutes.
- Exchange rates stale according to their cache policy.

Stale data may remain visible but must show a warning.

### 12.7 Empty states

#### No active session

```text
No active Copilot session metrics are available.
Completed local sessions and official billing data may still be available.
```

#### No billing access

```text
Official billing data is unavailable for this scope.
Your Copilot license may be managed by an organization, or your account may not have the required billing permission.
```

#### No local sessions

```text
No compatible local Copilot sessions were found.
```

#### Offline

```text
Live local estimates may continue, but official billing data cannot be refreshed while offline.
```

### 12.8 Error behavior

Errors must be:

- Specific
- Actionable
- Non-destructive
- Redacted
- Scoped to the failing provider

A billing API failure must not remove a valid live-session estimate.

### 12.9 Accessibility

The Canvas must:

- Support keyboard navigation.
- Meet WCAG AA contrast targets.
- Use semantic labels.
- Avoid color-only status communication.
- Respect reduced-motion preferences.
- Work at common GitHub Copilot App zoom levels.
- Support light and dark themes.
- Provide a table alternative for every chart.

---

## 13. Functional Requirements

### FR-001: Canvas extension packaging

The project must provide a project-scoped Canvas extension under:

```text
.github/extensions/copilot-app-cost
```

The extension must include the metadata, entry point, dependencies, and optional persisted artifacts required by the current GitHub Copilot App Canvas scaffold.

### FR-002: Shared human-agent surface

The Canvas must maintain a shared state that can be updated by UI controls and read through agent-callable capabilities.

### FR-003: Live metrics provider

When supported by the runtime, the extension must read active-session usage metrics and normalize them into the internal domain model.

### FR-004: Live refresh

The live metrics provider must refresh automatically. Default target: every 2 seconds. User-configurable range: 2 to 10 seconds.

The refresh coordinator must prevent overlapping requests.

### FR-005: Copilot-reported credits preferred

When Copilot reports AI-credit totals directly, those values must be preferred over token-rate estimates.

### FR-006: Token-rate fallback

When reported credits are unavailable but token buckets are available, the extension may calculate a fallback estimate using the effective price table.

The UI must label this as `TOKEN-RATE FALLBACK`.

### FR-007: Local completed sessions

The extension must support completed-session data from compatible local Copilot session event files or snapshots.

Known paths from the reference implementation include:

```text
Windows: %USERPROFILE%\.copilot\session-state\<session-id>\events.jsonl
macOS/Linux: ~/.copilot/session-state/<session-id>/events.jsonl
```

The implementation must not assume these paths are permanent. They must be isolated behind a provider and validated at runtime.

### FR-008: Live snapshot cache

If supported and useful, the extension may maintain normalized live snapshots in an OS-appropriate local cache directory.

Personal runtime snapshots must be ignored by Git.

### FR-009: Personal billing provider

The extension must support the official user AI-credit endpoint:

```text
GET /users/{username}/settings/billing/ai_credit/usage
```

Documentation:

https://docs.github.com/en/rest/billing/usage

### FR-010: Organization billing provider

The extension must support the official organization AI-credit endpoint:

```text
GET /organizations/{org}/settings/billing/ai_credit/usage
```

The provider must handle permission errors and explain that organization administration read access may be required.

### FR-011: Enterprise billing provider

Enterprise scope is post-MVP unless it can be implemented with minimal additional work after the user and organization providers. The architecture must not block it.

### FR-012: Managed-license explanation

If user-level billing returns no relevant usage, the Canvas must explain that organization- or enterprise-managed Copilot usage may not appear at the personal account level.

### FR-013: Billing refresh

Default billing refresh interval: 5 minutes.

Allowed range: 1 to 60 minutes.

The user may always request a manual refresh.

### FR-014: API backoff

The billing provider must apply exponential backoff with jitter for transient failures and honor rate-limit information when available.

It must not retry terminal authorization or not-found errors indefinitely.

### FR-015: API versioning

The API version header must be defined in one configuration location and documented. The implementation must use the version required by the current endpoint documentation.

### FR-016: Per-model aggregation

The extension must aggregate live, local, and billing usage by model without combining incompatible scopes.

### FR-017: Time-period filtering

The billing provider must support current month as the default and allow selecting another available month.

### FR-018: Currency

USD is the canonical currency.

The MVP must always display USD and AI credits.

Optional display-currency conversion may be included if it can reuse a well-tested implementation without delaying the core product. Converted values must be labeled as display conversions and must not replace canonical USD.

### FR-019: Local alerts

The Canvas must support local informational thresholds:

- Active session AI credits
- Active session USD estimate
- Official month-to-date usage percentage when a reliable allowance is available
- Official net amount

Alerts must not alter GitHub settings.

### FR-020: Export

The user must be able to export normalized usage data as JSON.

CSV export is a should-have.

Exports must exclude secrets, authorization data, prompts, source code, and transcripts.

### FR-021: Clear local data

The user must be able to clear locally persisted snapshots and preferences after a confirmation step.

### FR-022: Data-source status

Each provider must expose:

- Provider name
- Availability
- Last attempt
- Last success
- Last error
- Stale state
- Current source scope

### FR-023: No fake production data

Fixtures and sample data are allowed only in tests, Storybook-like development surfaces, or an explicitly labeled demo mode.

Demo mode must never be enabled by default.

### FR-024: Agent capabilities

The Canvas must expose read-only or local-settings capabilities.

Recommended names:

- `get_cost_summary`
- `get_current_session_cost`
- `get_current_session_usage`
- `get_billing_summary`
- `get_usage_by_model`
- `get_recent_sessions`
- `get_most_expensive_sessions`
- `compare_sessions`
- `refresh_cost_data`
- `get_data_source_status`
- `set_local_cost_alert`
- `clear_local_cost_alert`
- `export_usage_summary`

### FR-025: Capability responses

Agent-callable capability responses must:

- Include source labels.
- Include timestamps.
- Distinguish estimated and official values.
- Avoid returning raw secrets or transcripts.
- Use stable JSON schemas.
- Return partial results when one provider fails.

### FR-026: Explainability

The agent must be able to explain a cost result using normalized metrics, for example:

- More output tokens
- Larger input context
- A more expensive model
- Cache-write usage
- More requests
- A longer resumed session

The agent must not infer causality that is unsupported by the available metrics.

---

## 14. Non-Functional Requirements

### NFR-001: Performance

- Initial Canvas shell visible within 1 second on a typical development machine.
- First fixture or cached state visible within 2 seconds.
- First live-session value targeted within 3 seconds.
- UI interaction response under 100 ms for local operations.
- No overlapping refresh calls for the same provider.

### NFR-002: Reliability

- One provider failure must not crash the Canvas.
- Previously successful values may remain visible with a stale warning.
- Refresh loops must be cancellation-aware.
- All timers must be disposed when the Canvas closes.

### NFR-003: Security

- No secret persistence.
- No authorization headers in logs.
- No arbitrary shell commands.
- No shell interpolation using user-controlled account names.
- Validate usernames and organization names before API use.
- Restrict file access to known Copilot data paths and extension-owned cache paths.
- Use an explicit endpoint allowlist.
- Sanitize exported filenames.
- Escape all untrusted strings rendered into HTML.

### NFR-004: Privacy

- No telemetry by default.
- No session prompts, source code, transcript text, or repository contents in the cost data model.
- Local history stores metrics only.
- Documentation must identify every local data path.

### NFR-005: Maintainability

- Provider interfaces isolate unstable APIs.
- Pricing and plan data are versioned.
- Domain calculations are pure functions.
- UI components do not call RPC, file-system, or billing APIs directly.
- Tests use fixtures and fakes.
- No duplicated cost-calculation logic.

### NFR-006: Portability

Support Windows, macOS, and Linux where the GitHub Copilot App and relevant local data sources are available.

Missing platform capabilities must produce a clear unsupported state.

### NFR-007: Testability

Every external dependency must have an interface or adapter:

- Session RPC
- File system
- Clock
- Billing API
- Process execution
- Authentication
- Exchange rates
- Notifications

### NFR-008: Observability

Structured local logs must include:

- Timestamp
- Provider
- Operation
- Duration
- Result category
- Redacted error

Debug logging must be opt-in.

---

## 15. Data Sources and Precedence

### 15.1 Live active-session data

Preferred source:

```javascript
session.rpc.usage.getMetrics()
```

Credit precedence:

1. Copilot-reported AI credits
2. Token-rate fallback
3. Unavailable

### 15.2 Local live snapshots

Use normalized snapshots created by this extension or compatible data from the reference implementation when discovered safely.

### 15.3 Completed local sessions

Parse only the usage-related events required to build metrics. Do not ingest full conversation content.

### 15.4 Official GitHub billing data

Use the official billing endpoint appropriate to the selected scope.

Billing values are authoritative for the returned scope and period, but they may not be instantaneously updated.

### 15.5 Imported billing JSON

Allow import only as a fallback or diagnostic feature.

Imported data must be labeled `IMPORTED BILLING JSON` and must include the import timestamp.

### 15.6 Precedence rules

- Never replace official billing values with live estimates.
- Never add a local estimate to an official aggregate unless the UI explicitly presents a projected value.
- Any projection must be labeled `PROJECTED`, show its formula, and remain post-MVP unless trivial.
- A missing value is `unavailable`, not zero.

---

## 16. Proposed Domain Model

The implementation may adjust names to match the Canvas scaffold, but the semantic separation must remain.

```typescript
type DataSourceKind =
  | "live-session-rpc"
  | "local-live-snapshot"
  | "local-completed-session"
  | "github-billing"
  | "token-rate-fallback"
  | "imported-billing-json";

type BillingScopeKind = "user" | "organization" | "enterprise";

interface TokenBuckets {
  inputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

interface SourceMetadata {
  kind: DataSourceKind;
  providerVersion?: string;
  observedAt: string;
  lastSuccessfulRefreshAt?: string;
  stale: boolean;
  confidence: "reported" | "calculated" | "imported";
}

interface SessionUsageSnapshot {
  schemaVersion: number;
  sessionId: string;
  title?: string;
  status: "active" | "completed" | "unknown";
  startedAt?: string;
  updatedAt: string;
  activeModel?: string;
  requestCount?: number;
  tokens: TokenBuckets;
  reportedAiCredits?: number;
  calculatedAiCredits?: number;
  estimatedUsd?: number;
  calculationMethod:
    | "copilot-reported-ai-credits"
    | "token-rate-fallback"
    | "unavailable";
  lastRequest?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
  };
  source: SourceMetadata;
}

interface BillingUsageItem {
  product?: string;
  sku?: string;
  model?: string;
  unitType?: string;
  pricePerUnit?: number;
  grossQuantity?: number;
  grossAmount?: number;
  discountQuantity?: number;
  discountAmount?: number;
  netQuantity?: number;
  netAmount?: number;
}

interface BillingUsageReport {
  schemaVersion: number;
  scope: BillingScopeKind;
  account: string;
  period: {
    year: number;
    month?: number;
    day?: number;
  };
  items: BillingUsageItem[];
  totals: {
    grossQuantity?: number;
    discountQuantity?: number;
    netQuantity?: number;
    grossAmount?: number;
    discountAmount?: number;
    netAmount?: number;
  };
  source: SourceMetadata;
}

interface ProviderStatus {
  providerId: string;
  available: boolean;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  stale: boolean;
}
```

---

## 17. Architecture

### 17.1 High-level architecture

```text
GitHub Copilot App
└── Copilot App Cost Canvas
    ├── Canvas UI
    │   ├── Overview
    │   ├── Live Session
    │   ├── Billing
    │   ├── Sessions
    │   ├── Settings
    │   └── Diagnostics
    ├── Shared Canvas State
    ├── Refresh Coordinator
    ├── Providers
    │   ├── SessionRpcUsageProvider
    │   ├── LocalSnapshotProvider
    │   ├── CompletedSessionProvider
    │   ├── GitHubBillingProvider
    │   └── ImportedBillingProvider
    ├── Domain
    │   ├── Usage Normalization
    │   ├── Cost Calculation
    │   ├── Aggregation
    │   ├── Freshness
    │   └── Alerts
    ├── Persistence
    │   ├── Local Settings
    │   ├── Local Snapshots
    │   └── Optional Canvas Artifacts
    └── Agent Capabilities
```

### 17.2 Required boundaries

UI components must not directly:

- Call `session.rpc`
- Read session files
- Execute `gh`
- Call GitHub REST endpoints
- Calculate pricing
- Persist secrets

### 17.3 Provider interfaces

```typescript
interface LiveUsageProvider {
  isAvailable(): Promise<boolean>;
  getCurrentSession(): Promise<SessionUsageSnapshot | null>;
}

interface SessionHistoryProvider {
  listSessions(): Promise<SessionUsageSnapshot[]>;
}

interface BillingProvider {
  getUsage(request: BillingUsageRequest): Promise<BillingUsageReport>;
}

interface SettingsStore {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
  reset(): Promise<AppSettings>;
}

interface Clock {
  now(): Date;
}
```

### 17.4 Runtime and language

Use the exact extension structure generated by the current `/create-canvas` skill.

Preferred implementation:

- Modern JavaScript ESM or TypeScript compiled to ESM
- Node.js-compatible runtime
- Minimal dependencies
- No framework replacement unless required by the generated scaffold

Do not invent a custom Canvas runtime or use an unsupported browser-only architecture.

### 17.5 Reference-code reuse

The project may reuse or adapt MIT-licensed concepts or code from:

https://github.com/DamianEdwards/copilot-cli-cost

If code is copied or substantially adapted:

- Preserve the applicable MIT license notice.
- Add attribution in `NOTICE.md`.
- Document the reused files or concepts.
- Do not imply endorsement by the original author.

---

## 18. Authentication and Authorization

### 18.1 Preferred authentication order

1. Host-provided authenticated GitHub API access, if the Canvas runtime exposes it.
2. Existing GitHub CLI authentication through a safe fixed-argument adapter.
3. Environment-provided token.
4. Manual import.

### 18.2 GitHub CLI adapter requirements

If `gh api` is used:

- Invoke the executable directly without a shell.
- Pass endpoint and query values as separate arguments.
- Validate account names.
- Set a timeout.
- Capture stdout and stderr separately.
- Redact errors.
- Do not log environment variables.
- Do not run arbitrary user-provided commands.

### 18.3 Personal billing permissions

The user-level AI-credit endpoint currently documents a fine-grained token with:

```text
Plan: read
```

The implementation must verify current requirements against:

https://docs.github.com/en/rest/billing/usage

### 18.4 Organization billing permissions

The organization endpoint currently documents organization administration read permission.

The UI must not ask ordinary organization members to bypass their permissions.

### 18.5 No token persistence

Tokens must never be stored in:

- Canvas artifacts
- Settings files
- Repository files
- Logs
- Error reports
- Exported data
- Test snapshots

---

## 19. Refresh and Caching Strategy

### 19.1 Default intervals

```text
Active session RPC:        2 seconds
Local live snapshots:     10 seconds
Completed-session index:  30 seconds
GitHub billing:            5 minutes
```

### 19.2 Refresh coordinator rules

- One in-flight request per provider.
- Cancel obsolete refreshes.
- Pause or reduce refresh when the Canvas is not visible if the host provides a lifecycle signal.
- Use backoff for transient failures.
- Do not retry `401`, `403`, or stable `404` responses in a tight loop.
- Manual refresh bypasses the normal schedule but not safety controls.
- Cache the last successful value.
- Mark cached values stale instead of silently deleting them.

### 19.3 Billing cache

Cache official billing responses locally with:

- Scope
- Account
- Period
- Retrieval timestamp
- API version
- ETag when available

Use conditional requests when supported.

### 19.4 Retention

Default local snapshot retention: 30 days.

Allow 1, 7, 30, or 90 days.

Never delete external Copilot session files. The clear-data action may delete only extension-owned data.

---

## 20. Cost Calculation Rules

### 20.1 Canonical representation

- AI credits: decimal number
- Currency: USD canonical
- Display values: rounded only for presentation
- Internal calculations: retain sufficient precision

### 20.2 Preferred calculation

If the session reports a credit total, use that value and derive an estimated USD value using the effective conversion rule.

### 20.3 Fallback calculation

If credits are not reported, estimate from per-model token buckets and a versioned price table.

### 20.4 Reasoning tokens

Do not assume reasoning-token billing behavior. Keep it configurable and driven by the effective price table or source metadata.

### 20.5 Plan allowances

Plan allowances must be represented as effective-dated data:

```typescript
interface PlanAllowance {
  planId: string;
  scope: "personal" | "organization" | "enterprise";
  effectiveFrom: string;
  effectiveTo?: string;
  includedAiCredits?: number;
  promotionalAiCredits?: number;
  sourceUrl: string;
}
```

### 20.6 Pooled credits

For Business and Enterprise billing scopes, included credits may be pooled at the billing-entity level.

The UI must not convert a pooled account allowance into a personal remaining allowance unless the official source explicitly supports that conclusion.

### 20.7 Rounding

- Cards: two decimal places for USD when under $100.
- AI credits: one decimal place when useful.
- Tables and exports: preserve higher precision.
- Never calculate totals from rounded display values.

---

## 21. Agent-Callable Capabilities

### 21.1 `get_cost_summary`

Returns:

- Current live estimate
- Official billing total
- Source and timestamp for each
- Provider errors
- Staleness

### 21.2 `get_current_session_cost`

Returns the active session's credits, estimated USD, model, method, and source.

### 21.3 `get_current_session_usage`

Returns normalized token buckets and request statistics.

### 21.4 `get_billing_summary`

Parameters:

- Scope
- Account
- Year
- Month

Returns official billing totals and source metadata.

### 21.5 `get_usage_by_model`

Parameters:

- Data source
- Period

Returns model-level usage without merging incompatible scopes.

### 21.6 `get_recent_sessions`

Parameters:

- Limit
- Sort
- Model filter

Returns normalized local session summaries.

### 21.7 `compare_sessions`

Parameters:

- Two or more session IDs

Returns differences in models, tokens, requests, credits, and estimated USD.

### 21.8 `refresh_cost_data`

Parameters:

- Provider or `all`

Triggers a safe refresh and returns provider status.

### 21.9 `get_data_source_status`

Returns provider availability, freshness, and redacted errors.

### 21.10 `set_local_cost_alert`

Updates local alert settings only.

### 21.11 Capability safety

Capabilities must not:

- Change GitHub settings
- Change models
- End sessions
- Delete external files
- Expose secrets
- Return raw transcripts
- Execute arbitrary commands

---

## 22. Proposed Repository Structure

The final structure must respect the generated Canvas scaffold. Recommended baseline:

```text
copilot-app-cost/
├── .github/
│   ├── copilot-instructions.md
│   └── extensions/
│       └── copilot-app-cost/
│           ├── package.json
│           ├── extension.mjs
│           ├── src/
│           │   ├── canvas/
│           │   ├── capabilities/
│           │   ├── domain/
│           │   ├── providers/
│           │   ├── persistence/
│           │   ├── security/
│           │   └── ui/
│           ├── assets/
│           ├── artifacts/
│           │   └── .gitkeep
│           └── test/
├── docs/
│   ├── architecture.md
│   ├── data-sources.md
│   ├── security.md
│   ├── privacy.md
│   ├── troubleshooting.md
│   ├── manual-validation.md
│   └── spikes/
│       ├── canvas-session-rpc.md
│       └── billing-auth.md
├── fixtures/
│   ├── live-session/
│   ├── completed-sessions/
│   └── billing/
├── scripts/
│   ├── validate.mjs
│   └── package-extension.mjs
├── .gitignore
├── LICENSE
├── NOTICE.md
├── README.md
└── PRD.md
```

Platform-required extension files are allowed under `.github/extensions`. Implementation code should remain organized under that extension's `src` directory.

---

## 23. Testing Strategy

### 23.1 Unit tests

Required coverage:

- Token normalization
- Copilot-reported credit precedence
- Token-rate fallback
- Per-model aggregation
- Billing totals
- Stale-state calculation
- Plan effective dates
- Promotional-period boundaries
- Rounding
- Alert thresholds
- Username and organization validation
- Error redaction
- Export sanitization

### 23.2 Provider contract tests

Use fixtures for:

- Active session with reported credits
- Active session without reported credits
- Multiple models
- Reasoning tokens
- Empty metrics
- Corrupted local event file
- Partial event file
- User billing response
- Organization billing response
- Discounts
- Empty billing result
- Permission denied
- Rate limited
- Transient server error

### 23.3 Integration tests

Where the runtime permits:

- Canvas opens.
- Shared state renders.
- Manual refresh updates state.
- Capability calls return stable JSON.
- Settings persist.
- No secret is written.
- Timers stop on disposal.

### 23.4 Manual tests in GitHub Copilot App

Required manual validation:

1. Open the repository in the GitHub Copilot App.
2. Load the project-scoped Canvas.
3. Verify light and dark themes.
4. Verify keyboard navigation.
5. Start a Copilot session.
6. Confirm live metrics update.
7. Confirm source badge says `LIVE ESTIMATE`.
8. Confirm the current model is displayed.
9. Confirm token buckets update.
10. Disable or break the live provider and verify graceful degradation.
11. Authenticate for personal billing.
12. Verify official billing is labeled `GITHUB BILLING`.
13. Test an organization without permission.
14. Test stale billing data.
15. Test manual refresh.
16. Test local session history.
17. Test agent capabilities.
18. Export JSON and inspect it for secrets or transcript content.
19. Clear extension-owned local data.
20. Close the Canvas and verify no refresh process remains running.

### 23.5 Quality gates

Before a phase is complete:

- Formatting passes.
- Lint passes.
- Type checking passes if TypeScript is used.
- Unit tests pass.
- Provider contract tests pass.
- Package validation passes.
- No secrets are detected.
- Manual Canvas smoke test passes for runtime-facing changes.
- Documentation is updated.
- No production path uses fixture data.

---

## 24. Acceptance Criteria

### AC-001

Given an active session with Copilot-reported credits, when the Canvas opens, then the current-session card displays credits and estimated USD within the target refresh window and labels the value `LIVE ESTIMATE`.

### AC-002

Given an active session without reported credits but with supported token buckets, when metrics refresh, then the Canvas displays a calculated value labeled `TOKEN-RATE FALLBACK`.

### AC-003

Given no active-session API, when the Canvas opens, then it displays a clear unavailable state and continues loading local sessions and billing data.

### AC-004

Given valid personal billing authorization, when the user selects the current month, then official usage is displayed with gross, discount, net, model, scope, and timestamp fields.

### AC-005

Given an organization-managed license and no personal billed usage, then the Canvas explains that personal endpoints may not include organization-billed consumption.

### AC-006

Given a `403` from organization billing, then the Canvas displays a permission-specific message and does not continuously retry.

### AC-007

Given a successful value followed by a transient provider failure, then the last successful value remains visible with a stale warning.

### AC-008

Given live and official data at the same time, then the UI never combines them into one unlabeled total.

### AC-009

Given an agent request for current cost, then the capability response includes value, unit, source, method, and observation timestamp.

### AC-010

Given an exported JSON file, then it contains no tokens, authorization headers, prompts, source code, or transcripts.

### AC-011

Given a Canvas close event, then all timers and in-flight refreshes are disposed or cancelled.

### AC-012

Given test fixtures, then no fixture is reachable as real data in a normal production run.

---

## 25. Delivery Plan

### Phase 0: Repository and runtime spike

- Initialize repository.
- Add this PRD.
- Add `.github/copilot-instructions.md`.
- Run `/create-canvas`.
- Preserve generated scaffold.
- Validate Canvas rendering.
- Validate shared state.
- Validate current-session access.
- Validate billing authentication paths.
- Document findings.
- Do not build the full dashboard until the spike is complete.

### Phase 1: Domain and fixtures

- Implement domain types.
- Implement normalization.
- Implement cost calculations.
- Implement source metadata.
- Implement staleness.
- Add fixture-based tests.
- Add versioned pricing and plan configuration.

### Phase 2: Live session MVP

- Implement session RPC adapter.
- Implement refresh coordinator.
- Implement current-session cards.
- Implement token breakdown.
- Implement diagnostics.
- Add graceful fallback.

### Phase 3: Local session history

- Implement compatible local snapshot reader.
- Implement completed-session parser.
- Add searchable session history.
- Add session comparison.
- Ensure transcripts are not ingested.

### Phase 4: Official billing

- Implement personal billing.
- Implement organization billing.
- Implement permission handling.
- Implement caching and backoff.
- Add per-model billing view.
- Add clear estimate-versus-billing presentation.

### Phase 5: Agent capabilities and alerts

- Add read-only capabilities.
- Add local alerts.
- Add export.
- Add capability contract tests.

### Phase 6: Hardening and documentation

- Security review.
- Privacy review.
- Accessibility pass.
- Cross-platform validation.
- Manual validation.
- README screenshots.
- Troubleshooting guide.
- Release packaging.

---

## 26. Prioritization

### Must have

- Project-scoped Canvas
- Live active-session estimate or explicit unavailable state
- AI credits and USD
- Model and token breakdown
- Personal official billing
- Organization official billing
- Source and freshness labels
- Local completed-session history
- Read-only agent capabilities
- Error isolation
- Automated tests
- Security and privacy documentation

### Should have

- Cost charts
- Local alerts
- JSON export
- Currency conversion
- Session comparison
- Conditional billing requests using ETag
- Organization selector populated from accessible organizations

### Could have

- CSV export
- Enterprise billing
- Cost-center filtering
- Daily projections
- Model what-if comparisons
- Shareable redacted reports
- Automation-generated weekly summaries
- Correlation with repository or task labels without reading prompt content

### Will not have in MVP

- Billing mutations
- Budget creation
- User blocking
- Automatic model switching
- Hosted backend
- Cross-user surveillance
- Invoice guarantees

---

## 27. Risks and Mitigations

### Risk: Canvas APIs change

**Mitigation:** Keep runtime-specific code in adapters. Use the generated scaffold as the source of truth. Document the tested GitHub Copilot App version.

### Risk: Session RPC unavailable in Canvas

**Mitigation:** Support local snapshots and completed sessions. Show a clear unavailable state. Do not fake live data.

### Risk: Billing authentication unavailable

**Mitigation:** Try host auth, safe `gh api`, environment token, then manual import. Document the active method.

### Risk: Billing data is delayed

**Mitigation:** Display source and retrieval time. Never call it real-time official billing.

### Risk: User-level endpoint omits organization-managed usage

**Mitigation:** Detect or explain billing scope and provide organization configuration.

### Risk: Pricing changes

**Mitigation:** Effective-dated price tables with source URLs and tests.

### Risk: Local file schema changes

**Mitigation:** Versioned parsers, fixtures, tolerant parsing, and provider isolation.

### Risk: Sensitive data exposure

**Mitigation:** Metrics-only model, no transcripts, redacted logs, no telemetry, secure exports.

### Risk: Excessive polling

**Mitigation:** Source-specific intervals, cancellation, visibility-aware refresh, backoff, and conditional requests.

### Risk: Misleading remaining allowance

**Mitigation:** Show remaining values only when the allowance and scope are reliable. Clearly distinguish pooled and personal allowances.

---

## 28. Security Threat Model

### Assets

- GitHub authentication
- Billing data
- Session metrics
- Local usage history
- Organization names
- Exported reports

### Threats

- Token leakage
- Command injection through account names
- HTML or script injection through session titles
- Reading arbitrary local files
- Logging session transcripts
- Committing personal artifacts
- Excessive API calls
- Misrepresenting estimates as official values

### Required controls

- No shell interpolation
- Input validation
- Output escaping
- Endpoint allowlist
- Known-path file access
- Secret redaction
- Local artifact `.gitignore`
- Fixed timeouts
- Backoff
- Source badges
- Security tests

---

## 29. Documentation Requirements

### README.md

Must include:

- What the Canvas does
- Screenshot or animation
- Estimate versus official billing explanation
- Prerequisites
- Installation
- How to open the Canvas
- Authentication options
- Permissions
- Supported scopes
- Data sources
- Local data paths
- Troubleshooting
- Uninstall and local-data cleanup
- Security and privacy summary
- Attribution
- Full documentation URLs

### docs/architecture.md

Must include provider and data-flow diagrams.

### docs/data-sources.md

Must document:

- Session RPC
- Local snapshots
- Completed sessions
- Billing endpoints
- Precedence
- Freshness
- Limitations

### docs/security.md

Must document threat model and controls.

### docs/privacy.md

Must state exactly what is and is not collected.

### docs/manual-validation.md

Must contain the full manual test checklist.

### .github/copilot-instructions.md

Must instruct Copilot to:

- Read `PRD.md` first.
- Never fabricate unsupported Canvas APIs.
- Keep estimate and official billing models separate.
- Never persist secrets.
- Never use fixture data in production.
- Prefer adapters and pure functions.
- Complete tests and documentation with each feature.
- Preserve runtime compatibility.
- Stop and document a blocker when an API is unavailable instead of pretending it works.

---

## 30. Success Metrics

The MVP is successful when:

1. A developer can open the Canvas and understand the active session's estimated credits and USD in less than 10 seconds.
2. Every displayed cost value has an obvious source label.
3. Official billing data is available for an authorized personal account.
4. Permission failures are understandable without reading logs.
5. The agent can answer current-cost and model-breakdown questions through stable capabilities.
6. The Canvas remains functional when one provider fails.
7. Exported data contains no secrets or transcript content.
8. Manual testers do not confuse estimates with official billing.
9. Automated tests cover the main calculation and provider contracts.
10. No refresh loop remains after the Canvas closes.

---

## 31. Release Criteria

Release `v0.1.0` only when:

- Phase 0 spikes are documented.
- The Canvas loads in the current GitHub Copilot App.
- At least one real live or local session source is verified.
- Personal billing is verified with a real authenticated account or explicitly deferred with a documented platform blocker.
- Organization billing has fixture tests and permission handling; real verification is preferred.
- All source badges and stale states work.
- Tests and validation scripts pass.
- Security review finds no token persistence or arbitrary command execution.
- README and troubleshooting documentation are complete.
- License and attribution requirements are satisfied.
- Known limitations are listed.

---

## 32. Future Opportunities

Post-MVP ideas:

- Enterprise billing scope
- Cost-center reporting
- Weekly and monthly trend reports
- GitHub Copilot App automations for scheduled summaries
- Redacted shareable reports
- Model what-if comparisons
- Session projections
- Repository-level tags
- Team dashboards backed only by authorized official data
- Budget recommendations without mutation
- Optional local notification integration
- Comparison between live estimates and later official billing reconciliation

---

## 33. Implementation Guardrails for GitHub Copilot

GitHub Copilot must follow these rules while implementing this PRD:

1. Start with the two technical spikes.
2. Use `/create-canvas` and preserve the generated runtime contract.
3. Do not assume `session.rpc.usage.getMetrics()` is available until proven in the Canvas.
4. Do not invent API names, host capabilities, lifecycle events, or authentication mechanisms.
5. Do not hide unavailable data behind a zero.
6. Do not combine live estimates and official billing.
7. Do not store secrets.
8. Do not read or store transcripts.
9. Do not use a shell for `gh` execution.
10. Do not retry terminal errors indefinitely.
11. Do not hardcode current promotional allowances without effective dates.
12. Do not label organization pooled credits as an individual allowance.
13. Do not enable telemetry.
14. Keep all external integrations behind adapters.
15. Keep calculations pure and tested.
16. Keep changes small and reviewable.
17. Update docs with every externally visible behavior.
18. Run tests and validation before declaring a phase complete.
19. If blocked by the runtime, document the blocker and implement the honest fallback.
20. Never claim that fixture-based functionality is a verified real integration.

---

## 34. Reference Links

- Reference implementation:  
  https://github.com/DamianEdwards/copilot-cli-cost

- GitHub Copilot App Canvas extensions:  
  https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions

- GitHub Copilot App documentation:  
  https://docs.github.com/en/copilot/how-tos/github-copilot-app

- GitHub billing usage REST API:  
  https://docs.github.com/en/rest/billing/usage

- Automating usage reporting:  
  https://docs.github.com/en/billing/tutorials/automate-usage-reporting

- Usage-based billing and AI Credits:  
  https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises

- GitHub Copilot CLI:  
  https://github.com/features/copilot/cli

- GitHub Copilot App repository and changelog:  
  https://github.com/github/app

- Reference repository license:  
  https://github.com/DamianEdwards/copilot-cli-cost/blob/main/LICENSE

---

## 35. Final Product Statement

Copilot App Cost is a transparent cost-observability Canvas for the GitHub Copilot App. It combines near-real-time local session estimates with authorized official billing data, while preserving a strict boundary between the two. It is useful even when only one source is available, safe by default, local-first, testable, and honest about the limitations of evolving Copilot App and billing APIs.

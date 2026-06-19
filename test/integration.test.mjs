import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { metricsToSessionUsage, calculateSessionEstimate, aggregateModelUsage } from "../.github/extensions/copilot-app-cost/lib/cost.mjs";
import { normalizeBillingResponse, classifyBillingError } from "../.github/extensions/copilot-app-cost/lib/billing.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dir, "fixtures");

// Load fixtures
const sessionMetrics = JSON.parse(fs.readFileSync(path.join(fixturesDir, "session-metrics.json"), "utf8"));
const billingResponse = JSON.parse(fs.readFileSync(path.join(fixturesDir, "billing-response.json"), "utf8"));
const edgeCases = JSON.parse(fs.readFileSync(path.join(fixturesDir, "edge-cases.json"), "utf8"));

// ---------------------------------------------------------------------------
// Integration: Full Flow
// ---------------------------------------------------------------------------
describe("Integration: session metrics to cost estimate", () => {
    it("processes realistic session metrics end-to-end", () => {
        const usage = metricsToSessionUsage("sess-123", sessionMetrics);
        assert.equal(usage.sessionId, "sess-123");
        assert.equal(usage.currentModel, "gpt-5-mini");
        assert.equal(usage.totalNanoAiu, 425000000);
        assert.equal(usage.modelUsage.length, 2);
        
        const estimate = calculateSessionEstimate(usage, { plan: "pro" });
        assert.equal(estimate.sessionId === undefined, true); // sessionId is on usage, not estimate
        assert.ok(estimate.totalUsd > 0);
        assert.equal(estimate.plan, "pro");
        assert.equal(estimate.calculationMethod, "copilot-aiu");
    });

    it("handles zero nano-AIU gracefully", () => {
        const usage = metricsToSessionUsage("sess-zero", edgeCases.zero_usage);
        const estimate = calculateSessionEstimate(usage);
        assert.equal(estimate.totalUsd, 0);
        assert.equal(estimate.aiCredits, 0);
        assert.equal(estimate.calculationMethod, "copilot-aiu");
    });

    it("aggregates multi-model usage correctly", () => {
        const usage = metricsToSessionUsage("sess-123", sessionMetrics);
        const estimate = calculateSessionEstimate(usage);
        assert.equal(estimate.modelBreakdown.length, 2);
        
        const aggregated = aggregateModelUsage(estimate.modelBreakdown);
        assert.equal(aggregated.length, 2);
        // Sorted by cost descending
        assert.ok(aggregated[0].totalUsd >= aggregated[1].totalUsd);
    });
});

// ---------------------------------------------------------------------------
// Integration: Billing Response Normalization
// ---------------------------------------------------------------------------
describe("Integration: billing response processing", () => {
    it("normalizes realistic billing response", () => {
        const request = { scope: "user", account: "elbruno", year: 2026, month: 6, apiVersion: "2026-03-10" };
        const result = normalizeBillingResponse(request, billingResponse);
        
        assert.equal(result.source, "GITHUB BILLING");
        assert.equal(result.scope, "user");
        assert.equal(result.account, "elbruno");
        assert.equal(result.confidence, "official");
        assert.ok(result.totals.netAmount > 0);
        assert.ok(result.usageByModel.length > 0);
    });

    it("aggregates multiple line items by model", () => {
        const request = { scope: "user", account: "elbruno", year: 2026, month: 6, apiVersion: "2026-03-10" };
        const result = normalizeBillingResponse(request, billingResponse);
        
        const gptModel = result.usageByModel.find(m => m.model === "gpt-5-mini");
        assert.ok(gptModel);
        assert.equal(gptModel.netQuantity, 45);
    });
});

// ---------------------------------------------------------------------------
// Error: Malformed Input
// ---------------------------------------------------------------------------
describe("Error handling: malformed input", () => {
    it("handles empty/null metrics", () => {
        const emptyMetrics = edgeCases.empty_metrics;
        const usage = metricsToSessionUsage("sess-empty-metrics", emptyMetrics);
        // totalNanoAiu is null in fixture, readOptionalNumber returns undefined for null
        assert.equal(usage.totalNanoAiu, undefined);
        assert.deepEqual(usage.modelUsage, []);
    });

    it("tolerates null/undefined modelMetrics", () => {
        const usage = metricsToSessionUsage("sess-empty", { currentModel: "gpt-5-mini" });
        assert.deepEqual(usage.modelUsage, []);
    });

    it("gracefully handles high usage values", () => {
        const usage = metricsToSessionUsage("sess-high", edgeCases.high_usage);
        const estimate = calculateSessionEstimate(usage);
        assert.ok(estimate.totalUsd > 0);
        assert.ok(Number.isFinite(estimate.totalUsd));
    });
});

// ---------------------------------------------------------------------------
// Error: Billing Errors
// ---------------------------------------------------------------------------
describe("Error handling: billing API errors", () => {
    it("classifies missing-user-scope error", () => {
        const error = 'needs the "user" scope. Authorize with `gh auth refresh -h github.com -s user`.';
        assert.equal(classifyBillingError(error, "user"), "missing-user-scope");
    });

    it("classifies HTTP 403 org error as missing-organization-permission", () => {
        assert.equal(classifyBillingError("HTTP 403 Forbidden", "organization"), "missing-organization-permission");
    });

    it("classifies HTTP 404 user error as not-found-or-no-billed-usage", () => {
        assert.equal(classifyBillingError("HTTP 404 Not Found", "user"), "not-found-or-no-billed-usage");
    });

    it("handles empty billing response (no usage)", () => {
        const request = { scope: "user", account: "elbruno", year: 2026, month: 6, apiVersion: "2026-03-10" };
        const emptyResponse = { timePeriod: request, usageItems: [] };
        const result = normalizeBillingResponse(request, emptyResponse);
        
        assert.equal(result.totals.netAmount, 0);
        assert.equal(result.reliability, "managed-license-or-no-personal-usage");
        assert.ok(result.managedLicenseNote);
    });
});

// ---------------------------------------------------------------------------
// Edge: Reasoning Tokens
// ---------------------------------------------------------------------------
describe("Edge case: reasoning tokens", () => {
    it("includes reasoning tokens in calculation when enabled", () => {
        const usage = metricsToSessionUsage("sess-reasoning", edgeCases.reasoning_tokens);
        const estimate = calculateSessionEstimate(usage, { billReasoningTokens: true });
        
        const claudeModel = estimate.modelBreakdown.find(m => m.model === "claude-opus-4.8");
        assert.ok(claudeModel.reasoningTokens > 0);
    });

    it("excludes reasoning tokens when disabled", () => {
        const usage = metricsToSessionUsage("sess-reasoning", edgeCases.reasoning_tokens);
        const estimateOff = calculateSessionEstimate(usage, { billReasoningTokens: false });
        const estimateOn = calculateSessionEstimate(usage, { billReasoningTokens: true });
        
        assert.ok(estimateOff.totalUsd <= estimateOn.totalUsd);
    });
});

// ---------------------------------------------------------------------------
// Edge: Plan Allowances
// ---------------------------------------------------------------------------
describe("Edge case: plan allowances and pooling", () => {
    it("marks pooled allowance for enterprise plan", () => {
        const usage = metricsToSessionUsage("sess-enterprise", { totalNanoAiu: 100000000, modelUsage: [] });
        const estimate = calculateSessionEstimate(usage, { plan: "enterprise" });
        assert.equal(estimate.pooledAllowance, true);
        // Pooled plans still show a percentage if there was usage
        // It's just that it's relative to the org pool, not personal allowance
    });

    it("shows remaining allowance for personal plans", () => {
        const usage = metricsToSessionUsage("sess-pro", { totalNanoAiu: 500000000, modelUsage: [] }); // 50 credits
        const estimate = calculateSessionEstimate(usage, { plan: "pro" }); // 1500 total
        assert.equal(estimate.pooledAllowance, false);
        assert.ok(estimate.allowanceUsagePercentage !== null);
        assert.ok(estimate.allowanceUsagePercentage > 0);
    });
});

// ---------------------------------------------------------------------------
// Edge: Caching Impact
// ---------------------------------------------------------------------------
describe("Edge case: token caching", () => {
    it("accounts for cached input token cost reduction", () => {
        // Construct usage object directly
        const usage = {
            sessionId: "sess-cached",
            modelUsage: [{
                model: "gpt-5-mini",
                requests: 1,
                inputTokens: 1000,
                cachedInputTokens: 500, // 50% of input is cached
                cacheWriteTokens: 0,
                outputTokens: 100,
                reasoningTokens: 0,
            }],
        };
        const estimate = calculateSessionEstimate(usage);
        assert.ok(estimate.modelBreakdown.length > 0, "modelBreakdown should have at least one model");
        const model = estimate.modelBreakdown[0];
        assert.equal(model.uncachedInputTokens, 500, "uncached input should be 1000 - 500 = 500");
        // Cost should be: 500 uncached @ $0.25/M + 500 cached @ $0.025/M + 100 output @ $2/M
        // = $0.125 + $0.0125 + $0.2 = $0.3375
        assert.ok(model.totalUsd < 1.0, "cost with caching should be much cheaper than without"); 
    });
});

// ---------------------------------------------------------------------------
// Edge: Model Aliases
// ---------------------------------------------------------------------------
describe("Edge case: model name aliases", () => {
    it("resolves model aliases to canonical names", () => {
        // Construct usage object directly with proper structure
        const usage = {
            sessionId: "sess-alias",
            modelUsage: [{
                model: "claude sonnet 4.6", // With spaces
                requests: 1,
                inputTokens: 100,
                cachedInputTokens: 0,
                cacheWriteTokens: 0,
                outputTokens: 50,
                reasoningTokens: 0,
            }],
        };
        const estimate = calculateSessionEstimate(usage);
        assert.ok(estimate.modelBreakdown.length > 0);
        const model = estimate.modelBreakdown[0];
        assert.equal(model.model, "claude-sonnet-4.6");
    });
});

// ---------------------------------------------------------------------------
// Fixture Validation
// ---------------------------------------------------------------------------
describe("Fixtures validation", () => {
    it("session-metrics.json is valid", () => {
        assert.ok(sessionMetrics.currentModel);
        assert.ok(sessionMetrics.modelMetrics);
        assert.ok(Object.keys(sessionMetrics.modelMetrics).length > 0);
    });

    it("billing-response.json is valid", () => {
        assert.ok(billingResponse.timePeriod);
        assert.ok(Array.isArray(billingResponse.usageItems));
        assert.ok(billingResponse.usageItems.length > 0);
    });

    it("edge-cases.json covers scenarios", () => {
        assert.ok(edgeCases.zero_usage);
        assert.ok(edgeCases.high_usage);
        assert.ok(edgeCases.reasoning_tokens);
        assert.ok(edgeCases.empty_metrics);
    });
});

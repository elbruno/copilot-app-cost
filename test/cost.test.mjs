import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    normalizePlanId,
    getPlanAllowance,
    metricsToSessionUsage,
    calculateSessionEstimate,
    aggregateModelUsage,
} from "../.github/extensions/copilot-app-cost/lib/cost.mjs";

// ---------------------------------------------------------------------------
// normalizePlanId
// ---------------------------------------------------------------------------
describe("normalizePlanId", () => {
    it("returns pro for individual", () => assert.equal(normalizePlanId("individual"), "pro"));
    it("returns pro for copilot-pro", () => assert.equal(normalizePlanId("copilot-pro"), "pro"));
    it("returns pro-plus for pro+", () => assert.equal(normalizePlanId("pro+"), "pro-plus"));
    it("returns pro-plus for Copilot Pro+", () => assert.equal(normalizePlanId("Copilot Pro+"), "pro-plus"));
    it("returns enterprise for enterprise-cloud", () => assert.equal(normalizePlanId("enterprise-cloud"), "enterprise"));
    it("returns max for copilot-max", () => assert.equal(normalizePlanId("copilot-max"), "max"));
    it("falls through for unknown plan", () => assert.equal(normalizePlanId("unknown-plan"), "unknown-plan"));
    it("handles null with default pro", () => assert.equal(normalizePlanId(null), "pro"));
    it("handles undefined with default pro", () => assert.equal(normalizePlanId(undefined), "pro"));
});

// ---------------------------------------------------------------------------
// getPlanAllowance
// ---------------------------------------------------------------------------
describe("getPlanAllowance", () => {
    it("pro gives 1500 credits not pooled", () => {
        const allowance = getPlanAllowance("pro");
        assert.equal(allowance.totalAiCredits, 1500);
        assert.equal(allowance.pooled, false);
    });
    it("enterprise gives 7000 credits pooled", () => {
        const allowance = getPlanAllowance("enterprise");
        assert.equal(allowance.totalAiCredits, 7000);
        assert.equal(allowance.pooled, true);
    });
    it("business is pooled", () => {
        assert.equal(getPlanAllowance("business").pooled, true);
    });
    it("unknown plan falls back to pro", () => {
        assert.equal(getPlanAllowance("nonexistent").totalAiCredits, 1500);
    });
});

// ---------------------------------------------------------------------------
// metricsToSessionUsage
// ---------------------------------------------------------------------------
describe("metricsToSessionUsage", () => {
    it("normalizes basic metrics", () => {
        const metrics = {
            currentModel: "gpt-5-mini",
            totalNanoAiu: 5_000_000_000,
            totalUserRequests: 3,
            totalPremiumRequestCost: 0,
            totalApiDurationMs: 1234,
            sessionStartTime: "2026-06-01T00:00:00Z",
            modelMetrics: {
                "gpt-5-mini": {
                    requests: { count: 3 },
                    usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 100, cacheWriteTokens: 0, reasoningTokens: 0 },
                    totalNanoAiu: 5_000_000_000,
                },
            },
        };
        const usage = metricsToSessionUsage("sess-1", metrics);
        assert.equal(usage.sessionId, "sess-1");
        assert.equal(usage.currentModel, "gpt-5-mini");
        assert.equal(usage.totalNanoAiu, 5_000_000_000);
        assert.equal(usage.totalUserRequests, 3);
        assert.equal(usage.modelUsage.length, 1);
        assert.equal(usage.modelUsage[0].model, "gpt-5-mini");
        assert.equal(usage.modelUsage[0].inputTokens, 1000);
        assert.equal(usage.modelUsage[0].outputTokens, 500);
    });

    it("treats zero totalNanoAiu as present (not missing)", () => {
        const usage = metricsToSessionUsage("sess-zero", { totalNanoAiu: 0, totalUserRequests: 1 });
        assert.equal(usage.totalNanoAiu, 0);
    });

    it("handles null/undefined metrics gracefully", () => {
        const usage = metricsToSessionUsage("sess-empty", null);
        assert.equal(usage.sessionId, "sess-empty");
        assert.equal(usage.totalNanoAiu, undefined);
        assert.deepEqual(usage.modelUsage, []);
    });
});

// ---------------------------------------------------------------------------
// calculateSessionEstimate
// ---------------------------------------------------------------------------
describe("calculateSessionEstimate", () => {
    it("uses direct nano AIU when available", () => {
        const usage = {
            totalNanoAiu: 1_000_000_000,  // 1 AI credit = $0.01
            modelUsage: [],
        };
        const est = calculateSessionEstimate(usage, { plan: "pro" });
        assert.equal(est.aiCredits, 1);
        assert.equal(est.totalUsd, 0.01);
        assert.equal(est.calculationMethod, "copilot-aiu");
    });

    it("falls back to token estimate when no totalNanoAiu", () => {
        const usage = {
            modelUsage: [{
                model: "gpt-5-mini",
                requests: 1,
                inputTokens: 1_000_000,
                cachedInputTokens: 0,
                cacheWriteTokens: 0,
                outputTokens: 500_000,
                reasoningTokens: 0,
            }],
        };
        const est = calculateSessionEstimate(usage, { plan: "pro" });
        // 1M input * $0.25/M + 0.5M output * $2/M = $0.25 + $1 = $1.25
        assert.equal(est.totalUsd, 1.25);
        assert.equal(est.calculationMethod, "token-estimate");
    });

    it("zero totalNanoAiu yields zero cost with copilot-aiu method", () => {
        const usage = { totalNanoAiu: 0, modelUsage: [] };
        const est = calculateSessionEstimate(usage, { plan: "pro" });
        assert.equal(est.totalUsd, 0);
        assert.equal(est.aiCredits, 0);
        assert.equal(est.calculationMethod, "copilot-aiu");
    });

    it("reports allowance percentage for non-pooled plans", () => {
        const usage = { totalNanoAiu: 500_000_000_000, modelUsage: [] }; // 500 AI credits
        const est = calculateSessionEstimate(usage, { plan: "pro" }); // 1500 total
        assert.ok(est.allowanceUsagePercentage > 0);
        assert.equal(est.pooledAllowance, false);
    });

    it("marks pooled allowance for enterprise", () => {
        const usage = { totalNanoAiu: 0, modelUsage: [] };
        const est = calculateSessionEstimate(usage, { plan: "enterprise" });
        assert.equal(est.pooledAllowance, true);
    });
});

// ---------------------------------------------------------------------------
// aggregateModelUsage
// ---------------------------------------------------------------------------
describe("aggregateModelUsage", () => {
    it("sums values for the same model", () => {
        const items = [
            { model: "gpt-5-mini", requests: 2, inputTokens: 100, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 50, reasoningTokens: 0, aiCredits: 1, totalUsd: 0.01 },
            { model: "gpt-5-mini", requests: 3, inputTokens: 200, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 75, reasoningTokens: 0, aiCredits: 2, totalUsd: 0.02 },
        ];
        const result = aggregateModelUsage(items);
        assert.equal(result.length, 1);
        assert.equal(result[0].requests, 5);
        assert.equal(result[0].inputTokens, 300);
        assert.equal(result[0].outputTokens, 125);
        assert.equal(result[0].aiCredits, 3);
    });

    it("handles multiple distinct models", () => {
        const items = [
            { model: "gpt-5-mini", requests: 1, inputTokens: 100, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 50, reasoningTokens: 0, aiCredits: 5, totalUsd: 0.05 },
            { model: "claude-sonnet-4.6", requests: 2, inputTokens: 200, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 100, reasoningTokens: 0, aiCredits: 10, totalUsd: 0.10 },
        ];
        const result = aggregateModelUsage(items);
        assert.equal(result.length, 2);
        // Sorted by aiCredits desc: claude first
        assert.equal(result[0].model, "claude-sonnet-4.6");
        assert.equal(result[1].model, "gpt-5-mini");
    });

    it("returns empty array for null input", () => {
        assert.deepEqual(aggregateModelUsage(null), []);
    });
});

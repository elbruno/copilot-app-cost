import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    BILLING_API_VERSION,
    validateAccountName,
    buildBillingRequest,
    buildGhArgs,
    normalizeBillingResponse,
    classifyBillingError,
} from "../.github/extensions/copilot-app-cost/lib/billing.mjs";

// ---------------------------------------------------------------------------
// validateAccountName
// ---------------------------------------------------------------------------
describe("validateAccountName", () => {
    it("accepts valid username", () => assert.equal(validateAccountName("elbruno"), true));
    it("accepts username with hyphen", () => assert.equal(validateAccountName("el-bruno"), true));
    it("accepts single character", () => assert.equal(validateAccountName("a"), true));
    it("rejects empty string", () => assert.equal(validateAccountName(""), false));
    it("rejects string starting with hyphen", () => assert.equal(validateAccountName("-bad"), false));
    it("rejects string with slash", () => assert.equal(validateAccountName("bad/name"), false));
    it("rejects string with space", () => assert.equal(validateAccountName("bad name"), false));
    it("rejects null", () => assert.equal(validateAccountName(null), false));
    it("rejects non-string", () => assert.equal(validateAccountName(42), false));
    it("rejects name that is 40 chars (over limit)", () => {
        // max 39 chars for following chars, so 40-char name = 1 + 39 = 40 is at boundary
        const name40 = "a" + "b".repeat(38); // 39 chars — valid
        const name41 = "a" + "b".repeat(39); // 40 chars — at boundary (regex is 0-38 for rest = max 39 total)
        assert.equal(validateAccountName(name40), true);
        assert.equal(validateAccountName(name41), false);
    });
});

// ---------------------------------------------------------------------------
// buildGhArgs
// ---------------------------------------------------------------------------
describe("buildGhArgs", () => {
    it("builds user billing path", () => {
        const args = buildGhArgs({ scope: "user", account: "elbruno", year: 2026, month: 6, apiVersion: BILLING_API_VERSION });
        assert.equal(args[0], "api");
        assert.ok(args[1].startsWith("/users/elbruno/settings/billing/ai_credit/usage"));
        assert.ok(args[1].includes("year=2026"));
        assert.ok(args[1].includes("month=6"));
    });

    it("builds organization billing path", () => {
        const args = buildGhArgs({ scope: "organization", account: "my-org", year: 2026, month: 6, apiVersion: BILLING_API_VERSION });
        assert.ok(args[1].startsWith("/organizations/my-org/settings/billing/ai_credit/usage"));
    });

    it("includes Accept and version headers", () => {
        const args = buildGhArgs({ scope: "user", account: "elbruno", year: 2026, month: 6, apiVersion: BILLING_API_VERSION });
        const acceptIdx = args.indexOf("-H");
        assert.ok(acceptIdx > -1);
        assert.ok(args.includes(`X-GitHub-Api-Version: ${BILLING_API_VERSION}`));
    });

    it("throws on invalid account", () => {
        assert.throws(
            () => buildGhArgs({ scope: "user", account: "-bad", year: 2026, month: 6, apiVersion: BILLING_API_VERSION }),
            /Invalid/
        );
    });

    it("omits query params when year/month are not integers", () => {
        const args = buildGhArgs({ scope: "user", account: "elbruno", apiVersion: BILLING_API_VERSION });
        assert.ok(!args[1].includes("?"));
    });
});

// ---------------------------------------------------------------------------
// normalizeBillingResponse
// ---------------------------------------------------------------------------
describe("normalizeBillingResponse", () => {
    const request = { scope: "user", account: "elbruno", year: 2026, month: 6, apiVersion: BILLING_API_VERSION };

    it("handles empty usageItems", () => {
        const result = normalizeBillingResponse(request, { usageItems: [] });
        assert.equal(result.totals.grossAmount, 0);
        assert.equal(result.usageByModel.length, 0);
        assert.equal(result.permissionStatus, "authorized");
        assert.equal(result.confidence, "official");
    });

    it("aggregates by model", () => {
        const payload = {
            usageItems: [
                { model: "gpt-5-mini", grossQuantity: 10, grossAmount: 0.5, discountQuantity: 0, discountAmount: 0, netQuantity: 10, netAmount: 0.5, product: "Copilot", sku: "sku1", unitType: "request", pricePerUnit: 0.05 },
                { model: "gpt-5-mini", grossQuantity: 5, grossAmount: 0.25, discountQuantity: 0, discountAmount: 0, netQuantity: 5, netAmount: 0.25, product: "Copilot", sku: "sku1", unitType: "request", pricePerUnit: 0.05 },
                { model: "claude-sonnet-4.6", grossQuantity: 2, grossAmount: 1.0, discountQuantity: 0, discountAmount: 0, netQuantity: 2, netAmount: 1.0, product: "Copilot", sku: "sku2", unitType: "request", pricePerUnit: 0.5 },
            ],
        };
        const result = normalizeBillingResponse(request, payload);
        assert.equal(result.usageByModel.length, 2);
        const mini = result.usageByModel.find((m) => m.model === "gpt-5-mini");
        assert.equal(mini.grossQuantity, 15);
        assert.equal(result.totals.grossAmount, 1.75);
    });

    it("sets reliability to managed-license-or-no-personal-usage for empty user data", () => {
        const result = normalizeBillingResponse(request, { usageItems: [] });
        assert.equal(result.reliability, "managed-license-or-no-personal-usage");
        assert.ok(result.managedLicenseNote !== null);
    });

    it("sets reliability to authoritative-scope for org with data", () => {
        const orgRequest = { ...request, scope: "organization", account: "my-org" };
        const result = normalizeBillingResponse(orgRequest, { usageItems: [] });
        assert.equal(result.reliability, "authoritative-scope");
        assert.equal(result.managedLicenseNote, null);
    });
});

// ---------------------------------------------------------------------------
// classifyBillingError
// ---------------------------------------------------------------------------
describe("classifyBillingError", () => {
    it("classifies user scope errors", () => {
        assert.equal(classifyBillingError('needs the "user" scope', "user"), "missing-user-scope");
    });
    it("classifies HTTP 403 for org as missing-organization-permission", () => {
        assert.equal(classifyBillingError("HTTP 403 Forbidden", "organization"), "missing-organization-permission");
    });
    it("classifies HTTP 403 for user as forbidden", () => {
        assert.equal(classifyBillingError("HTTP 403 Forbidden", "user"), "forbidden");
    });
    it("classifies HTTP 401", () => {
        assert.equal(classifyBillingError("HTTP 401 Unauthorized", "user"), "unauthorized");
    });
    it("classifies HTTP 404 for user", () => {
        assert.equal(classifyBillingError("HTTP 404 Not Found", "user"), "not-found-or-no-billed-usage");
    });
    it("classifies HTTP 429", () => {
        assert.equal(classifyBillingError("HTTP 429 rate limit exceeded", "user"), "rate-limited");
    });
    it("classifies HTTP 500 as server-error", () => {
        assert.equal(classifyBillingError("HTTP 500 Internal Server Error", "user"), "server-error");
    });
    it("classifies unknown errors as request-failed", () => {
        assert.equal(classifyBillingError("network timeout", "user"), "request-failed");
    });
});

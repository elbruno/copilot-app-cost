/**
 * @typedef {Object} BillingRequest
 * @property {string} scope - "user" or "organization"
 * @property {string} account - GitHub username or org name
 * @property {number} year - Year (e.g. 2026)
 * @property {number} month - Month 1-12
 * @property {string} apiVersion - GitHub API version header
 */

/**
 * @typedef {Object} BillingResponse
 * @property {string} source - "GITHUB BILLING"
 * @property {string} scope - "user" or "organization"
 * @property {string} account - GitHub account name
 * @property {string} freshness - "point-in-time"
 * @property {string} confidence - "official"
 * @property {string} retrievedAt - ISO 8601 timestamp
 * @property {{ year: number; month: number }} timePeriod - Billing period
 * @property {{ grossQuantity: number; grossAmount: number; discountQuantity: number; discountAmount: number; netQuantity: number; netAmount: number }} totals - Aggregate usage
 * @property {Array<Object>} usageByModel - Per-model usage breakdown
 * @property {string} reliability - "authoritative-scope" or "managed-license-or-no-personal-usage"
 * @property {boolean} availability - true if data available
 * @property {string|null} managedLicenseNote - Explanation if no personal usage
 */

export const BILLING_API_VERSION = "2026-03-10";

/**
 * Validate a GitHub username or organization name.
 * @param {string|unknown} value - Account name to validate
 * @returns {boolean} - true if valid (alphanumeric + hyphens, 1-39 chars, no leading hyphen)
 */
export function validateAccountName(value) {
    return typeof value === "string" && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(value);
}

export function buildBillingRequest(settings, authStatus) {
    const scope = settings?.billingScope === "organization" ? "organization" : "user";
    const account = scope === "organization"
        ? String(settings?.organizationAccount ?? "").trim()
        : String(settings?.userAccount ?? authStatus?.login ?? "").trim();

    return {
        scope,
        account,
        year: Number(settings?.billingYear),
        month: Number(settings?.billingMonth),
        apiVersion: BILLING_API_VERSION,
    };
}

/**
 * Build fixed `gh api` arguments for a billing request.
 * @param {BillingRequest} request - Billing request details
 * @returns {Array<string>} - Fixed arguments for execFile("gh", args)
 * @throws {Error} - If account name is invalid
 */
export function buildGhArgs(request) {
    if (!validateAccountName(request?.account)) {
        throw new Error(`Invalid ${request?.scope ?? "billing"} account.`);
    }

    const basePath = request.scope === "organization"
        ? `/organizations/${request.account}/settings/billing/ai_credit/usage`
        : `/users/${request.account}/settings/billing/ai_credit/usage`;

    const search = new URLSearchParams();
    if (Number.isInteger(request.year)) {
        search.set("year", String(request.year));
    }
    if (Number.isInteger(request.month)) {
        search.set("month", String(request.month));
    }

    const pathWithQuery = search.size > 0 ? `${basePath}?${search.toString()}` : basePath;
    return [
        "api",
        pathWithQuery,
        "-H",
        "Accept: application/vnd.github+json",
        "-H",
        `X-GitHub-Api-Version: ${request.apiVersion ?? BILLING_API_VERSION}`,
    ];
}

/**
 * Normalize and structure a GitHub Billing API response.
 * @param {BillingRequest} request - Original request (for context)
 * @param {Object} payload - Raw API response payload
 * @param {{ retrievedAt?: string }} [options] - Options
 * @returns {BillingResponse} - Normalized response
 */
export function normalizeBillingResponse(request, payload, options = {}) {
    const usageItems = Array.isArray(payload?.usageItems) ? payload.usageItems : [];
    const totals = usageItems.reduce((acc, item) => ({
        grossQuantity: acc.grossQuantity + numberOrZero(item?.grossQuantity),
        grossAmount: acc.grossAmount + numberOrZero(item?.grossAmount),
        discountQuantity: acc.discountQuantity + numberOrZero(item?.discountQuantity),
        discountAmount: acc.discountAmount + numberOrZero(item?.discountAmount),
        netQuantity: acc.netQuantity + numberOrZero(item?.netQuantity),
        netAmount: acc.netAmount + numberOrZero(item?.netAmount),
    }), {
        grossQuantity: 0,
        grossAmount: 0,
        discountQuantity: 0,
        discountAmount: 0,
        netQuantity: 0,
        netAmount: 0,
    });

    const usageByModelMap = new Map();
    for (const item of usageItems) {
        const model = readString(item?.model) ?? "(unspecified)";
        const target = usageByModelMap.get(model) ?? {
            model,
            product: readString(item?.product) ?? null,
            sku: readString(item?.sku) ?? null,
            grossQuantity: 0,
            grossAmount: 0,
            discountQuantity: 0,
            discountAmount: 0,
            netQuantity: 0,
            netAmount: 0,
            unitType: readString(item?.unitType) ?? null,
            pricePerUnit: item?.pricePerUnit ?? null,
        };
        target.grossQuantity += numberOrZero(item?.grossQuantity);
        target.grossAmount += numberOrZero(item?.grossAmount);
        target.discountQuantity += numberOrZero(item?.discountQuantity);
        target.discountAmount += numberOrZero(item?.discountAmount);
        target.netQuantity += numberOrZero(item?.netQuantity);
        target.netAmount += numberOrZero(item?.netAmount);
        usageByModelMap.set(model, target);
    }

    const usageByModel = Array.from(usageByModelMap.values()).sort((a, b) => b.netAmount - a.netAmount || b.netQuantity - a.netQuantity);
    const reliability = request.scope === "organization"
        ? "authoritative-scope"
        : totals.netQuantity > 0
            ? "authoritative-scope"
            : "managed-license-or-no-personal-usage";

    return {
        source: "GITHUB BILLING",
        scope: request.scope,
        account: request.account,
        freshness: "point-in-time",
        confidence: "official",
        retrievedAt: options.retrievedAt ?? new Date().toISOString(),
        apiVersion: request.apiVersion ?? BILLING_API_VERSION,
        timePeriod: payload?.timePeriod ?? { year: request.year, month: request.month },
        product: payload?.product ?? null,
        model: payload?.model ?? null,
        user: payload?.user ?? null,
        organization: payload?.organization ?? null,
        totals,
        usageByModel,
        usageItemCount: usageItems.length,
        permissionStatus: "authorized",
        availability: true,
        reliability,
        managedLicenseNote: request.scope === "user" && totals.netQuantity <= 0
            ? "Personal billing may be empty when Copilot usage is managed and billed by an organization or enterprise."
            : null,
    };
}

/**
 * Classify a billing API error to an actionable error code.
 * @param {string|unknown} message - Error message
 * @param {string} scope - "user" or "organization"
 * @returns {string} - Error classification code
 */
export function classifyBillingError(message, scope) {
    const text = String(message ?? "");
    if (/needs the "user" scope/i.test(text)) {
        return "missing-user-scope";
    }
    if (/HTTP 403|Forbidden/i.test(text)) {
        return scope === "organization" ? "missing-organization-permission" : "forbidden";
    }
    if (/HTTP 401|Unauthorized/i.test(text)) {
        return "unauthorized";
    }
    if (/HTTP 404|Not Found/i.test(text)) {
        return scope === "organization" ? "not-found-or-no-org-access" : "not-found-or-no-billed-usage";
    }
    if (/HTTP 429|rate limit/i.test(text)) {
        return "rate-limited";
    }
    if (/HTTP 5\d\d/i.test(text)) {
        return "server-error";
    }
    return "request-failed";
}

function readString(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    return String(value);
}

function numberOrZero(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

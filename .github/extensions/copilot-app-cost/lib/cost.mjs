/**
 * @typedef {Object} SessionMetrics
 * @property {string} [currentModel] - Active model name
 * @property {number} [totalNanoAiu] - Session total in nano AI units (1B = 1 credit)
 * @property {number} [totalUserRequests] - Total requests in session
 * @property {number} [totalPremiumRequestCost] - Premium request cost
 * @property {number} [totalApiDurationMs] - Total API call duration
 * @property {string} [sessionStartTime] - ISO 8601 timestamp
 * @property {number} [lastCallInputTokens] - Input tokens in last call
 * @property {number} [lastCallOutputTokens] - Output tokens in last call
 * @property {{ inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; reasoningTokens: number; }} [modelMetrics] - Per-model token buckets
 * @property {{ linesAdded?: number; linesRemoved?: number; filesModifiedCount?: number; }} [codeChanges] - Code edit counts
 */

/**
 * @typedef {Object} SessionUsage
 * @property {string} sessionId - Session identifier
 * @property {string} source - Data source (e.g. "session.rpc.usage.getMetrics")
 * @property {string} metricsTimestamp - When metrics were captured (ISO 8601)
 * @property {string|null} currentModel - Active model or null
 * @property {number|undefined} totalNanoAiu - Total nano AIU (0 if no usage, undefined if unavailable)
 * @property {number|undefined} totalUserRequests - Request count or undefined
 * @property {Array<ModelUsageItem>} modelUsage - Per-model breakdown
 * @property {{ linesAdded?: number; linesRemoved?: number; filesModifiedCount?: number; }} codeChanges - Code edit counts
 */

/**
 * @typedef {Object} ModelUsageItem
 * @property {string} model - Model identifier
 * @property {number} requests - Request count
 * @property {number} inputTokens - Uncached input tokens
 * @property {number} cachedInputTokens - Cached input tokens (10% cost)
 * @property {number} cacheWriteTokens - Cache write tokens
 * @property {number} outputTokens - Output tokens
 * @property {number} reasoningTokens - Extended thinking tokens (optional cost)
 * @property {number|undefined} totalNanoAiu - Direct AIU measurement if available
 */

/**
 * @typedef {Object} SessionEstimate
 * @property {string} plan - Normalized plan ID (pro, pro-plus, enterprise, etc.)
 * @property {string} currency - Always "USD"
 * @property {number} totalUsd - Estimated USD cost
 * @property {number} aiCredits - Estimated AI credits (totalUsd / 0.01)
 * @property {number|undefined} totalNanoAiu - Direct nano AIU if available
 * @property {number} includedAiCredits - Plan allowance (0 if pooled or free)
 * @property {number|null} allowanceUsagePercentage - % of allowance used (null if pooled)
 * @property {boolean} pooledAllowance - true if credits are org-pooled
 * @property {string} calculationMethod - "copilot-aiu" or "token-estimate"
 * @property {string} calculationSource - "copilot-model-aiu", "token-rate-estimate", etc.
 * @property {boolean} billReasoningTokens - Whether reasoning tokens are billed
 * @property {Array<ModelEstimate>} modelBreakdown - Per-model cost breakdown
 */

/**
 * @typedef {Object} ModelEstimate
 * @property {string} model - Model ID
 * @property {string} displayName - User-facing model name
 * @property {number} requests - Request count
 * @property {number} inputTokens - Uncached input
 * @property {number} cachedInputTokens - Cached input
 * @property {number} cacheWriteTokens - Cache writes
 * @property {number} outputTokens - Output
 * @property {number} reasoningTokens - Reasoning tokens
 * @property {number} uncachedInputTokens - Calculated uncached input
 * @property {number|undefined} totalNanoAiu - Direct AIU if available
 * @property {number} totalUsd - Estimated USD for this model
 * @property {number} aiCredits - Estimated credits for this model
 * @property {string|null} rateTier - "default" or "long-context"
 * @property {string} creditCalculationMethod - "copilot-aiu" or "token-estimate"
 * @property {string} creditCalculationSource - How cost was determined
 */

/**
 * @typedef {Object} PlanAllowance
 * @property {number} baseAiCredits - Base monthly allocation
 * @property {number} flexAiCredits - Flex allocation
 * @property {number} promotionalAiCredits - Promotional allocation
 * @property {number} totalAiCredits - Sum total
 * @property {boolean} pooled - true if org-level pooled, false if personal
 */

const AI_CREDIT_USD = 0.01;
const NANO_AI_UNITS_PER_AI_CREDIT = 1_000_000_000;
const TOKENS_PER_MILLION = 1_000_000;

const PLAN_ALLOTMENTS = Object.freeze({
    free: { baseAiCredits: 0, flexAiCredits: 0, promotionalAiCredits: 0, totalAiCredits: 0, pooled: false },
    pro: { baseAiCredits: 1000, flexAiCredits: 500, promotionalAiCredits: 0, totalAiCredits: 1500, pooled: false },
    "pro-plus": { baseAiCredits: 3900, flexAiCredits: 3100, promotionalAiCredits: 0, totalAiCredits: 7000, pooled: false },
    max: { baseAiCredits: 10000, flexAiCredits: 10000, promotionalAiCredits: 0, totalAiCredits: 20000, pooled: false },
    business: { baseAiCredits: 1900, flexAiCredits: 0, promotionalAiCredits: 1100, totalAiCredits: 3000, pooled: true },
    enterprise: { baseAiCredits: 3900, flexAiCredits: 0, promotionalAiCredits: 3100, totalAiCredits: 7000, pooled: true },
    student: { baseAiCredits: 0, flexAiCredits: 0, promotionalAiCredits: 0, totalAiCredits: 0, pooled: false },
});

const MODEL_ALIASES = Object.freeze({
    "gpt-5 mini": "gpt-5-mini",
    "gpt-5.4 mini": "gpt-5.4-mini",
    "gpt-5.4 nano": "gpt-5.4-nano",
    "claude haiku 4.5": "claude-haiku-4.5",
    "claude sonnet 4": "claude-sonnet-4",
    "claude sonnet 4.5": "claude-sonnet-4.5",
    "claude sonnet 4.6": "claude-sonnet-4.6",
    "claude opus 4.5": "claude-opus-4.5",
    "claude opus 4.6": "claude-opus-4.6",
    "claude opus 4.7": "claude-opus-4.7",
    "claude opus 4.8": "claude-opus-4.8",
    "claude fable 5": "claude-fable-5",
    "gemini 2.5 pro": "gemini-2.5-pro",
    "gemini 3 flash": "gemini-3-flash",
    "gemini 3.1 pro": "gemini-3.1-pro",
    "gemini 3.5 flash": "gemini-3.5-flash",
    goldeneye: "mai-code-1-flash",
    "mai code 1 flash": "mai-code-1-flash",
    "raptor mini": "raptor-mini",
});

const MODEL_RATES = Object.freeze({
    "gpt-5-mini": rate({ input: 0.25, cachedInput: 0.025, output: 2 }),
    "gpt-5.3-codex": rate({ input: 1.75, cachedInput: 0.175, output: 14 }),
    "gpt-5.4": rate({ input: 2.5, cachedInput: 0.25, output: 15, longContext: { thresholdInputTokens: 272000, input: 5, cachedInput: 0.5, output: 22.5 } }),
    "gpt-5.4-mini": rate({ input: 0.75, cachedInput: 0.075, output: 4.5 }),
    "gpt-5.4-nano": rate({ input: 0.2, cachedInput: 0.02, output: 1.25 }),
    "gpt-5.5": rate({ input: 5, cachedInput: 0.5, output: 30, longContext: { thresholdInputTokens: 272000, input: 10, cachedInput: 1, output: 45 } }),
    "claude-haiku-4.5": rate({ input: 1, cachedInput: 0.1, cacheWrite: 1.25, output: 5 }),
    "claude-sonnet-4": rate({ input: 3, cachedInput: 0.3, cacheWrite: 3.75, output: 15 }),
    "claude-sonnet-4.5": rate({ input: 3, cachedInput: 0.3, cacheWrite: 3.75, output: 15 }),
    "claude-sonnet-4.6": rate({ input: 3, cachedInput: 0.3, cacheWrite: 3.75, output: 15 }),
    "claude-opus-4.5": rate({ input: 5, cachedInput: 0.5, cacheWrite: 6.25, output: 25 }),
    "claude-opus-4.6": rate({ input: 5, cachedInput: 0.5, cacheWrite: 6.25, output: 25 }),
    "claude-opus-4.7": rate({ input: 5, cachedInput: 0.5, cacheWrite: 6.25, output: 25 }),
    "claude-opus-4.8": rate({ input: 5, cachedInput: 0.5, cacheWrite: 6.25, output: 25 }),
    "claude-fable-5": rate({ input: 10, cachedInput: 1, cacheWrite: 12.5, output: 50 }),
    "gemini-2.5-pro": rate({ input: 1.25, cachedInput: 0.125, output: 10 }),
    "gemini-3-flash": rate({ input: 0.5, cachedInput: 0.05, output: 3 }),
    "gemini-3.1-pro": rate({ input: 2, cachedInput: 0.2, output: 12, longContext: { thresholdInputTokens: 200000, input: 4, cachedInput: 0.4, output: 18 } }),
    "gemini-3.5-flash": rate({ input: 1.5, cachedInput: 0.15, output: 9 }),
    "mai-code-1-flash": rate({ input: 0.75, cachedInput: 0.075, output: 4.5 }),
    "raptor-mini": rate({ input: 0.25, cachedInput: 0.025, output: 2 }),
});

/**
 * Normalize a plan ID to the canonical form.
 * @param {string|null|undefined} plan - Plan name (case-insensitive, handles aliases)
 * @returns {string} - Canonical plan ID (pro, pro-plus, max, enterprise, etc.)
 */
export function normalizePlanId(plan) {
    const normalized = String(plan ?? "pro").trim().toLowerCase().replace(/[_\s]+/g, "-");
    if (["pro+", "pro-plus", "proplus", "copilot-pro+", "copilot-pro-plus", "github-copilot-pro-plus"].includes(normalized)) {
        return "pro-plus";
    }
    if (["copilot-max", "github-copilot-max"].includes(normalized)) {
        return "max";
    }
    if (["individual", "copilot-pro", "github-copilot-pro"].includes(normalized)) {
        return "pro";
    }
    if (normalized === "enterprise-cloud") {
        return "enterprise";
    }
    return normalized;
}

/**
 * Get the monthly AI credit allowance for a plan.
 * @param {string|null|undefined} plan - Plan ID or name
 * @returns {PlanAllowance} - Allowance object with base, flex, promotional, and pooled status
 */
export function getPlanAllowance(plan) {
    return PLAN_ALLOTMENTS[normalizePlanId(plan)] ?? PLAN_ALLOTMENTS.pro;
}

/**
 * Normalize raw session metrics from session.rpc.usage.getMetrics() into a structured usage object.
 * @param {string} sessionId - Session identifier
 * @param {SessionMetrics|null} metrics - Raw metrics from the Copilot SDK
 * @param {{ source?: string; metricsTimestamp?: string }} [metadata] - Optional metadata
 * @returns {SessionUsage} - Normalized usage object
 */
export function metricsToSessionUsage(sessionId, metrics, metadata = {}) {
    const modelMetrics = metrics?.modelMetrics && typeof metrics.modelMetrics === "object"
        ? metrics.modelMetrics
        : {};
    return {
        sessionId,
        source: metadata.source ?? "session.rpc.usage.getMetrics",
        metricsTimestamp: metadata.metricsTimestamp ?? new Date().toISOString(),
        currentModel: metrics?.currentModel ?? null,
        totalNanoAiu: readOptionalNumber(metrics?.totalNanoAiu),
        totalUserRequests: readOptionalNumber(metrics?.totalUserRequests),
        totalPremiumRequestCost: readOptionalNumber(metrics?.totalPremiumRequestCost),
        totalApiDurationMs: readOptionalNumber(metrics?.totalApiDurationMs),
        sessionStartTime: metrics?.sessionStartTime ?? null,
        lastCallInputTokens: readOptionalNumber(metrics?.lastCallInputTokens),
        lastCallOutputTokens: readOptionalNumber(metrics?.lastCallOutputTokens),
        codeChanges: {
            linesAdded: readOptionalNumber(metrics?.codeChanges?.linesAdded),
            linesRemoved: readOptionalNumber(metrics?.codeChanges?.linesRemoved),
            filesModifiedCount: readOptionalNumber(metrics?.codeChanges?.filesModifiedCount),
        },
        modelUsage: Object.entries(modelMetrics).map(([model, item]) => ({
            model,
            requests: readOptionalNumber(item?.requests?.count) ?? 0,
            inputTokens: readOptionalNumber(item?.usage?.inputTokens) ?? 0,
            cachedInputTokens: readOptionalNumber(item?.usage?.cacheReadTokens) ?? 0,
            cacheWriteTokens: readOptionalNumber(item?.usage?.cacheWriteTokens) ?? 0,
            outputTokens: readOptionalNumber(item?.usage?.outputTokens) ?? 0,
            reasoningTokens: readOptionalNumber(item?.usage?.reasoningTokens) ?? 0,
            totalNanoAiu: readOptionalNumber(item?.totalNanoAiu),
        })),
    };
}

/**
 * Calculate a session cost estimate from normalized usage data.
 * Prefers direct nano-AIU if available; falls back to token-rate estimates.
 * @param {SessionUsage|null} sessionUsage - Normalized session usage
 * @param {{ plan?: string; billReasoningTokens?: boolean }} [options] - Calculation options
 * @returns {SessionEstimate} - Cost estimate with breakdown
 */
export function calculateSessionEstimate(sessionUsage, options = {}) {
    const plan = normalizePlanId(options.plan ?? sessionUsage?.plan ?? "pro");
    const billReasoningTokens = options.billReasoningTokens === true;
    const modelBreakdown = (sessionUsage?.modelUsage ?? []).map((usage) => {
        const modelId = resolveKnownModelId(usage.model);
        const rateEntry = MODEL_RATES[modelId];
        const rate = selectRate(rateEntry, usage);
        const directAiCredits = readDirectAiCredits(usage, "copilot-model-aiu");
        const uncachedInputTokens = Math.max(numberOrZero(usage.inputTokens) - numberOrZero(usage.cachedInputTokens), 0);
        const inputUsd = rate ? costForTokens(uncachedInputTokens, rate.inputPerMillionUsd) : 0;
        const cachedInputUsd = rate ? costForTokens(usage.cachedInputTokens, rate.cachedInputPerMillionUsd) : 0;
        const cacheWriteUsd = rate ? costForTokens(usage.cacheWriteTokens, rate.cacheWritePerMillionUsd) : 0;
        const outputUsd = rate ? costForTokens(usage.outputTokens, rate.outputPerMillionUsd) : 0;
        const reasoningUsd = rate && billReasoningTokens ? costForTokens(usage.reasoningTokens, rate.outputPerMillionUsd) : 0;
        const tokenEstimatedTotalUsd = round(inputUsd + cachedInputUsd + cacheWriteUsd + outputUsd + reasoningUsd);
        const aiCredits = directAiCredits?.aiCredits ?? usdToAiCredits(tokenEstimatedTotalUsd);
        const totalUsd = directAiCredits ? aiCreditsToUsd(directAiCredits.aiCredits) : tokenEstimatedTotalUsd;
        return {
            model: modelId,
            displayName: usage.model,
            requests: numberOrZero(usage.requests),
            inputTokens: numberOrZero(usage.inputTokens),
            cachedInputTokens: numberOrZero(usage.cachedInputTokens),
            cacheWriteTokens: numberOrZero(usage.cacheWriteTokens),
            outputTokens: numberOrZero(usage.outputTokens),
            reasoningTokens: numberOrZero(usage.reasoningTokens),
            uncachedInputTokens,
            totalNanoAiu: directAiCredits?.totalNanoAiu,
            totalUsd,
            aiCredits,
            rateTier: rate?.tier ?? null,
            creditCalculationMethod: directAiCredits ? "copilot-aiu" : "token-estimate",
            creditCalculationSource: directAiCredits?.source ?? "token-rate-estimate",
        };
    });

    const directSessionAiCredits = readDirectAiCredits(sessionUsage, "copilot-session-aiu");
    const totalUsd = directSessionAiCredits
        ? aiCreditsToUsd(directSessionAiCredits.aiCredits)
        : round(sum(modelBreakdown.map((item) => item.totalUsd)));
    const aiCredits = directSessionAiCredits?.aiCredits ?? usdToAiCredits(totalUsd);
    const allowance = getPlanAllowance(plan);
    return {
        plan,
        currency: "USD",
        totalUsd,
        aiCredits,
        totalNanoAiu: directSessionAiCredits?.totalNanoAiu ?? readOptionalNumber(sessionUsage?.totalNanoAiu),
        includedAiCredits: allowance.totalAiCredits,
        allowanceUsagePercentage: allowance.totalAiCredits > 0 ? round((aiCredits / allowance.totalAiCredits) * 100) : null,
        pooledAllowance: allowance.pooled,
        calculationMethod: directSessionAiCredits ? "copilot-aiu" : "token-estimate",
        calculationSource: directSessionAiCredits?.source ?? getBreakdownMethod(modelBreakdown),
        billReasoningTokens,
        modelBreakdown,
    };
}

/**
 * Aggregate model usage across multiple sessions or data points.
 * Sums requests, tokens, and costs by model; sorts by cost descending.
 * @param {Array<ModelEstimate>|null} items - Model usage items to aggregate
 * @returns {Array<Object>} - Sorted, aggregated per-model breakdown
 */
export function aggregateModelUsage(items) {
    const byModel = new Map();
    for (const item of items ?? []) {
        const key = resolveKnownModelId(item.model ?? item.displayName ?? "unknown");
        const target = byModel.get(key) ?? {
            model: key,
            displayName: item.displayName ?? item.model ?? key,
            requests: 0,
            inputTokens: 0,
            cachedInputTokens: 0,
            cacheWriteTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            aiCredits: 0,
            totalUsd: 0,
            samples: 0,
        };
        target.requests += numberOrZero(item.requests);
        target.inputTokens += numberOrZero(item.inputTokens);
        target.cachedInputTokens += numberOrZero(item.cachedInputTokens);
        target.cacheWriteTokens += numberOrZero(item.cacheWriteTokens);
        target.outputTokens += numberOrZero(item.outputTokens);
        target.reasoningTokens += numberOrZero(item.reasoningTokens);
        target.aiCredits += numberOrZero(item.aiCredits);
        target.totalUsd += numberOrZero(item.totalUsd);
        target.samples += 1;
        byModel.set(key, target);
    }
    return Array.from(byModel.values()).sort((a, b) => b.aiCredits - a.aiCredits || b.totalUsd - a.totalUsd);
}

function resolveKnownModelId(model) {
    // Normalize model name to canonical ID (e.g. "claude sonnet 4.6" => "claude-sonnet-4.6")
    const raw = String(model ?? "").trim();
    const normalized = MODEL_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase().replace(/\s+/g, "-");
    // Check if we have a rate entry for this model
    if (MODEL_RATES[normalized]) {
        return normalized;
    }
    // If not exact match, find longest prefix match (e.g. "gpt-5.4-special" matches "gpt-5.4")
    return Object.keys(MODEL_RATES)
        .filter((candidate) => normalized.startsWith(candidate))
        .sort((a, b) => b.length - a.length)[0] ?? normalized;
}

function selectRate(rateEntry, usage) {
    // Long-context models have higher rates after a token threshold (e.g. GPT-5.5 > 272k input tokens)
    if (!rateEntry) {
        return undefined;
    }
    const threshold = numberOrZero(rateEntry.longContext?.thresholdInputTokens);
    if (rateEntry.longContext && threshold > 0 && numberOrZero(usage.inputTokens) > threshold) {
        return rateEntry.longContext;
    }
    return rateEntry;
}

function getBreakdownMethod(modelBreakdown) {
    if (modelBreakdown.length === 0) {
        return "token-rate-estimate";
    }
    const aiuCount = modelBreakdown.filter((item) => item.creditCalculationMethod === "copilot-aiu").length;
    if (aiuCount === modelBreakdown.length) {
        return "copilot-model-aiu";
    }
    if (aiuCount > 0) {
        return "mixed-model-aiu-token-estimate";
    }
    return "token-rate-estimate";
}

function readDirectAiCredits(value, source) {
    // If the Copilot SDK reports totalNanoAiu directly, use it instead of token-rate estimation
    // This is more accurate because it reflects what GitHub actually charged via AIU billing
    const totalNanoAiu = readOptionalNumber(value?.totalNanoAiu);
    if (totalNanoAiu !== undefined) {
        return {
            aiCredits: round(totalNanoAiu / NANO_AI_UNITS_PER_AI_CREDIT),
            source,
            totalNanoAiu,
        };
    }
    return undefined;
}

function costForTokens(tokens, perMillionUsd) {
    // Calculate cost from token count using per-million pricing (e.g. $0.25 per 1M input tokens)
    return round((numberOrZero(tokens) / TOKENS_PER_MILLION) * numberOrZero(perMillionUsd));
}

function usdToAiCredits(usd) {
    return round(numberOrZero(usd) / AI_CREDIT_USD);
}

function aiCreditsToUsd(aiCredits) {
    return round(numberOrZero(aiCredits) * AI_CREDIT_USD);
}

function sum(values) {
    return values.reduce((total, value) => total + numberOrZero(value), 0);
}

function numberOrZero(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function readOptionalNumber(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function round(value) {
    // Round to 6 decimal places using epsilon to avoid floating-point precision issues
    // E.g. 0.1 + 0.2 in JavaScript = 0.30000000000000004, but we want 0.3
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 1000000) / 1000000;
}

function rate({ input, cachedInput, cacheWrite = 0, output, longContext }) {
    const base = {
        tier: "default",
        inputPerMillionUsd: input,
        cachedInputPerMillionUsd: cachedInput,
        cacheWritePerMillionUsd: cacheWrite,
        outputPerMillionUsd: output,
    };
    if (!longContext) {
        return base;
    }
    return {
        ...base,
        longContext: {
            tier: "long-context",
            thresholdInputTokens: longContext.thresholdInputTokens,
            inputPerMillionUsd: longContext.input,
            cachedInputPerMillionUsd: longContext.cachedInput,
            cacheWritePerMillionUsd: longContext.cacheWrite ?? cacheWrite,
            outputPerMillionUsd: longContext.output,
        },
    };
}

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

export function getPlanAllowance(plan) {
    return PLAN_ALLOTMENTS[normalizePlanId(plan)] ?? PLAN_ALLOTMENTS.pro;
}

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
    const raw = String(model ?? "").trim();
    const normalized = MODEL_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase().replace(/\s+/g, "-");
    if (MODEL_RATES[normalized]) {
        return normalized;
    }
    return Object.keys(MODEL_RATES)
        .filter((candidate) => normalized.startsWith(candidate))
        .sort((a, b) => b.length - a.length)[0] ?? normalized;
}

function selectRate(rateEntry, usage) {
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

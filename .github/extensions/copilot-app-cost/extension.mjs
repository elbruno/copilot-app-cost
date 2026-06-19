// Extension: copilot-app-cost
// Canvas extension for Copilot session and billing cost observability

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { metricsToSessionUsage, calculateSessionEstimate, aggregateModelUsage, getPlanAllowance } from "./lib/cost.mjs";
import { listRecentSessionUsages, getSessionStateDirectory } from "./lib/history.mjs";
import { loadSettings, saveSettings, resetSettings, getAppDataDirectory, getSettingsPath } from "./lib/settings.mjs";
import { BILLING_API_VERSION, buildBillingRequest, buildGhArgs, normalizeBillingResponse, classifyBillingError, validateAccountName } from "./lib/billing.mjs";

const execFileAsync = promisify(execFile);
const EXTENSION_VERSION = "0.1.0";
const GH_TIMEOUT_MS = 10000;
const LIVE_STALE_MS = 10000;
const SESSIONS_STALE_MS = 60000;
const BILLING_STALE_MS = 15 * 60 * 1000;
const servers = new Map();
const extensionDirectory = path.dirname(fileURLToPath(import.meta.url));
const htmlTemplatePath = path.join(extensionDirectory, "assets", "index.html");

const state = {
    settings: loadSettings(),
    providers: {
        live: createProviderState("LIVE ESTIMATE", "active-session"),
        billing: createProviderState("GITHUB BILLING", "user"),
        sessions: createProviderState("LOCAL SESSION", "local-history"),
    },
    data: {
        live: null,
        billing: null,
        sessions: [],
        liveTimeline: [],
    },
};

function createProviderState(name, scope) {
    return {
        name,
        scope,
        available: false,
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastError: null,
        stale: true,
        nextScheduledAt: null,
        inFlight: null,
        lastClassification: null,
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function numberOrNull(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
            if (chunks.length <= 0) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch (error) {
                reject(error);
            }
        });
        request.on("error", reject);
    });
}

function json(response, statusCode, payload, extraHeaders = {}) {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    for (const [key, value] of Object.entries(extraHeaders)) {
        response.setHeader(key, value);
    }
    response.end(JSON.stringify(payload, null, 2));
}

function redactError(error) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
    return message
        .replace(/gho_[A-Za-z0-9_]+/g, "gho_***")
        .replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_***");
}

function providerIntervalMs(name) {
    if (name === "live") {
        return Number(state.settings.liveRefreshSeconds) * 1000;
    }
    if (name === "sessions") {
        return Number(state.settings.sessionHistoryRefreshSeconds) * 1000;
    }
    return Number(state.settings.billingRefreshMinutes) * 60 * 1000;
}

function providerStaleMs(name) {
    if (name === "live") {
        return LIVE_STALE_MS;
    }
    if (name === "sessions") {
        return SESSIONS_STALE_MS;
    }
    return BILLING_STALE_MS;
}

function isTerminalBillingClassification(value) {
    return [
        "missing-user-scope",
        "missing-organization-permission",
        "unauthorized",
        "forbidden",
        "not-found-or-no-billed-usage",
        "not-found-or-no-org-access",
    ].includes(value);
}

async function safeGetAuthStatus() {
    try {
        const auth = await session.rpc.auth.getStatus();
        return {
            isAuthenticated: auth?.isAuthenticated === true,
            authType: auth?.authType ?? null,
            host: auth?.host ?? null,
            login: auth?.login ?? null,
            copilotPlan: auth?.copilotPlan ?? null,
            statusMessage: auth?.statusMessage ?? null,
        };
    } catch (error) {
        return {
            isAuthenticated: false,
            authType: null,
            host: null,
            login: null,
            copilotPlan: null,
            statusMessage: null,
            error: redactError(error),
        };
    }
}

function summarizeRuntime() {
    return {
        sessionId: session.sessionId,
        workspacePath: session.workspacePath ?? null,
        capabilityFlags: session.capabilities ?? {},
    };
}

function trimTimeline(limit = 120) {
    if (state.data.liveTimeline.length > limit) {
        state.data.liveTimeline = state.data.liveTimeline.slice(state.data.liveTimeline.length - limit);
    }
}

function addLiveTimelinePoint(snapshot) {
    const aiCredits = numberOrNull(snapshot?.estimate?.aiCredits);
    const totalUsd = numberOrNull(snapshot?.estimate?.totalUsd);
    if (aiCredits === null && totalUsd === null) {
        return;
    }
    state.data.liveTimeline.push({
        at: snapshot.observedAt,
        aiCredits,
        totalUsd,
        source: snapshot.estimate?.calculationMethod === "copilot-aiu" ? "LIVE ESTIMATE" : "TOKEN-RATE FALLBACK",
    });
    trimTimeline();
}

function markProviderStart(name) {
    const provider = state.providers[name];
    provider.lastAttemptAt = new Date().toISOString();
    provider.lastError = null;
}

function markProviderSuccess(name, scope) {
    const provider = state.providers[name];
    provider.available = true;
    provider.scope = scope ?? provider.scope;
    provider.lastSuccessAt = new Date().toISOString();
    provider.lastError = null;
    provider.lastClassification = null;
    provider.stale = false;
    provider.nextScheduledAt = new Date(Date.now() + providerIntervalMs(name)).toISOString();
}

function markProviderFailure(name, error, classification, scope) {
    const provider = state.providers[name];
    provider.available = false;
    provider.scope = scope ?? provider.scope;
    provider.lastError = redactError(error);
    provider.lastClassification = classification ?? null;
    provider.stale = true;
    provider.nextScheduledAt = new Date(Date.now() + providerIntervalMs(name)).toISOString();
}

function providerAgeMs(lastSuccessAt) {
    return lastSuccessAt ? Math.max(Date.now() - Date.parse(lastSuccessAt), 0) : Number.POSITIVE_INFINITY;
}

function computeProviderStatus(name) {
    const provider = state.providers[name];
    const staleMs = providerStaleMs(name);
    const ageMs = providerAgeMs(provider.lastSuccessAt);
    return {
        ...provider,
        stale: !provider.lastSuccessAt || ageMs > staleMs,
        ageMs: Number.isFinite(ageMs) ? ageMs : null,
        intervalMs: providerIntervalMs(name),
    };
}

async function refreshLiveProvider() {
    const provider = state.providers.live;
    if (provider.inFlight) {
        return provider.inFlight;
    }

    provider.inFlight = (async () => {
        markProviderStart("live");
        const observedAt = new Date().toISOString();
        const auth = await safeGetAuthStatus();
        try {
            const metrics = await session.rpc.usage.getMetrics();
            const usage = metricsToSessionUsage(session.sessionId, metrics, { metricsTimestamp: observedAt });
            const plan = auth?.copilotPlan ?? "pro";
            const estimate = calculateSessionEstimate({ ...usage, plan }, {
                plan,
                billReasoningTokens: state.settings.billReasoningTokens,
            });
            const snapshot = {
                source: "LIVE ESTIMATE",
                scope: "active-session",
                freshness: "live",
                confidence: usage.totalNanoAiu !== undefined ? "reported" : "calculated",
                observedAt,
                runtime: summarizeRuntime(),
                auth,
                usage,
                estimate,
            };
            state.data.live = snapshot;
            addLiveTimelinePoint(snapshot);
            markProviderSuccess("live", "active-session");
            return snapshot;
        } catch (error) {
            const unavailable = {
                source: "LIVE ESTIMATE",
                scope: "active-session",
                freshness: "unavailable",
                confidence: "unavailable",
                observedAt,
                runtime: summarizeRuntime(),
                auth,
                error: redactError(error),
            };
            state.data.live = unavailable;
            markProviderFailure("live", error, "unavailable", "active-session");
            return unavailable;
        } finally {
            provider.inFlight = null;
        }
    })();

    return provider.inFlight;
}

function enrichSessionUsage(rawUsage, plan) {
    const estimate = calculateSessionEstimate({ ...rawUsage, plan }, {
        plan,
        billReasoningTokens: state.settings.billReasoningTokens,
    });
    return {
        ...rawUsage,
        estimate,
    };
}

async function refreshSessionsProvider() {
    const provider = state.providers.sessions;
    if (provider.inFlight) {
        return provider.inFlight;
    }

    provider.inFlight = (async () => {
        markProviderStart("sessions");
        try {
            const auth = await safeGetAuthStatus();
            const plan = auth?.copilotPlan ?? "pro";
            const sessions = listRecentSessionUsages(session.sessionId, { limit: 20 }).map((item) => enrichSessionUsage(item, plan));
            state.data.sessions = sessions;
            markProviderSuccess("sessions", "local-history");
            return sessions;
        } catch (error) {
            state.data.sessions = [];
            markProviderFailure("sessions", error, "unavailable", "local-history");
            return [];
        } finally {
            provider.inFlight = null;
        }
    })();

    return provider.inFlight;
}

async function runBillingRequest(request) {
    const args = buildGhArgs(request);
    const { stdout } = await execFileAsync("gh", args, {
        timeout: GH_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout);
}

async function refreshBillingProvider(force = false) {
    const provider = state.providers.billing;
    if (provider.inFlight) {
        return provider.inFlight;
    }

    provider.inFlight = (async () => {
        markProviderStart("billing");
        const observedAt = new Date().toISOString();
        const auth = await safeGetAuthStatus();
        const request = buildBillingRequest(state.settings, auth);
        provider.scope = request.scope;

        if (!validateAccountName(request.account)) {
            const unavailable = {
                source: "GITHUB BILLING",
                scope: request.scope,
                account: request.account || null,
                freshness: "unavailable",
                confidence: "official-if-authorized",
                observedAt,
                availability: false,
                permissionStatus: "missing-account",
                error: request.scope === "organization"
                    ? "Select an organization account to read official billing data."
                    : "No authenticated user account was available for personal billing.",
            };
            state.data.billing = unavailable;
            markProviderFailure("billing", unavailable.error, "missing-account", request.scope);
            return unavailable;
        }

        try {
            const payload = await runBillingRequest(request);
            const report = normalizeBillingResponse(request, payload, { retrievedAt: observedAt });
            state.data.billing = report;
            markProviderSuccess("billing", request.scope);
            return report;
        } catch (error) {
            const stderr = typeof error?.stderr === "string" ? error.stderr : "";
            const combined = `${error?.message ?? ""}\n${stderr}`.trim();
            const classification = classifyBillingError(combined, request.scope);
            const fallback = {
                source: "GITHUB BILLING",
                scope: request.scope,
                account: request.account,
                freshness: "unavailable",
                confidence: "official-if-authorized",
                observedAt,
                availability: false,
                apiVersion: BILLING_API_VERSION,
                permissionStatus: classification,
                error: redactError(combined),
                managedLicenseNote: request.scope === "user"
                    ? "User billing may be empty or unavailable when Copilot usage is billed to an organization or enterprise."
                    : null,
            };
            if (!state.data.billing || force || !isTerminalBillingClassification(classification)) {
                state.data.billing = fallback;
            }
            markProviderFailure("billing", combined, classification, request.scope);
            return state.data.billing;
        } finally {
            provider.inFlight = null;
        }
    })();

    return provider.inFlight;
}

async function ensureFresh(name, options = {}) {
    const provider = computeProviderStatus(name);
    const intervalMs = providerIntervalMs(name);
    const due = options.force === true || !provider.lastSuccessAt || providerAgeMs(provider.lastSuccessAt) >= intervalMs;
    if (!due) {
        return name === "live" ? state.data.live : name === "billing" ? state.data.billing : state.data.sessions;
    }
    if (name === "live") {
        return await refreshLiveProvider();
    }
    if (name === "billing") {
        return await refreshBillingProvider(options.force === true);
    }
    return await refreshSessionsProvider();
}

function buildRemainingAllowanceCard(billing, auth) {
    if (!billing?.availability || billing.scope !== "user") {
        return null;
    }
    const allowance = getPlanAllowance(auth?.copilotPlan ?? "pro");
    if (allowance.pooled || allowance.totalAiCredits <= 0) {
        return null;
    }
    const remaining = Math.max(allowance.totalAiCredits - numberOrNull(billing?.totals?.netQuantity ?? 0), 0);
    return {
        title: "Remaining Allowance",
        source: "GITHUB BILLING",
        creditsRemaining: remaining,
        usagePercent: allowance.totalAiCredits > 0 ? ((allowance.totalAiCredits - remaining) / allowance.totalAiCredits) * 100 : null,
        reliability: "CALCULATED FROM BILLING DATA",
        pooled: false,
        totalAllowance: allowance.totalAiCredits,
        scope: billing.scope,
    };
}

function buildAlerts(dashboard) {
    const alerts = [];
    const thresholds = dashboard.settings.alerts;
    const sessionEstimate = dashboard.live?.estimate;
    const billingTotals = dashboard.billing?.totals;
    if (thresholds.sessionAiCredits !== null && numberOrNull(sessionEstimate?.aiCredits) !== null && sessionEstimate.aiCredits >= thresholds.sessionAiCredits) {
        alerts.push({ severity: "warning", provider: "live", message: `Active session crossed ${thresholds.sessionAiCredits} AI credits.` });
    }
    if (thresholds.sessionUsd !== null && numberOrNull(sessionEstimate?.totalUsd) !== null && sessionEstimate.totalUsd >= thresholds.sessionUsd) {
        alerts.push({ severity: "warning", provider: "live", message: `Active session crossed $${thresholds.sessionUsd.toFixed(2)} USD.` });
    }
    if (thresholds.monthlyNetUsd !== null && numberOrNull(billingTotals?.netAmount) !== null && billingTotals.netAmount >= thresholds.monthlyNetUsd) {
        alerts.push({ severity: "warning", provider: "billing", message: `Official billing crossed $${thresholds.monthlyNetUsd.toFixed(2)} USD net.` });
    }
    const remaining = dashboard.overview.remainingAllowance;
    const usedPercent = numberOrNull(remaining?.usagePercent);
    if (thresholds.monthlyUsagePercent !== null && usedPercent !== null && usedPercent >= thresholds.monthlyUsagePercent) {
        alerts.push({ severity: "warning", provider: "billing", message: `Billing usage crossed ${thresholds.monthlyUsagePercent}% of the reliable allowance.` });
    }
    if (dashboard.billing && dashboard.billing.availability === false) {
        alerts.push({ severity: "info", provider: "billing", message: dashboard.billing.error ?? "Official billing data is unavailable." });
    }
    return alerts;
}

function buildSessionsSummary(items) {
    const recent = items.map((item) => ({
        sessionId: item.sessionId,
        sessionName: item.sessionName,
        status: item.status,
        updatedAt: item.updatedAt,
        currentModel: item.currentModel,
        aiCredits: item.estimate?.aiCredits ?? null,
        totalUsd: item.estimate?.totalUsd ?? null,
        calculationMethod: item.estimate?.calculationMethod ?? null,
        source: "LOCAL SESSION",
        repository: item.repository,
        branch: item.branch,
    }));
    const ranked = [...recent].sort((a, b) => numberOrNull(b.aiCredits ?? -1) - numberOrNull(a.aiCredits ?? -1));
    return {
        items: recent,
        mostExpensive: ranked.slice(0, 10),
        byModel: aggregateModelUsage(items.map((item) => ({
            model: item.currentModel,
            displayName: item.currentModel,
            requests: item.totalUserRequests ?? 0,
            inputTokens: (item.modelUsage ?? []).reduce((total, model) => total + Number(model.inputTokens ?? 0), 0),
            cachedInputTokens: (item.modelUsage ?? []).reduce((total, model) => total + Number(model.cachedInputTokens ?? 0), 0),
            cacheWriteTokens: (item.modelUsage ?? []).reduce((total, model) => total + Number(model.cacheWriteTokens ?? 0), 0),
            outputTokens: (item.modelUsage ?? []).reduce((total, model) => total + Number(model.outputTokens ?? 0), 0),
            reasoningTokens: (item.modelUsage ?? []).reduce((total, model) => total + Number(model.reasoningTokens ?? 0), 0),
            aiCredits: item.estimate?.aiCredits ?? 0,
            totalUsd: item.estimate?.totalUsd ?? 0,
        }))),
    };
}

function buildDiagnostics(auth) {
    return {
        extensionVersion: EXTENSION_VERSION,
        runtime: summarizeRuntime(),
        enabledProviders: ["live", "billing", "sessions"],
        providers: {
            live: computeProviderStatus("live"),
            billing: computeProviderStatus("billing"),
            sessions: computeProviderStatus("sessions"),
        },
        selectedAccountScope: state.settings.billingScope,
        localPaths: {
            appDataDirectory: getAppDataDirectory(),
            settingsPath: getSettingsPath(),
            sessionStateDirectory: getSessionStateDirectory(),
        },
        apiVersion: BILLING_API_VERSION,
        auth: {
            isAuthenticated: auth?.isAuthenticated ?? false,
            authType: auth?.authType ?? null,
            host: auth?.host ?? null,
            login: auth?.login ?? null,
            copilotPlan: auth?.copilotPlan ?? null,
        },
        effectivePriceTableVersion: "2026-06 reference rates",
        effectivePlanTableVersion: "2026-06 reference plans",
    };
}

async function buildDashboard(options = {}) {
    await Promise.all([
        ensureFresh("live", options),
        ensureFresh("billing", options),
        ensureFresh("sessions", options),
    ]);

    const auth = await safeGetAuthStatus();
    const live = state.data.live;
    const billing = state.data.billing;
    const sessions = buildSessionsSummary(state.data.sessions);
    const remainingAllowance = buildRemainingAllowanceCard(billing, auth);

    const dashboard = {
        generatedAt: new Date().toISOString(),
        extensionVersion: EXTENSION_VERSION,
        auth,
        settings: state.settings,
        overview: {
            currentSession: live?.estimate ? {
                title: "Current Session",
                aiCredits: live.estimate.aiCredits,
                totalUsd: live.estimate.totalUsd,
                source: live.source,
                calculationMethod: live.estimate.calculationMethod,
                currentModel: live.usage?.currentModel ?? null,
                updatedAt: live.observedAt,
            } : null,
            officialMonthlyUsage: billing?.availability ? {
                title: "Month-to-Date",
                netQuantity: billing.totals.netQuantity,
                netAmount: billing.totals.netAmount,
                source: "GITHUB BILLING",
                scope: billing.scope,
                account: billing.account,
                updatedAt: billing.retrievedAt,
            } : null,
            remainingAllowance,
            additionalUsage: null,
        },
        live,
        billing,
        sessions,
        charts: {
            liveTrend: [...state.data.liveTimeline],
            billingByModel: billing?.usageByModel ?? [],
            sessionsByCredits: sessions.mostExpensive,
        },
        providerStatus: {
            live: computeProviderStatus("live"),
            billing: computeProviderStatus("billing"),
            sessions: computeProviderStatus("sessions"),
        },
        diagnostics: buildDiagnostics(auth),
    };
    dashboard.alerts = buildAlerts(dashboard);
    return dashboard;
}

async function getCurrentSessionProbe() {
    return await ensureFresh("live", { force: true });
}

async function getBillingProbe() {
    return await ensureFresh("billing", { force: true });
}

function compareSessions(sessionIds) {
    const items = state.data.sessions.filter((item) => sessionIds.includes(item.sessionId));
    return items.map((item) => ({
        sessionId: item.sessionId,
        sessionName: item.sessionName,
        currentModel: item.currentModel,
        aiCredits: item.estimate?.aiCredits ?? null,
        totalUsd: item.estimate?.totalUsd ?? null,
        totalUserRequests: item.totalUserRequests ?? null,
        modelUsage: item.modelUsage ?? [],
    }));
}

async function refreshRequestedProvider(provider) {
    if (provider === "live") {
        return { live: await ensureFresh("live", { force: true }) };
    }
    if (provider === "billing") {
        return { billing: await ensureFresh("billing", { force: true }) };
    }
    if (provider === "sessions") {
        return { sessions: await ensureFresh("sessions", { force: true }) };
    }
    return await buildDashboard({ force: true });
}

function renderHtml(instanceId) {
    const template = fs.readFileSync(htmlTemplatePath, "utf8");
    return template.replace("__INSTANCE_ID__", escapeHtml(instanceId));
}

async function handleApi(request, response, requestUrl) {
    if (request.method === "GET" && requestUrl.pathname === "/api/status") {
        json(response, 200, await getCurrentSessionProbe());
        return true;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/billing-probe") {
        json(response, 200, await getBillingProbe());
        return true;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/dashboard") {
        json(response, 200, await buildDashboard({ force: requestUrl.searchParams.get("force") === "true" }));
        return true;
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/refresh") {
        json(response, 200, await refreshRequestedProvider(requestUrl.searchParams.get("provider") ?? "all"));
        return true;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/export") {
        json(response, 200, await buildDashboard({ force: false }), {
            "Content-Disposition": `attachment; filename="copilot-app-cost-${Date.now()}.json"`,
        });
        return true;
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/settings") {
        const payload = await readJsonBody(request);
        state.settings = saveSettings(payload);
        json(response, 200, state.settings);
        return true;
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/settings/reset") {
        state.settings = resetSettings();
        json(response, 200, state.settings);
        return true;
    }
    return false;
}

async function startServer(instanceId) {
    const server = createServer(async (request, response) => {
        try {
            const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
            const handled = await handleApi(request, response, requestUrl);
            if (handled) {
                return;
            }
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(renderHtml(instanceId));
        } catch (error) {
            json(response, 500, { error: redactError(error), observedAt: new Date().toISOString() });
        }
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "copilot-app-cost",
            displayName: "copilot-app-cost",
            description: "Read-only canvas for Copilot session cost estimates, local session history, and official billing visibility",
            actions: [
                {
                    name: "get_cost_summary",
                    description: "Return the combined live-estimate, official-billing, and provider-status summary.",
                    handler: async () => await buildDashboard({ force: false }),
                },
                {
                    name: "get_current_session_cost",
                    description: "Return the active session estimated AI credits and USD cost.",
                    handler: async () => (await ensureFresh("live", { force: true }))?.estimate ?? null,
                },
                {
                    name: "get_current_session_usage",
                    description: "Return normalized live token buckets and request statistics.",
                    handler: async () => (await ensureFresh("live", { force: true }))?.usage ?? null,
                },
                {
                    name: "get_billing_summary",
                    description: "Return the selected scope official billing summary when authorized.",
                    handler: async () => await ensureFresh("billing", { force: true }),
                },
                {
                    name: "get_usage_by_model",
                    description: "Return usage grouped by model without merging incompatible scopes.",
                    handler: async (input = {}) => {
                        const source = String(input?.source ?? "live");
                        if (source === "billing") {
                            const billing = await ensureFresh("billing", { force: false });
                            return billing?.usageByModel ?? [];
                        }
                        if (source === "sessions") {
                            await ensureFresh("sessions", { force: false });
                            return buildSessionsSummary(state.data.sessions).byModel;
                        }
                        const live = await ensureFresh("live", { force: false });
                        return live?.estimate?.modelBreakdown ?? [];
                    },
                },
                {
                    name: "get_recent_sessions",
                    description: "Return normalized local session summaries.",
                    handler: async (input = {}) => {
                        await ensureFresh("sessions", { force: false });
                        const limit = Math.max(Math.min(Number(input?.limit ?? 10), 20), 1);
                        return buildSessionsSummary(state.data.sessions).items.slice(0, limit);
                    },
                },
                {
                    name: "get_most_expensive_sessions",
                    description: "Return the most expensive recent local sessions by estimated AI credits.",
                    handler: async (input = {}) => {
                        await ensureFresh("sessions", { force: false });
                        const limit = Math.max(Math.min(Number(input?.limit ?? 10), 20), 1);
                        return buildSessionsSummary(state.data.sessions).mostExpensive.slice(0, limit);
                    },
                },
                {
                    name: "compare_sessions",
                    description: "Compare two or more recent local sessions by model, tokens, credits, and USD.",
                    handler: async (input = {}) => {
                        await ensureFresh("sessions", { force: false });
                        const sessionIds = Array.isArray(input?.sessionIds) ? input.sessionIds.map((item) => String(item)) : [];
                        return compareSessions(sessionIds);
                    },
                },
                {
                    name: "refresh_cost_data",
                    description: "Refresh one provider or all providers and return the updated status.",
                    handler: async (input = {}) => await refreshRequestedProvider(String(input?.provider ?? "all")),
                },
                {
                    name: "get_data_source_status",
                    description: "Return provider availability, freshness, scope, and redacted errors.",
                    handler: async () => ({
                        live: computeProviderStatus("live"),
                        billing: computeProviderStatus("billing"),
                        sessions: computeProviderStatus("sessions"),
                    }),
                },
                {
                    name: "set_local_cost_alert",
                    description: "Update a local alert threshold without mutating GitHub settings.",
                    handler: async (input = {}) => {
                        const key = String(input?.key ?? "");
                        const value = input?.value;
                        const next = structuredClone(state.settings);
                        if (["sessionAiCredits", "sessionUsd", "monthlyUsagePercent", "monthlyNetUsd"].includes(key)) {
                            next.alerts[key] = value;
                        }
                        state.settings = saveSettings(next);
                        return state.settings.alerts;
                    },
                },
                {
                    name: "clear_local_cost_alert",
                    description: "Clear one local alert threshold.",
                    handler: async (input = {}) => {
                        const key = String(input?.key ?? "");
                        const next = structuredClone(state.settings);
                        if (["sessionAiCredits", "sessionUsd", "monthlyUsagePercent", "monthlyNetUsd"].includes(key)) {
                            next.alerts[key] = null;
                        }
                        state.settings = saveSettings(next);
                        return state.settings.alerts;
                    },
                },
                {
                    name: "export_usage_summary",
                    description: "Return a JSON-safe export of the normalized dashboard data.",
                    handler: async () => await buildDashboard({ force: false }),
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                return {
                    title: "Copilot App Cost",
                    status: "Ready",
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    return;
                }
                servers.delete(ctx.instanceId);
                await new Promise((resolve) => entry.server.close(() => resolve()));
            },
        }),
    ],
});

await session.log("copilot-app-cost dashboard loaded", { ephemeral: true });

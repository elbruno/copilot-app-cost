import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { metricsToSessionUsage, calculateSessionEstimate, aggregateModelUsage, getPlanAllowance } from "./lib/cost.mjs";
import { listRecentSessionUsages } from "./lib/history.mjs";
import { loadSettings, saveSettings, resetSettings, normalizeSettings } from "./lib/settings.mjs";
import { buildBillingRequest, buildGhArgs, normalizeBillingResponse, classifyBillingError } from "./lib/billing.mjs";

const execFileAsync = promisify(execFile);
const EXTENSION_VERSION = "0.1.0";
const GH_TIMEOUT_MS = 10000;
const HOST = "127.0.0.1";
const MAX_TIMELINE_POINTS = 120;
const INDEX_HTML_PATH = path.join(import.meta.dirname, "assets", "index.html");
const INDEX_TEMPLATE = fs.readFileSync(INDEX_HTML_PATH, "utf8");

const state = {
  settings: loadSettings(),
  auth: {
    login: null,
    checkedAt: null,
    error: null,
  },
  live: null,
  billing: null,
  sessions: [],
  liveTimeline: [],
  providers: {
    live: { name: "Live session", available: false, stale: false, lastSuccessAt: null, error: "Not refreshed yet" },
    billing: { name: "Billing", available: false, stale: false, lastSuccessAt: null, error: "Not refreshed yet" },
    sessions: { name: "Local sessions", available: false, stale: false, lastSuccessAt: null, error: "Not refreshed yet" },
  },
};

const servers = new Map();
let runtimeSession = null;

function markProviderSuccess(providerKey) {
  const provider = state.providers[providerKey];
  provider.available = true;
  provider.stale = false;
  provider.error = null;
  provider.lastSuccessAt = new Date().toISOString();
}

function markProviderFailure(providerKey, errorMessage, options = {}) {
  const provider = state.providers[providerKey];
  provider.available = false;
  provider.stale = options.stale === true;
  provider.error = String(errorMessage ?? "Unknown error");
}

async function refreshAuth() {
  const sessionLogin = readSessionLogin(runtimeSession);
  if (sessionLogin) {
    state.auth.login = sessionLogin;
  }

  try {
    const { stdout } = await execFileAsync("gh", ["api", "/user"], { timeout: GH_TIMEOUT_MS });
    const payload = JSON.parse(stdout);
    state.auth.login = typeof payload?.login === "string" ? payload.login : null;
    state.auth.error = null;
    state.auth.checkedAt = new Date().toISOString();
  } catch (error) {
    if (state.auth.login) {
      state.auth.error = null;
    } else {
      state.auth.error = error?.message ?? String(error);
    }
    state.auth.checkedAt = new Date().toISOString();
  }
}

async function refreshLive() {
  if (!runtimeSession?.rpc?.usage?.getMetrics) {
    state.live = null;
    markProviderFailure("live", "Live usage metrics API is unavailable in this runtime.");
    return;
  }

  try {
    const metrics = await runtimeSession.rpc.usage.getMetrics();
    if (!metrics) {
      state.live = null;
      markProviderFailure("live", "No active session metrics available.");
      return;
    }

    const usage = metricsToSessionUsage(runtimeSession.sessionId, metrics, {
      source: "session.rpc.usage.getMetrics",
      metricsTimestamp: new Date().toISOString(),
    });
    const estimate = calculateSessionEstimate(usage, {
      billReasoningTokens: state.settings.billReasoningTokens,
    });
    state.live = {
      source: "LIVE ESTIMATE",
      scope: "active-session",
      freshness: "live",
      confidence: estimate.calculationMethod === "copilot-aiu" ? "reported" : "calculated-fallback",
      observedAt: new Date().toISOString(),
      usage,
      estimate,
    };

    state.liveTimeline.push({
      at: state.live.observedAt,
      aiCredits: estimate.aiCredits,
      totalUsd: estimate.totalUsd,
    });
    if (state.liveTimeline.length > MAX_TIMELINE_POINTS) {
      state.liveTimeline.splice(0, state.liveTimeline.length - MAX_TIMELINE_POINTS);
    }

    markProviderSuccess("live");
  } catch (error) {
    markProviderFailure("live", error?.message ?? String(error), { stale: state.live !== null });
  }
}

async function refreshBilling() {
  const request = buildBillingRequest(state.settings, state.auth);
  if (!request.account) {
    state.billing = {
      availability: false,
      scope: request.scope,
      account: request.account,
      error: request.scope === "organization"
        ? "Set an organization account name in settings."
        : "Unable to determine your GitHub username for user billing.",
    };
    markProviderFailure("billing", state.billing.error);
    return;
  }

  try {
    const args = buildGhArgs(request);
    const { stdout } = await execFileAsync("gh", args, { timeout: GH_TIMEOUT_MS });
    const payload = JSON.parse(stdout);
    state.billing = normalizeBillingResponse(request, payload, {
      retrievedAt: new Date().toISOString(),
    });
    markProviderSuccess("billing");
  } catch (error) {
    const code = classifyBillingError(error?.message ?? String(error), request.scope);
    state.billing = {
      availability: false,
      scope: request.scope,
      account: request.account,
      error: code,
      details: error?.message ?? String(error),
    };
    markProviderFailure("billing", code);
  }
}

function enrichSessionUsage(item) {
  const estimate = calculateSessionEstimate(item, {
    billReasoningTokens: state.settings.billReasoningTokens,
  });
  return {
    ...item,
    aiCredits: estimate.aiCredits,
    totalUsd: estimate.totalUsd,
  };
}

function refreshSessions() {
  try {
    const sessions = listRecentSessionUsages(runtimeSession?.sessionId, { limit: 30 }).map(enrichSessionUsage);
    state.sessions = sessions;
    markProviderSuccess("sessions");
  } catch (error) {
    markProviderFailure("sessions", error?.message ?? String(error), { stale: state.sessions.length > 0 });
  }
}

function computeRemainingAllowance(billing) {
  if (!billing?.availability) {
    return null;
  }

  const allowance = getPlanAllowance("pro");
  if (allowance.totalAiCredits <= 0) {
    return null;
  }

  const used = Number(billing?.totals?.netQuantity ?? 0);
  const remaining = Math.max(allowance.totalAiCredits - used, 0);
  const usagePercent = allowance.totalAiCredits > 0 ? (used / allowance.totalAiCredits) * 100 : null;
  return {
    title: "Estimated monthly remaining",
    creditsRemaining: remaining,
    usagePercent,
    reliability: allowance.pooled ? "plan-pooled-estimate" : "plan-estimate",
  };
}

function buildAlerts(dashboard) {
  const alerts = [];
  const liveCreditsThreshold = state.settings.alerts.sessionAiCredits;
  const liveUsdThreshold = state.settings.alerts.sessionUsd;
  const monthlyPercentThreshold = state.settings.alerts.monthlyUsagePercent;
  const monthlyUsdThreshold = state.settings.alerts.monthlyNetUsd;

  if (dashboard.live?.estimate && liveCreditsThreshold !== null && dashboard.live.estimate.aiCredits >= liveCreditsThreshold) {
    alerts.push({ message: `Live session exceeded ${liveCreditsThreshold} AI credits.` });
  }
  if (dashboard.live?.estimate && liveUsdThreshold !== null && dashboard.live.estimate.totalUsd >= liveUsdThreshold) {
    alerts.push({ message: `Live session exceeded $${liveUsdThreshold} USD.` });
  }
  if (dashboard.overview.remainingAllowance && monthlyPercentThreshold !== null && dashboard.overview.remainingAllowance.usagePercent >= monthlyPercentThreshold) {
    alerts.push({ message: `Monthly usage exceeded ${monthlyPercentThreshold}% of allowance estimate.` });
  }
  if (dashboard.billing?.availability && monthlyUsdThreshold !== null && Number(dashboard.billing.totals?.netAmount ?? 0) >= monthlyUsdThreshold) {
    alerts.push({ message: `Monthly net billing exceeded $${monthlyUsdThreshold} USD.` });
  }

  if (!dashboard.providerStatus.live.available && dashboard.providerStatus.live.error) {
    alerts.push({ message: `Live provider unavailable: ${dashboard.providerStatus.live.error}` });
  }
  if (!dashboard.providerStatus.billing.available && dashboard.providerStatus.billing.error) {
    alerts.push({ message: `Billing provider unavailable: ${dashboard.providerStatus.billing.error}` });
  }
  if (!dashboard.providerStatus.sessions.available && dashboard.providerStatus.sessions.error) {
    alerts.push({ message: `Sessions provider unavailable: ${dashboard.providerStatus.sessions.error}` });
  }

  return alerts;
}

function buildDashboard() {
  const mostExpensive = [...state.sessions]
    .sort((left, right) => (Number(right.aiCredits ?? 0) - Number(left.aiCredits ?? 0)))
    .slice(0, 10);

  const modelItems = [
    ...(state.live?.estimate?.modelBreakdown ?? []),
    ...state.sessions.flatMap((item) => calculateSessionEstimate(item, {
      billReasoningTokens: state.settings.billReasoningTokens,
    }).modelBreakdown),
  ];

  const dashboard = {
    extensionVersion: EXTENSION_VERSION,
    generatedAt: new Date().toISOString(),
    auth: state.auth,
    settings: state.settings,
    providerStatus: state.providers,
    live: state.live,
    billing: state.billing,
    sessions: {
      items: state.sessions,
      mostExpensive,
    },
    overview: {
      currentSession: state.live ? {
        title: "Current session estimate",
        source: state.live.source,
        calculationMethod: state.live.estimate?.calculationMethod ?? "unavailable",
        aiCredits: state.live.estimate?.aiCredits ?? null,
        totalUsd: state.live.estimate?.totalUsd ?? null,
      } : null,
      officialMonthlyUsage: state.billing?.availability ? {
        title: "Official monthly usage",
        scope: state.billing.scope,
        account: state.billing.account,
        netQuantity: state.billing.totals?.netQuantity ?? null,
        netAmount: state.billing.totals?.netAmount ?? null,
      } : null,
      remainingAllowance: computeRemainingAllowance(state.billing),
      additionalUsage: state.billing?.availability ? {
        title: "Official net amount",
        source: "GITHUB BILLING",
        netAmount: state.billing.totals?.netAmount ?? null,
      } : null,
    },
    charts: {
      liveTrend: state.liveTimeline,
      modelBreakdown: aggregateModelUsage(modelItems),
    },
    diagnostics: {
      providers: state.providers,
      auth: state.auth,
      liveTimelinePoints: state.liveTimeline.length,
      sessionCount: state.sessions.length,
      billingAvailable: state.billing?.availability === true,
    },
  };

  dashboard.alerts = buildAlerts(dashboard);
  return dashboard;
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });
    request.on("error", reject);
  });
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function writeText(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

function writeHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

async function refreshAll(session) {
  runtimeSession = session ?? runtimeSession;
  await refreshAuth();
  await refreshLive();
  await refreshBilling();
  refreshSessions();
}

function createRequestHandler(session, instanceId) {
  return async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/") {
        writeHtml(response, 200, INDEX_TEMPLATE.replaceAll("__INSTANCE_ID__", instanceId));
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        writeJson(response, 200, { ok: true, instanceId, version: EXTENSION_VERSION });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/dashboard") {
        if (url.searchParams.get("force") === "true") {
          await refreshAll(session);
        }
        writeJson(response, 200, buildDashboard());
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/refresh") {
        await refreshAll(session);
        writeJson(response, 200, { ok: true });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/settings") {
        writeJson(response, 200, state.settings);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/settings") {
        const payload = await parseBody(request);
        state.settings = saveSettings(normalizeSettings(payload));
        await refreshAll(session);
        writeJson(response, 200, state.settings);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/settings/reset") {
        state.settings = resetSettings();
        await refreshAll(session);
        writeJson(response, 200, state.settings);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/export") {
        const payload = JSON.stringify(buildDashboard(), null, 2);
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": "attachment; filename=\"copilot-app-cost-export.json\"",
        });
        response.end(`${payload}\n`);
        return;
      }

      writeText(response, 404, "Not found");
    } catch (error) {
      writeJson(response, 500, { error: error?.message ?? String(error) });
    }
  };
}

function startServer(session, instanceId) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(createRequestHandler(session, instanceId));
    server.once("error", reject);
    server.listen(0, HOST, () => {
      resolve(server);
    });
  });
}

async function openCanvas(session, instanceId) {
  runtimeSession = session ?? runtimeSession;
  const existing = servers.get(instanceId);
  if (existing && existing.server.listening) {
    const address = existing.server.address();
    return {
      title: "Copilot App Cost",
      status: "ready",
      url: `http://${HOST}:${address.port}/`,
    };
  }

  const server = await startServer(session, instanceId);
  servers.set(instanceId, { server });
  await refreshAll(session);
  const address = server.address();
  return {
    title: "Copilot App Cost",
    status: "ready",
    url: `http://${HOST}:${address.port}/`,
  };
}

function closeAllServers() {
  for (const entry of servers.values()) {
    entry.server.close();
  }

  function readSessionLogin(session) {
    if (!session || typeof session !== "object") {
      return null;
    }

    const candidates = [
      session.userLogin,
      session.login,
      session.user?.login,
      session.identity?.login,
    ];

    for (const value of candidates) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }
  servers.clear();
}

runtimeSession = await joinSession({
  hooks: {
    onSessionEnd: () => {
      closeAllServers();
    },
  },
  canvases: [
    createCanvas({
      id: "copilot-app-cost",
      displayName: "Copilot App Cost",
      description: "Real-time Copilot AI-credit and cost dashboard",
      title: "Copilot App Cost",
      open: async ({ session, instanceId }) => {
        return openCanvas(session ?? runtimeSession, instanceId);
      },
    }),
  ],
});

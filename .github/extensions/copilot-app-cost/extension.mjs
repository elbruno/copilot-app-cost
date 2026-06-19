// GitHub Copilot App Canvas Extension: copilot-app-cost
// Displays AI-credit usage from active session and GitHub billing

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { metricsToSessionUsage, calculateSessionEstimate, aggregateModelUsage } from "./lib/cost.mjs";
import { listRecentSessionUsages } from "./lib/history.mjs";
import { loadSettings, saveSettings } from "./lib/settings.mjs";
import { buildGhArgs, normalizeBillingResponse, classifyBillingError, validateAccountName } from "./lib/billing.mjs";

const execFileAsync = promisify(execFile);
const EXTENSION_VERSION = "0.1.0";
const GH_TIMEOUT_MS = 10000;

// Shared canvas state - bidirectional with agent and UI
const canvasState = {
  // Live session metrics from Copilot SDK
  liveEstimate: null,
  liveTimeline: [],
  
  // GitHub official billing
  billingData: null,
  billingScope: "user",
  billingAccount: "",
  
  // Local session history
  sessions: [],
  
  // User settings (persist locally)
  settings: loadSettings(),
  
  // UI state
  ui: {
    activeTab: "overview",
    expandedSessions: [],
    showDiagnostics: false,
  },
  
  // Provider status
  providers: {
    live: { status: "idle", error: null, lastRefresh: null },
    billing: { status: "idle", error: null, lastRefresh: null },
    sessions: { status: "idle", error: null, lastRefresh: null },
  },
  
  // Version info
  extensionVersion: EXTENSION_VERSION,
};

// Agent-callable capabilities
async function refreshLiveMetrics(session) {
  canvasState.providers.live.status = "loading";
  try {
    const metrics = await session.rpc.usage.getMetrics?.();
    if (!metrics) {
      canvasState.liveEstimate = null;
      canvasState.providers.live.status = "unavailable";
      canvasState.providers.live.error = "No active session metrics available";
      return { success: false, error: "No active session metrics" };
    }
    
    const usage = metricsToSessionUsage(metrics);
    const estimate = calculateSessionEstimate(usage);
    canvasState.liveEstimate = { usage, estimate, rawMetrics: metrics };
    canvasState.providers.live.status = "success";
    canvasState.providers.live.error = null;
    canvasState.providers.live.lastRefresh = new Date().toISOString();
    return { success: true, estimate };
  } catch (error) {
    canvasState.providers.live.status = "error";
    canvasState.providers.live.error = error?.message || String(error);
    return { success: false, error: error?.message };
  }
}

async function refreshBillingUsage(session, scope, account) {
  canvasState.providers.billing.status = "loading";
  try {
    if (!validateAccountName(account)) {
      throw new Error("Invalid account name");
    }
    
    const endpoint = scope === "org"
      ? `/organizations/${account}/settings/billing/ai_credit/usage`
      : `/users/${account}/settings/billing/ai_credit/usage`;
    
    const args = buildGhArgs("api", endpoint, "--paginate");
    const { stdout } = await execFileAsync("gh", args, { timeout: GH_TIMEOUT_MS });
    
    const response = JSON.parse(stdout);
    const normalized = normalizeBillingResponse(response, scope);
    canvasState.billingData = normalized;
    canvasState.billingScope = scope;
    canvasState.billingAccount = account;
    canvasState.providers.billing.status = "success";
    canvasState.providers.billing.error = null;
    canvasState.providers.billing.lastRefresh = new Date().toISOString();
    return { success: true, billing: normalized };
  } catch (error) {
    const classification = classifyBillingError(error);
    canvasState.providers.billing.status = "error";
    canvasState.providers.billing.error = classification;
    return { success: false, error: classification };
  }
}

async function refreshSessionHistory() {
  canvasState.providers.sessions.status = "loading";
  try {
    const sessions = await listRecentSessionUsages();
    canvasState.sessions = sessions;
    canvasState.providers.sessions.status = "success";
    canvasState.providers.sessions.error = null;
    canvasState.providers.sessions.lastRefresh = new Date().toISOString();
    return { success: true, sessions };
  } catch (error) {
    canvasState.providers.sessions.status = "error";
    canvasState.providers.sessions.error = error?.message || String(error);
    return { success: false, error: error?.message };
  }
}

function updateSettings(newSettings) {
  const updated = { ...canvasState.settings, ...newSettings };
  saveSettings(updated);
  canvasState.settings = updated;
  return { success: true, settings: updated };
}

function updateUIState(uiChanges) {
  canvasState.ui = { ...canvasState.ui, ...uiChanges };
  return { success: true, ui: canvasState.ui };
}

function exportDashboardData() {
  return {
    exportedAt: new Date().toISOString(),
    extensionVersion: EXTENSION_VERSION,
    live: canvasState.liveEstimate,
    billing: canvasState.billingData,
    sessions: canvasState.sessions,
    settings: {
      billingScope: canvasState.billingScope,
      billingAccount: canvasState.billingAccount,
    },
  };
}

// Canvas initialization
export default function initialize(session) {
  return joinSession({
    canvases: [
      createCanvas({
        name: "Copilot App Cost",
        description: "Monitor AI-credit usage from active session and official GitHub billing",
        type: "dashboard",
        state: canvasState,
        capabilities: {
          "refresh-live": () => refreshLiveMetrics(session),
          "refresh-billing": (scope, account) => refreshBillingUsage(session, scope, account),
          "refresh-sessions": () => refreshSessionHistory(),
          "update-settings": (settings) => updateSettings(settings),
          "update-ui": (ui) => updateUIState(ui),
          "export-data": () => exportDashboardData(),
        },
      }),
    ],
  });
}

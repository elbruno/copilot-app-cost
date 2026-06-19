import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * @typedef {Object} Settings
 * @property {string} billingScope - "user" or "organization"
 * @property {string} userAccount - GitHub username for personal billing
 * @property {string} organizationAccount - Organization name for org billing
 * @property {number} billingYear - Year for billing data (e.g. 2026)
 * @property {number} billingMonth - Month 1-12
 * @property {number} liveRefreshSeconds - Live session poll interval (2-10)
 * @property {number} sessionHistoryRefreshSeconds - Session history poll interval (10-300)
 * @property {number} billingRefreshMinutes - Billing refresh interval (1-60)
 * @property {{ sessionAiCredits?: number|null; sessionUsd?: number|null; monthlyUsagePercent?: number|null; monthlyNetUsd?: number|null }} alerts - Alert thresholds
 * @property {boolean} diagnosticsEnabled - Show diagnostic info
 * @property {boolean} billReasoningTokens - Bill Claude reasoning tokens as output
 * @property {string} updatedAt - ISO 8601 timestamp of last update
 */

const APP_NAME = "copilot-app-cost";
const SETTINGS_FILE = "settings.json";

export function getAppDataDirectory(options = {}) {
    const env = options.env ?? process.env;
    const homeDirectory = options.homeDirectory ?? os.homedir();
    if (process.platform === "win32") {
        return path.join(env.LOCALAPPDATA ?? path.join(homeDirectory, "AppData", "Local"), APP_NAME);
    }
    if (process.platform === "darwin") {
        return path.join(homeDirectory, "Library", "Application Support", APP_NAME);
    }
    return path.join(env.XDG_STATE_HOME ?? path.join(homeDirectory, ".local", "state"), APP_NAME);
}

export function getSettingsPath(options = {}) {
    return path.join(getAppDataDirectory(options), SETTINGS_FILE);
}

export function getDefaultSettings(now = new Date()) {
    return {
        billingScope: "user",
        userAccount: "",
        organizationAccount: "",
        billingYear: now.getUTCFullYear(),
        billingMonth: now.getUTCMonth() + 1,
        liveRefreshSeconds: 2,
        sessionHistoryRefreshSeconds: 30,
        billingRefreshMinutes: 5,
        alerts: {
            sessionAiCredits: null,
            sessionUsd: null,
            monthlyUsagePercent: null,
            monthlyNetUsd: null,
        },
        diagnosticsEnabled: true,
        billReasoningTokens: false,
        updatedAt: now.toISOString(),
    };
}

export function loadSettings(options = {}) {
    const settingsPath = getSettingsPath(options);
    const defaults = getDefaultSettings(options.now ? new Date(options.now) : new Date());
    if (!fs.existsSync(settingsPath)) {
        return defaults;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        return normalizeSettings(parsed, defaults);
    } catch {
        return defaults;
    }
}

export function saveSettings(input, options = {}) {
    const settingsPath = getSettingsPath(options);
    const normalized = normalizeSettings(input, getDefaultSettings(options.now ? new Date(options.now) : new Date()));
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`);
    return normalized;
}

export function resetSettings(options = {}) {
    const defaults = getDefaultSettings(options.now ? new Date(options.now) : new Date());
    return saveSettings(defaults, options);
}

export function normalizeSettings(input, defaults = getDefaultSettings()) {
    const billingScope = ["user", "organization"].includes(String(input?.billingScope ?? ""))
        ? String(input.billingScope)
        : defaults.billingScope;

    return {
        billingScope,
        userAccount: sanitizeAccount(input?.userAccount),
        organizationAccount: sanitizeAccount(input?.organizationAccount),
        billingYear: clampInteger(input?.billingYear, 2024, 2100, defaults.billingYear),
        billingMonth: clampInteger(input?.billingMonth, 1, 12, defaults.billingMonth),
        liveRefreshSeconds: clampInteger(input?.liveRefreshSeconds, 2, 10, defaults.liveRefreshSeconds),
        sessionHistoryRefreshSeconds: clampInteger(input?.sessionHistoryRefreshSeconds, 10, 300, defaults.sessionHistoryRefreshSeconds),
        billingRefreshMinutes: clampInteger(input?.billingRefreshMinutes, 1, 60, defaults.billingRefreshMinutes),
        alerts: {
            sessionAiCredits: clampNullableNumber(input?.alerts?.sessionAiCredits, 0, 100000),
            sessionUsd: clampNullableNumber(input?.alerts?.sessionUsd, 0, 100000),
            monthlyUsagePercent: clampNullableNumber(input?.alerts?.monthlyUsagePercent, 0, 10000),
            monthlyNetUsd: clampNullableNumber(input?.alerts?.monthlyNetUsd, 0, 100000),
        },
        diagnosticsEnabled: input?.diagnosticsEnabled !== false,
        billReasoningTokens: input?.billReasoningTokens === true,
        updatedAt: new Date().toISOString(),
    };
}

function sanitizeAccount(value) {
    const trimmed = String(value ?? "").trim();
    return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(trimmed) ? trimmed : "";
}

function clampInteger(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
}

function clampNullableNumber(value, min, max) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.min(Math.max(parsed, min), max);
}

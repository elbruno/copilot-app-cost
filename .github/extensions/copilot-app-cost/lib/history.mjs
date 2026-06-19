import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function getSessionStateDirectory(options = {}) {
    const copilotHome = options.copilotHome ?? process.env.COPILOT_HOME ?? path.join(os.homedir(), ".copilot");
    return path.join(copilotHome, "session-state");
}

/**
 * List recent completed sessions from local session state.
 * @param {string} currentSessionId - Current session ID (to filter out active sessions)
 * @param {{ limit?: number; [key: string]: unknown }} [options] - Options
 * @returns {Array<SessionUsageFromHistory>} - Recent session usage estimates
 */
export function listRecentSessionUsages(currentSessionId, options = {}) {
    const directory = getSessionStateDirectory(options);
    if (!fs.existsSync(directory)) {
        return [];
    }

    const candidates = fs.readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const sessionId = entry.name;
            const eventsPath = path.join(directory, sessionId, "events.jsonl");
            if (!fs.existsSync(eventsPath)) {
                return null;
            }
            return {
                sessionId,
                eventsPath,
                updatedAtMs: fs.statSync(eventsPath).mtimeMs,
            };
        })
        .filter(Boolean)
        .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
        .slice(0, options.limit ?? 20);

    return candidates
        .map((candidate) => readSessionUsageFromEvents(candidate.sessionId, { ...options, eventsPath: candidate.eventsPath, currentSessionId }))
        .filter(Boolean)
        .sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""));
}

/**
 * Read session usage data from a session's events.jsonl file.
 * @param {string} sessionId - Session identifier
 * @param {{ eventsPath?: string; currentSessionId?: string; [key: string]: unknown }} [options] - Options
 * @returns {SessionUsageFromHistory|null} - Session usage estimate, or null if no metrics found
 */
export function readSessionUsageFromEvents(sessionId, options = {}) {
    const eventsPath = options.eventsPath ?? path.join(getSessionStateDirectory(options), sessionId, "events.jsonl");
    if (!fs.existsSync(eventsPath)) {
        return null;
    }

    const events = readSessionEvents(eventsPath);
    const event = events.richestMetricsEvent ?? events.latestMetricsEvent;
    if (!event?.data?.modelMetrics && event?.data?.totalNanoAiu === undefined) {
        return null;
    }

    const workspace = readSessionWorkspaceMetadata(sessionId, options);
    const modelUsage = Object.entries(event.data.modelMetrics ?? {}).map(([model, metrics]) => ({
        model,
        requests: numberOrZero(metrics?.requests?.count),
        inputTokens: numberOrZero(metrics?.usage?.inputTokens),
        cachedInputTokens: numberOrZero(metrics?.usage?.cacheReadTokens),
        cacheWriteTokens: numberOrZero(metrics?.usage?.cacheWriteTokens),
        outputTokens: numberOrZero(metrics?.usage?.outputTokens),
        reasoningTokens: numberOrZero(metrics?.usage?.reasoningTokens),
        totalNanoAiu: readOptionalNumber(metrics?.totalNanoAiu),
    }));

    return {
        sessionId,
        sessionName: workspace.sessionName ?? events.metadata.sessionName ?? null,
        workspaceDirectory: workspace.workspaceDirectory ?? events.metadata.workspaceDirectory ?? null,
        repository: workspace.repository ?? null,
        branch: workspace.branch ?? null,
        source: sessionId === options.currentSessionId ? "active-session-events" : "completed-session-events",
        sourcePath: eventsPath,
        status: sessionId === options.currentSessionId ? "active" : "completed",
        currentModel: event.data.currentModel ?? null,
        metricsTimestamp: event.timestamp,
        latestEventType: events.latestEvent?.type ?? null,
        latestEventTimestamp: events.latestEvent?.timestamp ?? null,
        metricsStale: events.latestEvent?.timestamp !== event.timestamp,
        updatedAt: events.latestEvent?.timestamp ?? event.timestamp ?? new Date(fs.statSync(eventsPath).mtimeMs).toISOString(),
        totalNanoAiu: readOptionalNumber(event.data.totalNanoAiu),
        totalUserRequests: readOptionalNumber(event.data.totalUserRequests),
        totalApiDurationMs: readOptionalNumber(event.data.totalApiDurationMs),
        sessionStartTime: event.data.sessionStartTime ?? null,
        lastCallInputTokens: readOptionalNumber(event.data.lastCallInputTokens),
        lastCallOutputTokens: readOptionalNumber(event.data.lastCallOutputTokens),
        modelUsage,
    };
}

function readSessionEvents(eventsPath) {
    let latestMetricsEvent = null;
    let richestMetricsEvent = null;
    let latestEvent = null;
    const metadata = {};

    for (const line of fs.readFileSync(eventsPath, "utf8").split(/\r?\n/)) {
        if (!line.trim()) {
            continue;
        }
        const event = JSON.parse(line);
        latestEvent = event;
        updateMetadata(metadata, event);
        if (event?.data?.modelMetrics || event?.data?.totalNanoAiu !== undefined) {
            latestMetricsEvent = event;
            if (!richestMetricsEvent || eventWeight(event) > eventWeight(richestMetricsEvent)) {
                richestMetricsEvent = event;
            }
        }
    }

    return { latestMetricsEvent, richestMetricsEvent, latestEvent, metadata };
}

function readSessionWorkspaceMetadata(sessionId, options = {}) {
    const workspacePath = options.workspacePath ?? path.join(getSessionStateDirectory(options), sessionId, "workspace.yaml");
    if (!fs.existsSync(workspacePath)) {
        return {};
    }

    const result = {};
    for (const line of fs.readFileSync(workspacePath, "utf8").split(/\r?\n/)) {
        const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
        if (!match) {
            continue;
        }
        result[match[1]] = unquoteYamlScalar(match[2]);
    }

    return {
        sessionName: readString(result.name),
        workspaceDirectory: readString(result.cwd),
        repository: readString(result.repository),
        branch: readString(result.branch),
    };
}

function updateMetadata(metadata, event) {
    const data = event.data ?? {};
    metadata.sessionName = readString(data.sessionName ?? data.session_name ?? data.name ?? metadata.sessionName) ?? metadata.sessionName;
    metadata.workspaceDirectory = readString(data.workspaceDirectory ?? data.workspace_directory ?? data.cwd ?? metadata.workspaceDirectory) ?? metadata.workspaceDirectory;
}

function eventWeight(event) {
    let total = numberOrZero(event?.data?.totalNanoAiu);
    for (const metrics of Object.values(event?.data?.modelMetrics ?? {})) {
        total += numberOrZero(metrics?.totalNanoAiu)
            + numberOrZero(metrics?.usage?.inputTokens)
            + numberOrZero(metrics?.usage?.cacheReadTokens)
            + numberOrZero(metrics?.usage?.cacheWriteTokens)
            + numberOrZero(metrics?.usage?.outputTokens)
            + numberOrZero(metrics?.usage?.reasoningTokens);
    }
    return total;
}

function readString(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    return String(value);
}

function unquoteYamlScalar(value) {
    const trimmed = String(value ?? "").trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function readOptionalNumber(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function numberOrZero(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

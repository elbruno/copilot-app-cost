import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    getDefaultSettings,
    getAppDataDirectory,
    getSettingsPath,
    loadSettings,
    saveSettings,
    resetSettings,
    normalizeSettings,
} from "../.github/extensions/copilot-app-cost/lib/settings.mjs";

// ---------------------------------------------------------------------------
// getDefaultSettings
// ---------------------------------------------------------------------------
describe("getDefaultSettings", () => {
    it("returns expected structure", () => {
        const defaults = getDefaultSettings(new Date("2026-06-15T00:00:00Z"));
        assert.equal(defaults.billingScope, "user");
        assert.equal(defaults.billingYear, 2026);
        assert.equal(defaults.billingMonth, 6);
        assert.equal(defaults.liveRefreshSeconds, 2);
        assert.equal(defaults.diagnosticsEnabled, true);
        assert.equal(defaults.billReasoningTokens, false);
        assert.equal(defaults.alerts.sessionAiCredits, null);
    });
});

// ---------------------------------------------------------------------------
// getAppDataDirectory
// ---------------------------------------------------------------------------
describe("getAppDataDirectory", () => {
    it("uses LOCALAPPDATA on win32", () => {
        if (process.platform !== "win32") return;
        const dir = getAppDataDirectory();
        assert.ok(dir.includes("copilot-app-cost"));
    });

    it("uses custom env LOCALAPPDATA when provided", () => {
        // Fake win32 behavior by mocking env — test via options.env
        // We can only do this properly on win32 in this test suite
        if (process.platform !== "win32") return;
        const dir = getAppDataDirectory({ env: { LOCALAPPDATA: "C:\\Custom" } });
        assert.ok(dir.startsWith("C:\\Custom"));
        assert.ok(dir.endsWith("copilot-app-cost"));
    });
});

// ---------------------------------------------------------------------------
// normalizeSettings
// ---------------------------------------------------------------------------
describe("normalizeSettings", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const defaults = getDefaultSettings(now);

    it("rejects invalid billingScope", () => {
        const result = normalizeSettings({ billingScope: "invalid" }, defaults);
        assert.equal(result.billingScope, "user");
    });

    it("accepts organization scope", () => {
        const result = normalizeSettings({ billingScope: "organization" }, defaults);
        assert.equal(result.billingScope, "organization");
    });

    it("clamps liveRefreshSeconds to [2, 10]", () => {
        assert.equal(normalizeSettings({ liveRefreshSeconds: 1 }, defaults).liveRefreshSeconds, 2);
        assert.equal(normalizeSettings({ liveRefreshSeconds: 999 }, defaults).liveRefreshSeconds, 10);
        assert.equal(normalizeSettings({ liveRefreshSeconds: 5 }, defaults).liveRefreshSeconds, 5);
    });

    it("clamps billingMonth to [1, 12]", () => {
        assert.equal(normalizeSettings({ billingMonth: 0 }, defaults).billingMonth, 1);
        assert.equal(normalizeSettings({ billingMonth: 13 }, defaults).billingMonth, 12);
        assert.equal(normalizeSettings({ billingMonth: 6 }, defaults).billingMonth, 6);
    });

    it("sanitizes bad account names to empty string", () => {
        assert.equal(normalizeSettings({ userAccount: "-bad!" }, defaults).userAccount, "");
        assert.equal(normalizeSettings({ userAccount: "goodname" }, defaults).userAccount, "goodname");
    });

    it("sets billReasoningTokens false by default", () => {
        assert.equal(normalizeSettings({}, defaults).billReasoningTokens, false);
    });

    it("sets billReasoningTokens true when explicitly set", () => {
        assert.equal(normalizeSettings({ billReasoningTokens: true }, defaults).billReasoningTokens, true);
    });

    it("clamps alert values to null when null", () => {
        const result = normalizeSettings({ alerts: { sessionAiCredits: null } }, defaults);
        assert.equal(result.alerts.sessionAiCredits, null);
    });

    it("clamps alert values correctly", () => {
        const result = normalizeSettings({ alerts: { sessionAiCredits: 50 } }, defaults);
        assert.equal(result.alerts.sessionAiCredits, 50);
    });
});

// ---------------------------------------------------------------------------
// loadSettings / saveSettings / resetSettings (with temp dir)
// ---------------------------------------------------------------------------
describe("settings persistence", () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-app-cost-test-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function testOptions() {
        return { env: { LOCALAPPDATA: tmpDir }, homeDirectory: tmpDir };
    }

    it("loadSettings returns defaults when no file exists", () => {
        const settings = loadSettings(testOptions());
        assert.equal(settings.billingScope, "user");
        assert.equal(settings.diagnosticsEnabled, true);
    });

    it("saveSettings writes and loadSettings reads back", () => {
        const opts = testOptions();
        const saved = saveSettings({ billingScope: "organization", organizationAccount: "my-org", billingMonth: 3 }, opts);
        assert.equal(saved.billingScope, "organization");
        assert.equal(saved.organizationAccount, "my-org");
        assert.equal(saved.billingMonth, 3);

        const loaded = loadSettings(opts);
        assert.equal(loaded.billingScope, "organization");
        assert.equal(loaded.organizationAccount, "my-org");
        assert.equal(loaded.billingMonth, 3);
    });

    it("resetSettings overwrites with defaults", () => {
        const opts = testOptions();
        saveSettings({ billingScope: "organization" }, opts);
        const reset = resetSettings(opts);
        assert.equal(reset.billingScope, "user");

        const loaded = loadSettings(opts);
        assert.equal(loaded.billingScope, "user");
    });

    it("loadSettings returns defaults on corrupt file", () => {
        const opts = testOptions();
        const settingsPath = getSettingsPath(opts);
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(settingsPath, "not valid json");
        const settings = loadSettings(opts);
        assert.equal(settings.billingScope, "user");
    });
});

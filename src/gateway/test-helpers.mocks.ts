
import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import type { AgentBinding } from "../config/config.js";
import type { HooksConfig } from "../config/types.hooks.js";
import type { PluginRegistry } from "../plugins/registry/types.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { applyPluginAutoEnable } from "../config/plugin-auto-enable.js";
import {
  createStubChannelPlugin,
  createStubPluginRegistry,
} from "./test-helpers/stubs.js";
import { readConfigFileSnapshot } from "./test-helpers/config.js";

export { createStubChannelPlugin, createStubPluginRegistry };

const hoisted = vi.hoisted(() => ({
  testTailnetIPv4: { value: undefined as string | undefined },
  piSdkMock: {
    enabled: false,
    discoverCalls: 0,
    models: [] as Array<{ id: string; name?: string; provider: string }>,
  },
  cronIsolatedRun: vi.fn(async (_params?: any) => ({ ok: true })),
  agentCommand: vi.fn(),
  getReplyFromConfig: vi.fn(),
  sessionStoreSaveDelayMs: { value: 0 },
  embeddedRunMock: {
    activeIds: new Set<string>(),
    abortCalls: [] as string[],
    waitCalls: [] as string[],
    waitResults: new Map<string, boolean>(),
  },
  testIsNixMode: { value: false },
  sendWhatsAppMock: vi.fn().mockResolvedValue({ messageId: "msg-1", toJid: "jid-1" }),
}));

const pluginRegistryState = {
  registry: createStubPluginRegistry(),
};
setActivePluginRegistry(pluginRegistryState.registry);

export function setTestPluginRegistry(registry: PluginRegistry) {
  pluginRegistryState.registry = registry;
  setActivePluginRegistry(registry);
}

export function resetTestPluginRegistry() {
  pluginRegistryState.registry = createStubPluginRegistry();
  setActivePluginRegistry(pluginRegistryState.registry);
}

const testConfigRoot = {
  value: path.join(os.tmpdir(), `zero-gateway-test-${process.pid}-${crypto.randomUUID()}`),
};

export function setTestConfigRoot(root: string) {
  testConfigRoot.value = root;
}

export const testTailnetIPv4 = hoisted.testTailnetIPv4;
export const piSdkMock = hoisted.piSdkMock;
export const cronIsolatedRun = hoisted.cronIsolatedRun;
export const agentCommand = hoisted.agentCommand;
export const getReplyFromConfig = hoisted.getReplyFromConfig;
export const sessionStoreSaveDelayMs = hoisted.sessionStoreSaveDelayMs;
export const embeddedRunMock = hoisted.embeddedRunMock;
export const testIsNixMode = hoisted.testIsNixMode;

export const testState = {
  agentConfig: {} as Record<string, unknown>,
  agentsConfig: null as Record<string, unknown> | null,
  bindingsConfig: null as AgentBinding[] | null,
  channelsConfig: null as Record<string, unknown> | null,
  allowFrom: undefined as any[] | undefined,
  sessionConfig: null as Record<string, unknown> | null,
  sessionStorePath: null as string | null,
  gatewayBind: undefined as string | undefined,
  gatewayAuth: undefined as { type: "password"; password?: string } | undefined,
  gatewayControlUi: undefined as boolean | undefined,
  canvasHostPort: undefined as number | undefined,
  hooksConfig: null as HooksConfig | null,
  cronEnabled: undefined as boolean | undefined,
  cronStorePath: undefined as string | undefined,
  legacyParsed: {} as Record<string, unknown>,
  migrationConfig: null as Record<string, unknown> | null,
  migrationChanges: [] as string[],
  legacyIssues: [] as any[],
};

export function resolveConfigPath() {
  return path.join(testConfigRoot.value, "config.json");
}

vi.mock("@mariozechner/pi-coding-agent", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-coding-agent")>("@mariozechner/pi-coding-agent");
  return {
    ...actual,
    discoverModels: (..._args: unknown[]) => {
      piSdkMock.discoverCalls++;
      return Promise.resolve(piSdkMock.models);
    },
  };
});

vi.mock("../cron/isolated-agent.js", () => ({
  runCronIsolatedAgentTurn: (params: any) => cronIsolatedRun(params),
}));

vi.mock("../infra/tailnet.js", () => ({
  pickPrimaryTailnetIPv4: () => testTailnetIPv4.value,
  pickPrimaryTailnetIPv6: () => undefined,
}));

vi.mock("../config/sessions.js", async () => {
  const actual = await vi.importActual<typeof import("../config/sessions.js")>("../config/sessions.js");
  return {
    ...actual,
    saveSessionStore: vi.fn(async (storePath, store) => {
      if (sessionStoreSaveDelayMs.value > 0) {
        await new Promise((r) => setTimeout(r, sessionStoreSaveDelayMs.value));
      }
      return actual.saveSessionStore(storePath, store as never);
    }),
  };
});

vi.mock("../config/config.js", async () => {
  const actual = await vi.importActual<typeof import("../config/config.js")>("../config/config.js");
  const writeConfigFile = vi.fn(async (cfg: Record<string, unknown>) => {
    const configPath = resolveConfigPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(cfg, null, 2).trimEnd().concat("\n"), "utf-8");
  });

  return {
    ...actual,
    get CONFIG_PATH_ZERO() { return resolveConfigPath(); },
    get STATE_DIR_ZERO() { return path.dirname(resolveConfigPath()); },
    get isNixMode() { return testIsNixMode.value; },
    migrateLegacyConfig: (raw: unknown) => ({ config: testState.migrationConfig ?? (raw as Record<string, unknown>), changes: testState.migrationChanges }),
    loadConfig: () => {
      const configPath = resolveConfigPath();
      let fileConfig: Record<string, any> = {};
      try { if (fsSync.existsSync(configPath)) fileConfig = JSON.parse(fsSync.readFileSync(configPath, "utf-8")); } catch { fileConfig = {}; }
      const fileAgents = fileConfig.agents && typeof fileConfig.agents === "object" ? fileConfig.agents : {};
      const fileDefaults = fileAgents.defaults && typeof fileAgents.defaults === "object" ? fileAgents.defaults : {};
      const defaults = { model: { primary: "anthropic/claude-opus-4-5" }, workspace: path.join(os.tmpdir(), "zero-gateway-test"), ...fileDefaults, ...testState.agentConfig };
      const agents = { ...fileAgents, ...testState.agentsConfig, defaults };
      const mergedChannels = { ...fileConfig.channels, ...testState.channelsConfig };
      if (testState.allowFrom !== undefined) mergedChannels.whatsapp = { ...mergedChannels.whatsapp, allowFrom: testState.allowFrom };
      const session = { ...fileConfig.session, mainKey: fileConfig.session?.mainKey ?? "main", ...testState.sessionConfig };
      if (testState.sessionStorePath) session.store = testState.sessionStorePath;
      const gateway = { ...fileConfig.gateway };
      if (testState.gatewayBind) gateway.bind = testState.gatewayBind;
      if (testState.gatewayAuth) gateway.auth = testState.gatewayAuth;
      if (testState.gatewayControlUi) gateway.controlUi = testState.gatewayControlUi;
      const canvasHost = { ...fileConfig.canvasHost };
      if (testState.canvasHostPort) canvasHost.port = testState.canvasHostPort;
      const cron = { ...fileConfig.cron };
      if (typeof testState.cronEnabled === "boolean") cron.enabled = testState.cronEnabled;
      if (testState.cronStorePath) cron.store = testState.cronStorePath;
      const config = { ...fileConfig, agents, bindings: testState.bindingsConfig ?? fileConfig.bindings, channels: Object.keys(mergedChannels).length ? mergedChannels : undefined, session, gateway: Object.keys(gateway).length ? gateway : undefined, canvasHost: Object.keys(canvasHost).length ? canvasHost : undefined, hooks: testState.hooksConfig ?? fileConfig.hooks, cron: Object.keys(cron).length ? cron : undefined };
      return applyPluginAutoEnable({ config, env: process.env }).config;
    },
    parseConfigJson5: (raw: string) => { try { return { ok: true, parsed: JSON.parse(raw) }; } catch (err) { return { ok: false, error: String(err) }; } },
    validateConfigObject: (parsed: unknown) => ({ ok: true, config: parsed as any, issues: [] }),
    readConfigFileSnapshot,
    writeConfigFile,
  };
});

vi.mock("../agents/pi-embedded.js", async () => {
  const actual = await vi.importActual<typeof import("../agents/pi-embedded.js")>("../agents/pi-embedded.js");
  return {
    ...actual,
    isEmbeddedPiRunActive: (sessionId: string) => embeddedRunMock.activeIds.has(sessionId),
    abortEmbeddedPiRun: (sessionId: string) => { embeddedRunMock.abortCalls.push(sessionId); return embeddedRunMock.activeIds.has(sessionId); },
    waitForEmbeddedPiRunEnd: async (sessionId: string) => { embeddedRunMock.waitCalls.push(sessionId); return embeddedRunMock.waitResults.get(sessionId) ?? true; },
  };
});

vi.mock("../commands/health.js", () => ({ getHealthSnapshot: vi.fn().mockResolvedValue({ ok: true, stub: true }) }));
vi.mock("../commands/status.js", () => ({ getStatusSummary: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("../web/outbound.js", () => ({ sendMessageWhatsApp: (...args: any[]) => (hoisted.sendWhatsAppMock as any)(...args), sendPollWhatsApp: (...args: any[]) => (hoisted.sendWhatsAppMock as any)(...args) }));
vi.mock("../channels/web/index.js", async () => {
  const actual = await vi.importActual<typeof import("../channels/web/index.js")>("../channels/web/index.js");
  return { ...actual, sendMessageWhatsApp: (...args: any[]) => (hoisted.sendWhatsAppMock as any)(...args) };
});
vi.mock("../commands/agent.js", () => ({ agentCommand }));
vi.mock("../auto-reply/reply.js", () => ({ getReplyFromConfig }));
vi.mock("../cli/deps.js", async () => {
  const actual = await vi.importActual<typeof import("../cli/deps.js")>("../cli/deps.js");
  const base = actual.createDefaultDeps();
  return { ...actual, createDefaultDeps: () => ({ ...base, sendMessageWhatsApp: (...args: any[]) => (hoisted.sendWhatsAppMock as any)(...args) }) };
});

process.env.ZERO_SKIP_CHANNELS = "1";
process.env.ZERO_SKIP_CRON = "1";

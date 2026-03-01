import * as crypto from "node:crypto";
import {
  addAllowlistEntry,
  analyzeArgvCommand,
  evaluateExecAllowlist,
  evaluateShellAllowlist,
  requiresExecApproval,
  normalizeExecApprovals,
  recordAllowlistUse,
  resolveExecApprovals,
  resolveSafeBins,
  ensureExecApprovals,
  readExecApprovalsSnapshot,
  resolveExecApprovalsSocketPath,
  saveExecApprovals,
} from "../infra/exec-approvals.js";
import { getMachineDisplayName } from "../infra/machine-name.js";
import { loadOrCreateDeviceIdentity } from "../infra/device-identity.js";
import { loadConfig } from "../config/config.js";
import { resolveBrowserConfig, shouldStartLocalBrowserServer } from "../browser/config.js";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { VERSION } from "../version.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";

import { ensureNodeHostConfig, saveNodeHostConfig, type NodeHostGatewayConfig } from "./config.js";
import { GatewayClient } from "../gateway/client.js";

import { SkillBinsCache } from "./runner/skill-cache.js";
import {
  sanitizeEnv,
  formatCommand,
  resolveExecSecurity,
  resolveExecAsk
} from "./runner/utils.js";
import {
  resolveBrowserProxyConfig,
  ensureBrowserControlServer,
  isProfileAllowed,
  collectBrowserProxyPaths,
  readBrowserProxyFile
} from "./runner/browser-proxy.js";
import {
  truncateOutput,
  buildExecEventPayload,
  decodeParams,
  coerceNodeInvokePayload,
  sendInvokeResult,
  sendNodeEvent
} from "./runner/invoke.js";
import {
  redactExecApprovals,
  requireExecApprovalsBaseHash,
  runCommand,
  handleSystemWhich,
  ensureNodePathEnv,
  runViaMacAppExecHost
} from "./runner/commands.js";
import type {
  NodeHostRunOptions,
  SystemRunParams,
  SystemWhichParams,
  BrowserProxyParams,
  BrowserProxyResult,
  SystemExecApprovalsSetParams,
  RunResult,
  ExecEventPayload,
  NodeInvokeRequestPayload,
  BrowserProxyFile
} from "./runner/types.js";
import type {
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
  ExecCommandSegment
} from "../infra/exec-approvals.js";

const execHostEnforced = process.env.ZERO_NODE_EXEC_HOST?.trim().toLowerCase() === "app";
const execHostFallbackAllowed = process.env.ZERO_NODE_EXEC_FALLBACK?.trim().toLowerCase() !== "0";

export async function runNodeHost(opts: NodeHostRunOptions): Promise<void> {
  const config = await ensureNodeHostConfig();
  const nodeId = opts.nodeId?.trim() || config.nodeId;
  if (nodeId !== config.nodeId) {
    config.nodeId = nodeId;
  }
  const displayName =
    opts.displayName?.trim() || config.displayName || (await getMachineDisplayName());
  config.displayName = displayName;
  const gateway: NodeHostGatewayConfig = {
    host: opts.gatewayHost,
    port: opts.gatewayPort,
    tls: opts.gatewayTls ?? loadConfig().gateway?.tls?.enabled ?? false,
    tlsFingerprint: opts.gatewayTlsFingerprint,
  };
  config.gateway = gateway;
  await saveNodeHostConfig(config);

  const cfg = loadConfig();
  const browserProxy = resolveBrowserProxyConfig();
  const resolvedBrowser = resolveBrowserConfig(cfg.browser);
  const browserProxyEnabled =
    browserProxy.enabled &&
    resolvedBrowser.enabled &&
    shouldStartLocalBrowserServer(resolvedBrowser);
  const isRemoteMode = cfg.gateway?.mode === "remote";
  const token =
    process.env.ZERO_GATEWAY_TOKEN?.trim() ||
    (isRemoteMode ? cfg.gateway?.remote?.token : cfg.gateway?.auth?.token);
  const password =
    process.env.ZERO_GATEWAY_PASSWORD?.trim() ||
    (isRemoteMode ? cfg.gateway?.remote?.password : cfg.gateway?.auth?.password);

  const host = gateway.host ?? "127.0.0.1";
  const port = gateway.port ?? 18789;
  const scheme = gateway.tls ? "wss" : "ws";
  const url = `${scheme}://${host}:${port}`;
  const pathEnv = ensureNodePathEnv();

  const client = new GatewayClient({
    url,
    token: token?.trim() || undefined,
    password: password?.trim() || undefined,
    instanceId: nodeId,
    clientName: GATEWAY_CLIENT_NAMES.NODE_HOST,
    clientDisplayName: displayName,
    clientVersion: VERSION,
    platform: process.platform,
    mode: GATEWAY_CLIENT_MODES.NODE,
    role: "node",
    scopes: [],
    caps: ["system", ...(browserProxyEnabled ? ["browser"] : [])],
    commands: [
      "system.run",
      "system.which",
      "system.execApprovals.get",
      "system.execApprovals.set",
      ...(browserProxyEnabled ? ["browser.proxy"] : []),
    ],
    pathEnv,
    permissions: undefined,
    deviceIdentity: loadOrCreateDeviceIdentity(),
    tlsFingerprint: gateway.tlsFingerprint,
    onEvent: (evt) => {
      if (evt.event !== "node.invoke.request") return;
      const payload = coerceNodeInvokePayload(evt.payload);
      if (!payload) return;
      void handleInvoke(payload, client, skillBins);
    },
    onConnectError: (err) => {
      console.error(`node host gateway connect failed: ${err.message}`);
    },
    onClose: (code, reason) => {
      console.error(`node host gateway closed (${code}): ${reason}`);
    },
  });

  const skillBins = new SkillBinsCache(async () => {
    const res = (await client.request("skills.bins", {})) as
      | { bins?: unknown[] }
      | null
      | undefined;
    const bins = Array.isArray(res?.bins) ? res.bins.map((bin) => String(bin)) : [];
    return bins;
  });

  client.start();
  await new Promise(() => { });
}

async function handleInvoke(
  frame: NodeInvokeRequestPayload,
  client: GatewayClient,
  skillBins: SkillBinsCache,
) {
  const command = String(frame.command ?? "");
  if (command === "system.execApprovals.get") {
    try {
      ensureExecApprovals();
      const snapshot = readExecApprovalsSnapshot();
      const payload: ExecApprovalsSnapshot = {
        path: snapshot.path,
        exists: snapshot.exists,
        hash: snapshot.hash,
        raw: snapshot.raw,
        file: redactExecApprovals(snapshot.file),
      };
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(payload),
      });
    } catch (err) {
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "INVALID_REQUEST", message: String(err) },
      });
    }
    return;
  }

  if (command === "system.execApprovals.set") {
    try {
      const params = decodeParams<SystemExecApprovalsSetParams>(frame.paramsJSON);
      if (!params.file || typeof params.file !== "object") {
        throw new Error("INVALID_REQUEST: exec approvals file required");
      }
      ensureExecApprovals();
      const snapshot = readExecApprovalsSnapshot();
      requireExecApprovalsBaseHash(params, snapshot);
      const normalized = normalizeExecApprovals(params.file);
      const currentSocketPath = snapshot.file.socket?.path?.trim();
      const currentToken = snapshot.file.socket?.token?.trim();
      const socketPath =
        normalized.socket?.path?.trim() ?? currentSocketPath ?? resolveExecApprovalsSocketPath();
      const token = normalized.socket?.token?.trim() ?? currentToken ?? "";
      const next: ExecApprovalsFile = {
        ...normalized,
        socket: {
          path: socketPath,
          token,
        },
      };
      saveExecApprovals(next);
      const nextSnapshot = readExecApprovalsSnapshot();
      const payload: ExecApprovalsSnapshot = {
        path: nextSnapshot.path,
        exists: nextSnapshot.exists,
        hash: nextSnapshot.hash,
        raw: nextSnapshot.raw,
        file: redactExecApprovals(nextSnapshot.file),
      };
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(payload),
      });
    } catch (err) {
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "INVALID_REQUEST", message: String(err) },
      });
    }
    return;
  }

  if (command === "system.which") {
    try {
      const params = decodeParams<SystemWhichParams>(frame.paramsJSON);
      if (!Array.isArray(params.bins)) {
        throw new Error("INVALID_REQUEST: bins required");
      }
      const env = sanitizeEnv(undefined);
      const payload = await handleSystemWhich(params, env);
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(payload),
      });
    } catch (err) {
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "INVALID_REQUEST", message: String(err) },
      });
    }
    return;
  }

  if (command === "browser.proxy") {
    try {
      const params = decodeParams<BrowserProxyParams>(frame.paramsJSON);
      const pathValue = typeof params.path === "string" ? params.path.trim() : "";
      if (!pathValue) {
        throw new Error("INVALID_REQUEST: path required");
      }
      const proxyConfig = resolveBrowserProxyConfig();
      if (!proxyConfig.enabled) {
        throw new Error("UNAVAILABLE: node browser proxy disabled");
      }
      await ensureBrowserControlServer();
      const resolved = resolveBrowserConfig(loadConfig().browser);
      const requestedProfile = typeof params.profile === "string" ? params.profile.trim() : "";
      const allowedProfiles = proxyConfig.allowProfiles;
      if (allowedProfiles.length > 0) {
        if (pathValue !== "/profiles") {
          const profileToCheck = requestedProfile || resolved.defaultProfile;
          if (!isProfileAllowed({ allowProfiles: allowedProfiles, profile: profileToCheck })) {
            throw new Error("INVALID_REQUEST: browser profile not allowed");
          }
        } else if (requestedProfile) {
          if (!isProfileAllowed({ allowProfiles: allowedProfiles, profile: requestedProfile })) {
            throw new Error("INVALID_REQUEST: browser profile not allowed");
          }
        }
      }

      const url = new URL(
        pathValue.startsWith("/") ? pathValue : `/${pathValue}`,
        resolved.controlUrl,
      );
      if (requestedProfile) {
        url.searchParams.set("profile", requestedProfile);
      }
      const query = params.query ?? {};
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
      const method = typeof params.method === "string" ? params.method.toUpperCase() : "GET";
      const body = params.body;
      const ctrl = new AbortController();
      const timeoutMs =
        typeof params.timeoutMs === "number" && Number.isFinite(params.timeoutMs)
          ? Math.max(1, Math.floor(params.timeoutMs))
          : 20_000;
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const headers = new Headers();
      let bodyJson: string | undefined;
      if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        bodyJson = JSON.stringify(body);
      }
      const token = process.env.ZERO_BROWSER_CONTROL_TOKEN?.trim() || resolved.controlToken?.trim();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      let res: Response;
      try {
        res = await fetch(url.toString(), {
          method,
          headers,
          body: bodyJson,
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text ? `${res.status}: ${text}` : `HTTP ${res.status}`);
      }
      const result = (await res.json()) as unknown;
      if (allowedProfiles.length > 0 && url.pathname === "/profiles") {
        const obj =
          typeof result === "object" && result !== null ? (result as Record<string, unknown>) : {};
        const profiles = Array.isArray(obj.profiles) ? obj.profiles : [];
        obj.profiles = profiles.filter((entry) => {
          if (!entry || typeof entry !== "object") return false;
          const name = (entry as Record<string, unknown>).name;
          return typeof name === "string" && allowedProfiles.includes(name);
        });
      }
      let files: BrowserProxyFile[] | undefined;
      const paths = collectBrowserProxyPaths(result);
      if (paths.length > 0) {
        const loaded = await Promise.all(
          paths.map(async (p) => {
            try {
              const file = await readBrowserProxyFile(p);
              if (!file) {
                throw new Error("file not found");
              }
              return file;
            } catch (err) {
              throw new Error(`browser proxy file read failed for ${p}: ${String(err)}`);
            }
          }),
        );
        if (loaded.length > 0) files = loaded;
      }
      const payload: BrowserProxyResult = files ? { result, files } : { result };
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(payload),
      });
    } catch (err) {
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "INVALID_REQUEST", message: String(err) },
      });
    }
    return;
  }

  if (command !== "system.run") {
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "command not supported" },
    });
    return;
  }

  let params: SystemRunParams;
  try {
    params = decodeParams<SystemRunParams>(frame.paramsJSON);
  } catch (err) {
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "INVALID_REQUEST", message: String(err) },
    });
    return;
  }

  if (!Array.isArray(params.command) || params.command.length === 0) {
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "command required" },
    });
    return;
  }

  const argv = params.command.map((item) => String(item));
  const rawCommand = typeof params.rawCommand === "string" ? params.rawCommand.trim() : "";
  const cmdText = rawCommand || formatCommand(argv);
  const agentId = params.agentId?.trim() || undefined;
  const cfg = loadConfig();
  const agentExec = agentId ? resolveAgentConfig(cfg, agentId)?.tools?.exec : undefined;
  const configuredSecurity = resolveExecSecurity(agentExec?.security ?? cfg.tools?.exec?.security);
  const configuredAsk = resolveExecAsk(agentExec?.ask ?? cfg.tools?.exec?.ask);
  const approvals = resolveExecApprovals(agentId, {
    security: configuredSecurity,
    ask: configuredAsk,
  });
  const security = approvals.agent.security;
  const ask = approvals.agent.ask;
  const autoAllowSkills = approvals.agent.autoAllowSkills;
  const sessionKey = params.sessionKey?.trim() || "node";
  const runId = params.runId?.trim() || crypto.randomUUID();
  const env = sanitizeEnv(params.env ?? undefined);
  const safeBins = resolveSafeBins(agentExec?.safeBins ?? cfg.tools?.exec?.safeBins);
  const bins = autoAllowSkills ? await skillBins.current() : new Set<string>();
  let analysisOk = false;
  let allowlistMatches: any[] = [];
  let allowlistSatisfied = false;
  let segments: any[] = [];
  if (rawCommand) {
    const allowlistEval = evaluateShellAllowlist({
      command: rawCommand,
      allowlist: approvals.allowlist,
      safeBins,
      cwd: params.cwd ?? undefined,
      env,
      skillBins: bins,
      autoAllowSkills,
    });
    analysisOk = allowlistEval.analysisOk;
    allowlistMatches = allowlistEval.allowlistMatches;
    allowlistSatisfied =
      security === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
    segments = allowlistEval.segments;
  } else {
    const analysis = analyzeArgvCommand({ argv, cwd: params.cwd ?? undefined, env });
    const allowlistEval = evaluateExecAllowlist({
      analysis,
      allowlist: approvals.allowlist,
      safeBins,
      cwd: params.cwd ?? undefined,
      skillBins: bins,
      autoAllowSkills,
    });
    analysisOk = (analysis as any).ok;
    allowlistMatches = allowlistEval.allowlistMatches;
    allowlistSatisfied =
      security === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
    segments = (analysis as any).segments;
  }

  const useMacAppExec = process.platform === "darwin";
  if (useMacAppExec) {
    const approvalDecision =
      params.approvalDecision === "allow-once" || params.approvalDecision === "allow-always"
        ? params.approvalDecision
        : null;
    const execRequest = {
      command: argv,
      rawCommand: rawCommand || null,
      cwd: params.cwd ?? null,
      env: params.env ?? null,
      timeoutMs: params.timeoutMs ?? null,
      needsScreenRecording: params.needsScreenRecording ?? null,
      agentId: agentId ?? null,
      sessionKey: sessionKey ?? null,
      approvalDecision,
    };
    const response = await runViaMacAppExecHost({ approvals, request: execRequest });
    if (!response) {
      if (execHostEnforced || !execHostFallbackAllowed) {
        await sendNodeEvent(
          client,
          "exec.denied",
          buildExecEventPayload({
            sessionKey,
            runId,
            host: "node",
            command: cmdText,
            reason: "companion-unavailable",
          }),
        );
        await sendInvokeResult(client, frame, {
          ok: false,
          error: {
            code: "UNAVAILABLE",
            message: "COMPANION_APP_UNAVAILABLE: macOS app exec host unreachable",
          },
        });
        return;
      }
    } else if (!response.ok) {
      const reason = response.error.reason ?? "approval-required";
      await sendNodeEvent(
        client,
        "exec.denied",
        buildExecEventPayload({
          sessionKey,
          runId,
          host: "node",
          command: cmdText,
          reason,
        }),
      );
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "UNAVAILABLE", message: response.error.message },
      });
      return;
    } else {
      const result = response.payload;
      const combined = [result.stdout, result.stderr, result.error].filter(Boolean).join("\n");
      await sendNodeEvent(
        client,
        "exec.finished",
        buildExecEventPayload({
          sessionKey,
          runId,
          host: "node",
          command: cmdText,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          success: result.success,
          output: combined,
        }),
      );
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(result),
      });
      return;
    }
  }

  if (security === "deny") {
    await sendNodeEvent(
      client,
      "exec.denied",
      buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "security=deny",
      }),
    );
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DISABLED: security=deny" },
    });
    return;
  }

  const requiresAsk = requiresExecApproval({
    ask,
    security,
    analysisOk,
    allowlistSatisfied,
  });

  const approvalDecision =
    params.approvalDecision === "allow-once" || params.approvalDecision === "allow-always"
      ? params.approvalDecision
      : null;
  const approvedByAsk = approvalDecision !== null || params.approved === true;
  if (requiresAsk && !approvedByAsk) {
    await sendNodeEvent(
      client,
      "exec.denied",
      buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "approval-required",
      }),
    );
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DENIED: approval required" },
    });
    return;
  }
  if (approvalDecision === "allow-always" && security === "allowlist") {
    if (analysisOk) {
      for (const segment of segments) {
        const pattern = segment.resolution?.resolvedPath ?? "";
        if (pattern) addAllowlistEntry(approvals.file, agentId, pattern);
      }
    }
  }

  if (security === "allowlist" && (!analysisOk || !allowlistSatisfied) && !approvedByAsk) {
    await sendNodeEvent(
      client,
      "exec.denied",
      buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "allowlist-miss",
      }),
    );
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DENIED: allowlist miss" },
    });
    return;
  }

  if (allowlistMatches.length > 0) {
    const seen = new Set<string>();
    for (const match of allowlistMatches) {
      if (!match?.pattern || seen.has(match.pattern)) continue;
      seen.add(match.pattern);
      recordAllowlistUse(
        approvals.file,
        agentId,
        match,
        cmdText,
        segments[0]?.resolution?.resolvedPath,
      );
    }
  }

  if (params.needsScreenRecording === true) {
    await sendNodeEvent(
      client,
      "exec.denied",
      buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "permission:screenRecording",
      }),
    );
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "PERMISSION_MISSING: screenRecording" },
    });
    return;
  }

  const result = await runCommand(
    argv,
    params.cwd?.trim() || undefined,
    env,
    params.timeoutMs ?? undefined,
  );
  if (result.truncated) {
    const suffix = "... (truncated)";
    if (result.stderr.trim().length > 0) {
      result.stderr = `${result.stderr}\n${suffix}`;
    } else {
      result.stdout = `${result.stdout}\n${suffix}`;
    }
  }
  const combined = [result.stdout, result.stderr, result.error].filter(Boolean).join("\n");
  await sendNodeEvent(
    client,
    "exec.finished",
    buildExecEventPayload({
      sessionKey,
      runId,
      host: "node",
      command: cmdText,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      success: result.success,
      output: combined,
    }),
  );

  await sendInvokeResult(client, frame, {
    ok: true,
    payloadJSON: JSON.stringify({
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error ?? null,
    }),
  });
}

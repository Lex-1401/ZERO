import type { Command } from "commander";

import { callGateway } from "../gateway/call.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";
import { defaultRuntime } from "../runtime.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { withProgress } from "./progress.js";

type DevicesRpcOpts = {
  url?: string;
  token?: string;
  password?: string;
  timeout?: string;
  json?: boolean;
  device?: string;
  role?: string;
  scope?: string[];
};

type DeviceTokenSummary = {
  role: string;
  scopes?: string[];
  revokedAtMs?: number;
};

type PendingDevice = {
  requestId: string;
  deviceId: string;
  displayName?: string;
  role?: string;
  remoteIp?: string;
  isRepair?: boolean;
  ts?: number;
};

type PairedDevice = {
  deviceId: string;
  displayName?: string;
  roles?: string[];
  scopes?: string[];
  remoteIp?: string;
  tokens?: DeviceTokenSummary[];
  createdAtMs?: number;
  approvedAtMs?: number;
};

type DevicePairingList = {
  pending?: PendingDevice[];
  paired?: PairedDevice[];
};

function formatAge(msAgo: number) {
  const s = Math.max(0, Math.floor(msAgo / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const devicesCallOpts = (cmd: Command, defaults?: { timeoutMs?: number }) =>
  cmd
    .option(
      "--url <url>",
      "URL WebSocket do Gateway (padrão: gateway.remote.url quando configurado)",
    )
    .option("--token <token>", "Token do Gateway (se necessário)")
    .option("--password <password>", "Senha do Gateway (autenticação por senha)")
    .option("--timeout <ms>", "Timeout em ms", String(defaults?.timeoutMs ?? 10_000))
    .option("--json", "Saída em JSON", false);

const callGatewayCli = async (method: string, opts: DevicesRpcOpts, params?: unknown) =>
  withProgress(
    {
      label: `Devices ${method}`,
      indeterminate: true,
      enabled: opts.json !== true,
    },
    async () =>
      await callGateway({
        url: opts.url,
        token: opts.token,
        password: opts.password,
        method,
        params,
        timeoutMs: Number(opts.timeout ?? 10_000),
        clientName: GATEWAY_CLIENT_NAMES.CLI,
        mode: GATEWAY_CLIENT_MODES.CLI,
      }),
  );

function parseDevicePairingList(value: unknown): DevicePairingList {
  const obj = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    pending: Array.isArray(obj.pending) ? (obj.pending as PendingDevice[]) : [],
    paired: Array.isArray(obj.paired) ? (obj.paired as PairedDevice[]) : [],
  };
}

function formatTokenSummary(tokens: DeviceTokenSummary[] | undefined) {
  if (!tokens || tokens.length === 0) return "nenhum";
  const parts = tokens
    .map((t) => `${t.role}${t.revokedAtMs ? " (revogado)" : ""}`)
    .sort((a, b) => a.localeCompare(b));
  return parts.join(", ");
}

export function registerDevicesCli(program: Command) {
  const devices = program
    .command("devices")
    .description("Pareamento de dispositivos e tokens de autenticação");

  devicesCallOpts(
    devices
      .command("list")
      .description("Listar dispositivos pendentes e pareados")
      .action(async (opts: DevicesRpcOpts) => {
        const result = await callGatewayCli("device.pair.list", opts, {});
        const list = parseDevicePairingList(result);
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(list, null, 2));
          return;
        }
        if (list.pending?.length) {
          const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
          defaultRuntime.log(
            `${theme.heading("Pendentes")} ${theme.muted(`(${list.pending.length})`)}`,
          );
          defaultRuntime.log(
            renderTable({
              width: tableWidth,
              columns: [
                { key: "Request", header: "Solicitação", minWidth: 10 },
                { key: "Device", header: "Dispositivo", minWidth: 16, flex: true },
                { key: "Role", header: "Papel", minWidth: 8 },
                { key: "IP", header: "IP", minWidth: 12 },
                { key: "Age", header: "Idade", minWidth: 8 },
                { key: "Flags", header: "Sinalizações", minWidth: 8 },
              ],
              rows: list.pending.map((req) => ({
                Request: req.requestId,
                Device: req.displayName || req.deviceId,
                Role: req.role ?? "",
                IP: req.remoteIp ?? "",
                Age: typeof req.ts === "number" ? `há ${formatAge(Date.now() - req.ts)}` : "",
                Flags: req.isRepair ? "reparo" : "",
              })),
            }).trimEnd(),
          );
        }
        if (list.paired?.length) {
          const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
          defaultRuntime.log(
            `${theme.heading("Pareados")} ${theme.muted(`(${list.paired.length})`)}`,
          );
          defaultRuntime.log(
            renderTable({
              width: tableWidth,
              columns: [
                { key: "Device", header: "Dispositivo", minWidth: 16, flex: true },
                { key: "Roles", header: "Papéis", minWidth: 12, flex: true },
                { key: "Scopes", header: "Escopos", minWidth: 12, flex: true },
                { key: "Tokens", header: "Tokens", minWidth: 12, flex: true },
                { key: "IP", header: "IP", minWidth: 12 },
              ],
              rows: list.paired.map((device) => ({
                Device: device.displayName || device.deviceId,
                Roles: device.roles?.length ? device.roles.join(", ") : "",
                Scopes: device.scopes?.length ? device.scopes.join(", ") : "",
                Tokens: formatTokenSummary(device.tokens),
                IP: device.remoteIp ?? "",
              })),
            }).trimEnd(),
          );
        }
        if (!list.pending?.length && !list.paired?.length) {
          defaultRuntime.log(theme.muted("Nenhuma entrada de pareamento de dispositivo."));
        }
      }),
  );

  devicesCallOpts(
    devices
      .command("approve")
      .description("Aprovar uma solicitação de pareamento de dispositivo pendente")
      .argument("<requestId>", "ID da solicitação pendente")
      .action(async (requestId: string, opts: DevicesRpcOpts) => {
        const result = await callGatewayCli("device.pair.approve", opts, { requestId });
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        const deviceId = (result as { device?: { deviceId?: string } })?.device?.deviceId;
        defaultRuntime.log(`${theme.success("Aprovado")} ${theme.command(deviceId ?? "ok")}`);
      }),
  );

  devicesCallOpts(
    devices
      .command("reject")
      .description("Rejeitar uma solicitação de pareamento de dispositivo pendente")
      .argument("<requestId>", "ID da solicitação pendente")
      .action(async (requestId: string, opts: DevicesRpcOpts) => {
        const result = await callGatewayCli("device.pair.reject", opts, { requestId });
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        const deviceId = (result as { deviceId?: string })?.deviceId;
        defaultRuntime.log(`${theme.warn("Rejeitado")} ${theme.command(deviceId ?? "ok")}`);
      }),
  );

  devicesCallOpts(
    devices
      .command("rotate")
      .description("Rotacionar um token de dispositivo para um papel")
      .requiredOption("--device <id>", "ID do dispositivo")
      .requiredOption("--role <role>", "Nome do papel")
      .option("--scope <scope...>", "Escopos para anexar ao token (repetível)")
      .action(async (opts: DevicesRpcOpts) => {
        const deviceId = String(opts.device ?? "").trim();
        const role = String(opts.role ?? "").trim();
        if (!deviceId || !role) {
          defaultRuntime.error("--device e --role são obrigatórios");
          defaultRuntime.exit(1);
          return;
        }
        const result = await callGatewayCli("device.token.rotate", opts, {
          deviceId,
          role,
          scopes: Array.isArray(opts.scope) ? opts.scope : undefined,
        });
        defaultRuntime.log(JSON.stringify(result, null, 2));
      }),
  );

  devicesCallOpts(
    devices
      .command("revoke")
      .description("Revogar um token de dispositivo para um papel")
      .requiredOption("--device <id>", "ID do dispositivo")
      .requiredOption("--role <role>", "Nome do papel")
      .action(async (opts: DevicesRpcOpts) => {
        const deviceId = String(opts.device ?? "").trim();
        const role = String(opts.role ?? "").trim();
        if (!deviceId || !role) {
          defaultRuntime.error("--device e --role são obrigatórios");
          defaultRuntime.exit(1);
          return;
        }
        const result = await callGatewayCli("device.token.revoke", opts, {
          deviceId,
          role,
        });
        defaultRuntime.log(JSON.stringify(result, null, 2));
      }),
  );
}

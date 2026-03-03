import type { Command } from "commander";
import { randomIdempotencyKey } from "../../gateway/call.js";
import { defaultRuntime } from "../../runtime.js";
import {
  type CameraFacing,
  cameraTempPath,
  parseCameraClipPayload,
  parseCameraSnapPayload,
  writeBase64ToFile,
} from "../nodes-camera.js";
import { parseDurationMs } from "../parse-duration.js";
import { getNodesTheme, runNodesCommand } from "./cli-utils.js";
import { callGatewayCli, nodesCallOpts, resolveNodeId } from "./rpc.js";
import type { NodesRpcOpts } from "./types.js";
import { renderTable } from "../../terminal/table.js";
import { shortenHomePath } from "../../utils.js";

const parseFacing = (value: string): CameraFacing => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "front" || v === "back") return v;
  throw new Error(`posição da câmera inválida: ${value} (esperado front|back)`);
};

export function registerNodesCameraCommands(nodes: Command) {
  const camera = nodes.command("camera").description("Capturar mídia de câmera de um nó pareado");

  nodesCallOpts(
    camera
      .command("list")
      .description("Listar câmeras disponíveis em um nó")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("camera list", async () => {
          const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
          const raw = (await callGatewayCli("node.invoke", opts, {
            nodeId,
            command: "camera.list",
            params: {},
            idempotencyKey: randomIdempotencyKey(),
          })) as unknown;

          const res = typeof raw === "object" && raw !== null ? (raw as { payload?: unknown }) : {};
          const payload =
            typeof res.payload === "object" && res.payload !== null
              ? (res.payload as { devices?: unknown })
              : {};
          const devices = Array.isArray(payload.devices) ? payload.devices : [];

          if (opts.json) {
            defaultRuntime.log(JSON.stringify(devices, null, 2));
            return;
          }

          if (devices.length === 0) {
            const { muted } = getNodesTheme();
            defaultRuntime.log(muted("Nenhuma câmera reportada."));
            return;
          }

          const { heading, muted } = getNodesTheme();
          const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
          const rows = devices.map((device) => ({
            Name: typeof device.name === "string" ? device.name : "Câmera Desconhecida",
            Position:
              typeof device.position === "string" ? device.position : muted("não especificada"),
            ID: typeof device.id === "string" ? device.id : "",
          }));
          defaultRuntime.log(heading("Câmeras"));
          defaultRuntime.log(
            renderTable({
              width: tableWidth,
              columns: [
                { key: "Name", header: "Nome", minWidth: 14, flex: true },
                { key: "Position", header: "Posição", minWidth: 10 },
                { key: "ID", header: "ID", minWidth: 10, flex: true },
              ],
              rows,
            }).trimEnd(),
          );
        });
      }),
    { timeoutMs: 60_000 },
  );

  nodesCallOpts(
    camera
      .command("snap")
      .description("Capturar uma foto de uma câmera de nó (imprime MEDIA:<path>)")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--facing <front|back|both>", "Posição da câmera", "both")
      .option("--device-id <id>", "ID do dispositivo da câmera (de nodes camera list)")
      .option("--max-width <px>", "Largura máxima em px (opcional)")
      .option("--quality <0-1>", "Qualidade JPEG (padrão 0.9)")
      .option("--delay-ms <ms>", "Atraso antes da captura em ms (padrão macOS 2000)")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms (padrão 20000)", "20000")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("camera snap", async () => {
          const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
          const facingOpt = String(opts.facing ?? "both")
            .trim()
            .toLowerCase();
          const facings: CameraFacing[] =
            facingOpt === "both"
              ? ["front", "back"]
              : facingOpt === "front" || facingOpt === "back"
                ? [facingOpt]
                : (() => {
                    throw new Error(
                      `posição da câmera inválida: ${String(opts.facing)} (esperado front|back|both)`,
                    );
                  })();

          const maxWidth = opts.maxWidth ? Number.parseInt(String(opts.maxWidth), 10) : undefined;
          const quality = opts.quality ? Number.parseFloat(String(opts.quality)) : undefined;
          const delayMs = opts.delayMs ? Number.parseInt(String(opts.delayMs), 10) : undefined;
          const deviceId = opts.deviceId ? String(opts.deviceId).trim() : undefined;
          const timeoutMs = opts.invokeTimeout
            ? Number.parseInt(String(opts.invokeTimeout), 10)
            : undefined;

          const results: Array<{
            facing: CameraFacing;
            path: string;
            width: number;
            height: number;
          }> = [];

          for (const facing of facings) {
            const invokeParams: Record<string, unknown> = {
              nodeId,
              command: "camera.snap",
              params: {
                facing,
                maxWidth: Number.isFinite(maxWidth) ? maxWidth : undefined,
                quality: Number.isFinite(quality) ? quality : undefined,
                format: "jpg",
                delayMs: Number.isFinite(delayMs) ? delayMs : undefined,
                deviceId: deviceId || undefined,
              },
              idempotencyKey: randomIdempotencyKey(),
            };
            if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs)) {
              invokeParams.timeoutMs = timeoutMs;
            }

            const raw = (await callGatewayCli("node.invoke", opts, invokeParams)) as unknown;
            const res =
              typeof raw === "object" && raw !== null ? (raw as { payload?: unknown }) : {};
            const payload = parseCameraSnapPayload(res.payload);
            const filePath = cameraTempPath({
              kind: "snap",
              facing,
              ext: payload.format === "jpeg" ? "jpg" : payload.format,
            });
            await writeBase64ToFile(filePath, payload.base64);
            results.push({
              facing,
              path: filePath,
              width: payload.width,
              height: payload.height,
            });
          }

          if (opts.json) {
            defaultRuntime.log(JSON.stringify({ files: results }, null, 2));
            return;
          }
          defaultRuntime.log(results.map((r) => `MEDIA:${shortenHomePath(r.path)}`).join("\n"));
        });
      }),
    { timeoutMs: 60_000 },
  );

  nodesCallOpts(
    camera
      .command("clip")
      .description("Capturar um pequeno clipe de vídeo de uma câmera de nó (imprime MEDIA:<path>)")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--facing <front|back>", "Posição da câmera", "front")
      .option("--device-id <id>", "ID do dispositivo da câmera (de nodes camera list)")
      .option("--duration <ms|10s|1m>", "Duração (padrão 3000ms; suporta ms/s/m, ex: 10s)", "3000")
      .option("--no-audio", "Desabilitar captura de áudio")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms (padrão 90000)", "90000")
      .action(async (opts: NodesRpcOpts & { audio?: boolean }) => {
        await runNodesCommand("camera clip", async () => {
          const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
          const facing = parseFacing(String(opts.facing ?? "front"));
          const durationMs = parseDurationMs(String(opts.duration ?? "3000"));
          const includeAudio = opts.audio !== false;
          const timeoutMs = opts.invokeTimeout
            ? Number.parseInt(String(opts.invokeTimeout), 10)
            : undefined;
          const deviceId = opts.deviceId ? String(opts.deviceId).trim() : undefined;

          const invokeParams: Record<string, unknown> = {
            nodeId,
            command: "camera.clip",
            params: {
              facing,
              durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
              includeAudio,
              format: "mp4",
              deviceId: deviceId || undefined,
            },
            idempotencyKey: randomIdempotencyKey(),
          };
          if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs)) {
            invokeParams.timeoutMs = timeoutMs;
          }

          const raw = (await callGatewayCli("node.invoke", opts, invokeParams)) as unknown;
          const res = typeof raw === "object" && raw !== null ? (raw as { payload?: unknown }) : {};
          const payload = parseCameraClipPayload(res.payload);
          const filePath = cameraTempPath({
            kind: "clip",
            facing,
            ext: payload.format,
          });
          await writeBase64ToFile(filePath, payload.base64);

          if (opts.json) {
            defaultRuntime.log(
              JSON.stringify(
                {
                  file: {
                    facing,
                    path: filePath,
                    durationMs: payload.durationMs,
                    hasAudio: payload.hasAudio,
                  },
                },
                null,
                2,
              ),
            );
            return;
          }
          defaultRuntime.log(`MEDIA:${shortenHomePath(filePath)}`);
        });
      }),
    { timeoutMs: 90_000 },
  );
}

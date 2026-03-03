import fs from "node:fs/promises";
import type { Command } from "commander";
import { randomIdempotencyKey } from "../../gateway/call.js";
import { defaultRuntime } from "../../runtime.js";
import { writeBase64ToFile } from "../nodes-camera.js";
import { canvasSnapshotTempPath, parseCanvasSnapshotPayload } from "../nodes-canvas.js";
import { parseTimeoutMs } from "../nodes-run.js";
import { buildA2UITextJsonl, validateA2UIJsonl } from "./a2ui-jsonl.js";
import { getNodesTheme, runNodesCommand } from "./cli-utils.js";
import { callGatewayCli, nodesCallOpts, resolveNodeId } from "./rpc.js";
import type { NodesRpcOpts } from "./types.js";
import { shortenHomePath } from "../../utils.js";

async function invokeCanvas(opts: NodesRpcOpts, command: string, params?: Record<string, unknown>) {
  const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
  const invokeParams: Record<string, unknown> = {
    nodeId,
    command,
    params,
    idempotencyKey: randomIdempotencyKey(),
  };
  const timeoutMs = parseTimeoutMs(opts.invokeTimeout);
  if (typeof timeoutMs === "number") {
    invokeParams.timeoutMs = timeoutMs;
  }
  return await callGatewayCli("node.invoke", opts, invokeParams);
}

export function registerNodesCanvasCommands(nodes: Command) {
  const canvas = nodes
    .command("canvas")
    .description("Capturar ou renderizar conteúdo de canvas de um nó pareado");

  nodesCallOpts(
    canvas
      .command("snapshot")
      .description("Capturar um snapshot de canvas (imprime MEDIA:<path>)")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--format <png|jpg|jpeg>", "Formato da imagem", "jpg")
      .option("--max-width <px>", "Largura máxima em px (opcional)")
      .option("--quality <0-1>", "Qualidade JPEG (opcional)")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms (padrão 20000)", "20000")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("canvas snapshot", async () => {
          const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
          const formatOpt = String(opts.format ?? "jpg")
            .trim()
            .toLowerCase();
          const formatForParams =
            formatOpt === "jpg" ? "jpeg" : formatOpt === "jpeg" ? "jpeg" : "png";
          if (formatForParams !== "png" && formatForParams !== "jpeg") {
            throw new Error(`formato inválido: ${String(opts.format)} (esperado png|jpg|jpeg)`);
          }

          const maxWidth = opts.maxWidth ? Number.parseInt(String(opts.maxWidth), 10) : undefined;
          const quality = opts.quality ? Number.parseFloat(String(opts.quality)) : undefined;
          const timeoutMs = opts.invokeTimeout
            ? Number.parseInt(String(opts.invokeTimeout), 10)
            : undefined;

          const invokeParams: Record<string, unknown> = {
            nodeId,
            command: "canvas.snapshot",
            params: {
              format: formatForParams,
              maxWidth: Number.isFinite(maxWidth) ? maxWidth : undefined,
              quality: Number.isFinite(quality) ? quality : undefined,
            },
            idempotencyKey: randomIdempotencyKey(),
          };
          if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs)) {
            invokeParams.timeoutMs = timeoutMs;
          }

          const raw = (await callGatewayCli("node.invoke", opts, invokeParams)) as unknown;
          const res = typeof raw === "object" && raw !== null ? (raw as { payload?: unknown }) : {};
          const payload = parseCanvasSnapshotPayload(res.payload);
          const filePath = canvasSnapshotTempPath({
            ext: payload.format === "jpeg" ? "jpg" : payload.format,
          });
          await writeBase64ToFile(filePath, payload.base64);

          if (opts.json) {
            defaultRuntime.log(
              JSON.stringify({ file: { path: filePath, format: payload.format } }, null, 2),
            );
            return;
          }
          defaultRuntime.log(`MEDIA:${shortenHomePath(filePath)}`);
        });
      }),
    { timeoutMs: 60_000 },
  );

  nodesCallOpts(
    canvas
      .command("present")
      .description("Mostrar o canvas (opcionalmente com uma URL/caminho de destino)")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--target <urlOrPath>", "URL/caminho de destino (opcional)")
      .option("--x <px>", "Coordenada x de posicionamento")
      .option("--y <px>", "Coordenada y de posicionamento")
      .option("--width <px>", "Largura de posicionamento")
      .option("--height <px>", "Altura de posicionamento")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("canvas present", async () => {
          const placement = {
            x: opts.x ? Number.parseFloat(opts.x) : undefined,
            y: opts.y ? Number.parseFloat(opts.y) : undefined,
            width: opts.width ? Number.parseFloat(opts.width) : undefined,
            height: opts.height ? Number.parseFloat(opts.height) : undefined,
          };
          const params: Record<string, unknown> = {};
          if (opts.target) params.url = String(opts.target);
          if (
            Number.isFinite(placement.x) ||
            Number.isFinite(placement.y) ||
            Number.isFinite(placement.width) ||
            Number.isFinite(placement.height)
          ) {
            params.placement = placement;
          }
          await invokeCanvas(opts, "canvas.present", params);
          if (!opts.json) {
            const { ok } = getNodesTheme();
            defaultRuntime.log(ok("canvas apresentado com sucesso"));
          }
        });
      }),
  );

  nodesCallOpts(
    canvas
      .command("hide")
      .description("Ocultar o canvas")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("canvas hide", async () => {
          await invokeCanvas(opts, "canvas.hide", undefined);
          if (!opts.json) {
            const { ok } = getNodesTheme();
            defaultRuntime.log(ok("canvas ocultado com sucesso"));
          }
        });
      }),
  );

  nodesCallOpts(
    canvas
      .command("navigate")
      .description("Navegar o canvas para uma URL")
      .argument("<url>", "URL/caminho de destino")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms")
      .action(async (url: string, opts: NodesRpcOpts) => {
        await runNodesCommand("canvas navigate", async () => {
          await invokeCanvas(opts, "canvas.navigate", { url });
          if (!opts.json) {
            const { ok } = getNodesTheme();
            defaultRuntime.log(ok("navegação do canvas ok"));
          }
        });
      }),
  );

  nodesCallOpts(
    canvas
      .command("eval")
      .description("Avaliar JavaScript no canvas")
      .argument("[js]", "JavaScript para avaliar")
      .option("--js <code>", "JavaScript para avaliar")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms")
      .action(async (jsArg: string | undefined, opts: NodesRpcOpts) => {
        await runNodesCommand("canvas eval", async () => {
          const js = opts.js ?? jsArg;
          if (!js) throw new Error("falta --js ou <js>");
          const raw = await invokeCanvas(opts, "canvas.eval", {
            javaScript: js,
          });
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(raw, null, 2));
            return;
          }
          const payload =
            typeof raw === "object" && raw !== null
              ? (raw as { payload?: { result?: string } }).payload
              : undefined;
          if (payload?.result) defaultRuntime.log(payload.result);
          else {
            const { ok } = getNodesTheme();
            defaultRuntime.log(ok("avaliação do canvas ok"));
          }
        });
      }),
  );

  const a2ui = canvas.command("a2ui").description("Renderizar conteúdo A2UI no canvas");

  nodesCallOpts(
    a2ui
      .command("push")
      .description("Enviar JSONL A2UI para o canvas")
      .option("--jsonl <path>", "Caminho para o payload JSONL")
      .option("--text <text>", "Renderizar um payload de texto A2UI rápido")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("canvas a2ui push", async () => {
          const hasJsonl = Boolean(opts.jsonl);
          const hasText = typeof opts.text === "string";
          if (hasJsonl === hasText) {
            throw new Error("forneça exatamente um entre --jsonl ou --text");
          }

          const jsonl = hasText
            ? buildA2UITextJsonl(String(opts.text ?? ""))
            : await fs.readFile(String(opts.jsonl), "utf8");
          const { version, messageCount } = validateA2UIJsonl(jsonl);
          if (version === "v0.9") {
            throw new Error(
              "Detected A2UI v0.9 JSONL (createSurface). ZERO currently supports v0.8 only.",
            );
          }
          await invokeCanvas(opts, "canvas.a2ui.pushJSONL", { jsonl });
          if (!opts.json) {
            const { ok } = getNodesTheme();
            defaultRuntime.log(
              ok(`envio a2ui ok (v0.8, ${messageCount} mensage${messageCount === 1 ? "m" : "ns"})`),
            );
          }
        });
      }),
  );

  nodesCallOpts(
    a2ui
      .command("reset")
      .description("Resetar o estado do renderizador A2UI")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("canvas a2ui reset", async () => {
          await invokeCanvas(opts, "canvas.a2ui.reset", undefined);
          if (!opts.json) {
            const { ok } = getNodesTheme();
            defaultRuntime.log(ok("reset de a2ui ok"));
          }
        });
      }),
  );
}

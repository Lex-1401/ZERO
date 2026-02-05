import type { Command } from "commander";
import { randomIdempotencyKey } from "../../gateway/call.js";
import { defaultRuntime } from "../../runtime.js";
import { getNodesTheme, runNodesCommand } from "./cli-utils.js";
import { callGatewayCli, nodesCallOpts, resolveNodeId } from "./rpc.js";
import type { NodesRpcOpts } from "./types.js";

export function registerNodesNotifyCommand(nodes: Command) {
  nodesCallOpts(
    nodes
      .command("notify")
      .description("Enviar uma notificação local em um nó (apenas mac)")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .option("--title <text>", "Título da notificação")
      .option("--body <text>", "Corpo da notificação")
      .option("--sound <name>", "Som da notificação")
      .option("--priority <passive|active|timeSensitive>", "Prioridade da notificação")
      .option("--delivery <system|overlay|auto>", "Modo de entrega", "system")
      .option("--invoke-timeout <ms>", "Timeout de invocação do nó em ms (padrão 15000)", "15000")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("notify", async () => {
          const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
          const title = String(opts.title ?? "").trim();
          const body = String(opts.body ?? "").trim();
          if (!title && !body) {
            throw new Error("falta --title ou --body");
          }
          const invokeTimeout = opts.invokeTimeout
            ? Number.parseInt(String(opts.invokeTimeout), 10)
            : undefined;
          const invokeParams: Record<string, unknown> = {
            nodeId,
            command: "system.notify",
            params: {
              title,
              body,
              sound: opts.sound,
              priority: opts.priority,
              delivery: opts.delivery,
            },
            idempotencyKey: String(opts.idempotencyKey ?? randomIdempotencyKey()),
          };
          if (typeof invokeTimeout === "number" && Number.isFinite(invokeTimeout)) {
            invokeParams.timeoutMs = invokeTimeout;
          }

          const result = await callGatewayCli("node.invoke", opts, invokeParams);
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          const { ok } = getNodesTheme();
          defaultRuntime.log(ok("notificação ok"));
        });
      }),
  );
}

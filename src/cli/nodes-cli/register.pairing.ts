import type { Command } from "commander";
import { defaultRuntime } from "../../runtime.js";
import { formatAge, parsePairingList } from "./format.js";
import { getNodesTheme, runNodesCommand } from "./cli-utils.js";
import { callGatewayCli, nodesCallOpts, resolveNodeId } from "./rpc.js";
import type { NodesRpcOpts } from "./types.js";
import { renderTable } from "../../terminal/table.js";

export function registerNodesPairingCommands(nodes: Command) {
  nodesCallOpts(
    nodes
      .command("pending")
      .description("Listar solicitações de pareamento pendentes")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("pending", async () => {
          const result = (await callGatewayCli("node.pair.list", opts, {})) as unknown;
          const { pending } = parsePairingList(result);
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(pending, null, 2));
            return;
          }
          if (pending.length === 0) {
            const { muted } = getNodesTheme();
            defaultRuntime.log(muted("Nenhuma solicitação de pareamento pendente."));
            return;
          }
          const { heading, warn, muted } = getNodesTheme();
          const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
          const now = Date.now();
          const rows = pending.map((r) => ({
            Request: r.requestId,
            Node: r.displayName?.trim() ? r.displayName.trim() : r.nodeId,
            IP: r.remoteIp ?? "",
            Requested:
              typeof r.ts === "number"
                ? `há ${formatAge(Math.max(0, now - r.ts))}`
                : muted("desconhecido"),
            Repair: r.isRepair ? warn("sim") : "",
          }));
          defaultRuntime.log(heading("Pendentes"));
          defaultRuntime.log(
            renderTable({
              width: tableWidth,
              columns: [
                { key: "Request", header: "Solicitação", minWidth: 8 },
                { key: "Node", header: "Nó", minWidth: 14, flex: true },
                { key: "IP", header: "IP", minWidth: 10 },
                { key: "Requested", header: "Solicitado", minWidth: 12 },
                { key: "Repair", header: "Reparo", minWidth: 6 },
              ],
              rows,
            }).trimEnd(),
          );
        });
      }),
  );

  nodesCallOpts(
    nodes
      .command("approve")
      .description("Aprovar uma solicitação de pareamento pendente")
      .argument("<requestId>", "ID da solicitação pendente")
      .action(async (requestId: string, opts: NodesRpcOpts) => {
        await runNodesCommand("approve", async () => {
          const result = await callGatewayCli("node.pair.approve", opts, {
            requestId,
          });
          defaultRuntime.log(JSON.stringify(result, null, 2));
        });
      }),
  );

  nodesCallOpts(
    nodes
      .command("reject")
      .description("Rejeitar uma solicitação de pareamento pendente")
      .argument("<requestId>", "ID da solicitação pendente")
      .action(async (requestId: string, opts: NodesRpcOpts) => {
        await runNodesCommand("reject", async () => {
          const result = await callGatewayCli("node.pair.reject", opts, {
            requestId,
          });
          defaultRuntime.log(JSON.stringify(result, null, 2));
        });
      }),
  );

  nodesCallOpts(
    nodes
      .command("rename")
      .description("Renomear um nó pareado (sobrescrever nome de exibição)")
      .requiredOption("--node <idOrNameOrIp>", "ID, nome ou IP do nó")
      .requiredOption("--name <displayName>", "Novo nome de exibição")
      .action(async (opts: NodesRpcOpts) => {
        await runNodesCommand("rename", async () => {
          const nodeId = await resolveNodeId(opts, String(opts.node ?? ""));
          const name = String(opts.name ?? "").trim();
          if (!nodeId || !name) {
            defaultRuntime.error("--node e --name são obrigatórios");
            defaultRuntime.exit(1);
            return;
          }
          const result = await callGatewayCli("node.rename", opts, {
            nodeId,
            displayName: name,
          });
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          const { ok } = getNodesTheme();
          defaultRuntime.log(ok(`renomeação do nó ok: ${nodeId} -> ${name}`));
        });
      }),
  );
}

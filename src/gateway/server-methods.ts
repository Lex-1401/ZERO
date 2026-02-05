import { ErrorCodes, errorShape } from "./protocol/index.js";
import { agentHandlers } from "./server-methods/agent.js";
import { agentsHandlers } from "./server-methods/agents.js";
import { channelsHandlers } from "./server-methods/channels.js";
import { chatHandlers } from "./server-methods/chat.js";
import { configHandlers } from "./server-methods/config.js";
import { connectHandlers } from "./server-methods/connect.js";
import { cronHandlers } from "./server-methods/cron.js";
import { deviceHandlers } from "./server-methods/devices.js";
import { execApprovalsHandlers } from "./server-methods/exec-approvals.js";
import { healthHandlers } from "./server-methods/health.js";
import { logsHandlers } from "./server-methods/logs.js";
import { modelsHandlers } from "./server-methods/models.js";
import { nodeHandlers } from "./server-methods/nodes.js";
import { sendHandlers } from "./server-methods/send.js";
import { sessionsHandlers } from "./server-methods/sessions.js";
import { skillsHandlers } from "./server-methods/skills.js";
import { systemHandlers } from "./server-methods/system.js";
import { talkHandlers } from "./server-methods/talk.js";
import { ttsHandlers } from "./server-methods/tts.js";
import type { GatewayRequestHandlers, GatewayRequestOptions } from "./server-methods/types.js";
import { updateHandlers } from "./server-methods/update.js";
import { usageHandlers } from "./server-methods/usage.js";
import { voicewakeHandlers } from "./server-methods/voicewake.js";
import { webHandlers } from "./server-methods/web.js";
import { wizardHandlers } from "./server-methods/wizard.js";
import { memoryHandlers } from "./server-methods/memory-search.js";
import { telemetryHandlers } from "./server-methods/telemetry.js";

const ADMIN_SCOPE = "operator.admin";
const READ_SCOPE = "operator.read";
const WRITE_SCOPE = "operator.write";
const APPROVALS_SCOPE = "operator.approvals";
const PAIRING_SCOPE = "operator.pairing";

const APPROVAL_METHODS = new Set(["exec.approval.request", "exec.approval.resolve"]);
const NODE_ROLE_METHODS = new Set(["node.invoke.result", "node.event", "skills.bins"]);
const PAIRING_METHODS = new Set([
  "node.pair.request",
  "node.pair.list",
  "node.pair.approve",
  "node.pair.reject",
  "node.pair.verify",
  "device.pair.list",
  "device.pair.approve",
  "device.pair.reject",
  "device.token.rotate",
  "device.token.revoke",
  "node.rename",
]);
const ADMIN_METHOD_PREFIXES = ["exec.approvals."];
const READ_METHODS = new Set([
  "health",
  "logs.tail",
  "channels.status",
  "status",
  "usage.status",
  "usage.cost",
  "tts.status",
  "tts.providers",
  "models.list",
  "agents.list",
  "agent.identity.get",
  "skills.status",
  "voicewake.get",
  "telemetry.summary",
  "sessions.list",
  "sessions.preview",
  "cron.list",
  "cron.status",
  "cron.runs",
  "system-presence",
  "last-heartbeat",
  "node.list",
  "node.describe",
  "chat.history",
  "memory.search",
  "system.smartScan",
]);
const WRITE_METHODS = new Set([
  "send",
  "agent",
  "agent.wait",
  "wake",
  "talk.mode",
  "tts.enable",
  "tts.disable",
  "tts.convert",
  "tts.setProvider",
  "voicewake.set",
  "node.invoke",
  "chat.send",
  "chat.abort",
  "system.panic",
]);

/**
 * Autoriza uma requisição do gateway com base no papel (role) e escopos do cliente.
 *
 * Esta função aplica o Controle de Acesso Baseado em Papel (RBAC) para a API RPC do Gateway.
 * Ela verifica se o cliente possui o papel necessário (ex: 'operator') e escopos específicos
 * (ex: 'operator.read', 'operator.write', 'operator.admin') para executar o método solicitado.
 *
 * @param method - O nome do método RPC sendo solicitado.
 * @param client - As informações do cliente provenientes do handshake de conexão.
 * @returns Um objeto de erro se a autorização falhar, ou null se autorizado.
 */
function authorizeGatewayMethod(method: string, client: GatewayRequestOptions["client"]) {
  if (!client?.connect) return null;
  const role = client.connect.role ?? "operator";
  const scopes = client.connect.scopes ?? [];
  if (NODE_ROLE_METHODS.has(method)) {
    if (role === "node") return null;
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${role}`);
  }
  if (role === "node") {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${role}`);
  }
  if (role !== "operator") {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${role}`);
  }
  if (scopes.includes(ADMIN_SCOPE)) return null;
  if (APPROVAL_METHODS.has(method) && !scopes.includes(APPROVALS_SCOPE)) {
    return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.approvals");
  }
  if (PAIRING_METHODS.has(method) && !scopes.includes(PAIRING_SCOPE)) {
    return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.pairing");
  }
  if (READ_METHODS.has(method) && !(scopes.includes(READ_SCOPE) || scopes.includes(WRITE_SCOPE))) {
    return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.read");
  }
  if (WRITE_METHODS.has(method) && !scopes.includes(WRITE_SCOPE)) {
    return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.write");
  }
  if (APPROVAL_METHODS.has(method)) return null;
  if (PAIRING_METHODS.has(method)) return null;
  if (READ_METHODS.has(method)) return null;
  if (WRITE_METHODS.has(method)) return null;
  if (ADMIN_METHOD_PREFIXES.some((prefix) => method.startsWith(prefix))) {
    return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.admin");
  }
  if (
    method.startsWith("config.") ||
    method.startsWith("wizard.") ||
    method.startsWith("system.apply") ||
    method.startsWith("update.") ||
    method === "channels.logout" ||
    method === "skills.install" ||
    method === "skills.update" ||
    method === "cron.add" ||
    method === "cron.update" ||
    method === "cron.remove" ||
    method === "cron.run" ||
    method === "sessions.patch" ||
    method === "sessions.reset" ||
    method === "sessions.delete" ||
    method === "sessions.compact"
  ) {
    return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.admin");
  }
  return errorShape(ErrorCodes.INVALID_REQUEST, "missing scope: operator.admin");
}

/**
 * Mapa combinado de todos os manipuladores de requisição principais do gateway.
 *
 * Isso inclui manipuladores para:
 * - Conexão e Autenticação (connect, devices)
 * - Operações do Sistema (logs, health, system, update, cron)
 * - Chat e mensagens (chat, channels, send, talk, voicewake)
 * - Gerenciamento de Recursos (models, skills, nodes)
 * - Estado de tempo de execução (usage, sessions, agents)
 */
export const coreGatewayHandlers: GatewayRequestHandlers = {
  ...connectHandlers,
  ...logsHandlers,
  ...voicewakeHandlers,
  ...healthHandlers,
  ...channelsHandlers,
  ...chatHandlers,
  ...cronHandlers,
  ...deviceHandlers,
  ...execApprovalsHandlers,
  ...webHandlers,
  ...modelsHandlers,
  ...configHandlers,
  ...wizardHandlers,
  ...talkHandlers,
  ...ttsHandlers,
  ...skillsHandlers,
  ...sessionsHandlers,
  ...systemHandlers,
  ...updateHandlers,
  ...nodeHandlers,
  ...sendHandlers,
  ...usageHandlers,
  ...agentHandlers,
  ...agentsHandlers,
  ...memoryHandlers,
  ...telemetryHandlers,
};

/**
 * Despacha uma requisição do gateway para o manipulador apropriado.
 *
 * Esta função é o ponto de entrada central para processar todas as requisições JSON-RPC recebidas pelo gateway.
 * Ela executa os seguintes passos:
 * 1. Verifica se o cliente está autorizado a chamar o método solicitado usando `authorizeGatewayMethod`.
 * 2. Procura o manipulador para o método em `extraHandlers` (se fornecido) ou `coreGatewayHandlers`.
 * 3. Invoca o manipulador se encontrado, ou retorna um erro.
 *
 * @param opts - opções de processamento
 * @param opts.req - O quadro da requisição.
 * @param opts.respond - Função para enviar uma resposta de volta ao cliente.
 * @param opts.client - O contexto do cliente.
 * @param opts.extraHandlers - Manipuladores adicionais opcionais (ex: de plugins).
 */
export async function handleGatewayRequest(
  opts: GatewayRequestOptions & { extraHandlers?: GatewayRequestHandlers },
): Promise<void> {
  const { req, respond, client, isWebchatConnect, context } = opts;
  // console.log("[debug-ws] handling req", req.id, req.method);
  const authError = authorizeGatewayMethod(req.method, client);
  if (authError) {
    respond(false, undefined, authError);
    return;
  }
  const handler = opts.extraHandlers?.[req.method] ?? coreGatewayHandlers[req.method];
  if (!handler) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, `unknown method: ${req.method}`),
    );
    return;
  }
  await handler({
    req,
    params: (req.params ?? {}) as Record<string, unknown>,
    client,
    isWebchatConnect,
    respond,
    context,
  });
}

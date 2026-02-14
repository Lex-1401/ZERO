import type { ReasoningLevel, ThinkLevel } from "../auto-reply/thinking.js";
import { SILENT_REPLY_TOKEN } from "../auto-reply/tokens.js";
import { listDeliverableMessageChannels } from "../utils/message-channel.js";
import type { ResolvedTimeFormat } from "./date-time.js";
import type { RoleDefinition } from "../roles/types.js";
import type { EmbeddedContextFile } from "./pi-embedded-helpers.js";

/**
 * Controla quais seções hardcoded são incluídas no prompt do sistema.
 *
 * - "full": Inclui todas as seções (Skills, Memória, Identidade do Usuário, Hora, Tags de Resposta, Aprendizado, Mensagens, Voz, Docs, Workspace, Sandbox, Runtime). Padrão para o agente principal.
 * - "minimal": Seções reduzidas (Tooling, Workspace, Runtime). Usado para subagentes para manter o contexto leve.
 * - "none": Modo minimalista. Apenas a linha de identidade básica ("Você é um assistente pessoal...").
 */
export type PromptMode = "full" | "minimal" | "none";

function buildSkillsSection(params: {
  skillsPrompt?: string;
  isMinimal: boolean;
  readToolName: string;
}) {
  if (params.isMinimal) return [];
  const trimmed = params.skillsPrompt?.trim();
  if (!trimmed) return [];
  return [
    "## Skills (obrigatório)",
    "Antes de responder: verifique as entradas <available_skills> <description>.",
    `- Se exatamente uma skill se aplica claramente: leia seu SKILL.md em <location> com \`${params.readToolName}\`, então siga-o.`,
    "- Se múltiplas skills puderem se aplicar: escolha a mais específica, então leia/siga-a.",
    "- Se nenhuma se aplicar claramente: não leia nenhum SKILL.md.",
    "Restrições: nunca leia mais de uma skill antecipadamente; apenas leia após selecionar.",
    trimmed,
    "",
  ];
}

function buildMemorySection(params: { isMinimal: boolean; availableTools: Set<string> }) {
  if (params.isMinimal) return [];
  if (!params.availableTools.has("memory_search") && !params.availableTools.has("memory_get")) {
    return [];
  }
  return [
    "## Memória (Recall)",
    "Antes de responder qualquer coisa sobre trabalho anterior, decisões, datas, pessoas, preferências ou tarefas: execute memory_search em MEMORY.md + memory/*.md; então use memory_get para puxar apenas as linhas necessárias. Se houver baixa confiança após a busca, diga que você verificou.",
    "",
  ];
}

function buildUserIdentitySection(ownerLine: string | undefined, isMinimal: boolean) {
  if (!ownerLine || isMinimal) return [];
  return ["## Identidade do Usuário", ownerLine, ""];
}

function buildTimeSection(params: { userTimezone?: string }) {
  if (!params.userTimezone) return [];
  return ["## Data e Hora Atual", `Fuso horário: ${params.userTimezone}`, ""];
}

function buildReplyTagsSection(isMinimal: boolean) {
  if (isMinimal) return [];
  return [
    "## Tags de Resposta",
    "Para solicitar uma resposta nativa/citação nas superfícies suportadas, inclua uma tag na sua resposta:",
    "- [[reply_to_current]] responde à mensagem que disparou a interação.",
    "- [[reply_to:<id>]] responde a um id de mensagem específico quando você o tiver.",
    "Espaço em branco dentro da tag é permitido (ex: [[ reply_to_current ]] / [[ reply_to: 123 ]]).",
    "As tags são removidas antes do envio; o suporte depende da configuração atual do canal.",
    "",
  ];
}

function buildLearningSection(params: { isMinimal: boolean; availableTools: Set<string> }) {
  if (params.isMinimal) return [];
  if (!params.availableTools.has("memory_search") && !params.availableTools.has("memory_get")) {
    return [];
  }
  return [
    "## Aprendizado Contínuo (Long-term Memory)",
    "- Seja PROATIVO: Ao identificar preferências do usuário, decisões técnicas ou fatos recorrentes, sugira salvá-los na memória.",
    "- Exemplo: 'Notei que você prefere X. Posso salvar isso na sua memória local para economizar tokens futuramente?'",
    "- Transparência: Lembre o usuário que os aprendizados são salvos localmente em arquivos `.md` e ele tem controle total sobre eles.",
    "- Use `memory_store` apenas após a confirmação do usuário ou para fatos técnicos óbvios (ex: 'O projeto usa porta 3000').",
    "",
  ];
}

function buildMessagingSection(params: {
  isMinimal: boolean;
  availableTools: Set<string>;
  messageChannelOptions: string;
  inlineButtonsEnabled: boolean;
  runtimeChannel?: string;
  messageToolHints?: string[];
}) {
  if (params.isMinimal) return [];
  return [
    "## Mensagens",
    "- Responder na sessão atual → roteia automaticamente para o canal de origem (Signal, Telegram, etc.)",
    "- Mensagens entre sessões → use sessions_send(sessionKey, message)",
    "- Nunca use exec/curl para mensagens do provedor; o ZERO lida com todo o roteamento internamente.",
    params.availableTools.has("message")
      ? [
          "",
          "### ferramenta message",
          "- Use `message` para envios proativos + ações de canal (enquetes, reações, etc.).",
          "- Para `action=send`, inclua `to` e `message`.",
          `- Se múltiplos canais estiverem configurados, passe \`channel\` (${params.messageChannelOptions}).`,
          `- Se você usar \`message\` (\`action=send\`) para entregar sua resposta visível ao usuário, responda APENAS com: ${SILENT_REPLY_TOKEN} (evite respostas duplicadas).`,
          params.inlineButtonsEnabled
            ? "- Botões inline suportados. Use `action=send` com `buttons=[[{text,callback_data}]]` (callback_data roteia de volta como uma mensagem de usuário)."
            : params.runtimeChannel
              ? `- Botões inline não habilitados para ${params.runtimeChannel}. Se você precisar deles, peça para definir ${params.runtimeChannel}.capabilities.inlineButtons ("dm"|"group"|"all"|"allowlist").`
              : "",
          ...(params.messageToolHints ?? []),
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    "",
  ];
}

function buildVoiceSection(params: { isMinimal: boolean; ttsHint?: string }) {
  if (params.isMinimal) return [];
  const hint = params.ttsHint?.trim();
  if (!hint) return [];
  return ["## Voz (TTS)", hint, ""];
}

function buildDocsSection(params: { docsPath?: string; isMinimal: boolean; readToolName: string }) {
  const docsPath = params.docsPath?.trim();
  if (!docsPath || params.isMinimal) return [];
  return [
    "## Documentação",
    `ZERO docs: ${docsPath}`,
    "Mirror: https://github.com/Lex-1401/ZERO/tree/main/docs",
    "Source: https://github.com/zero/zero",
    "Community: https://discord.com/invite/zero",
    "Find new skills: https://zerohub.com",
    "Ao diagnosticar problemas, execute `zero status` você mesmo quando possível; apenas pergunte ao usuário se você não tiver acesso (ex: sandbox).",
    "",
  ];
}

function buildACISection(params: { isMinimal: boolean; availableTools: Set<string> }) {
  if (params.isMinimal) return [];
  if (!params.availableTools.has("aci_recall")) return [];

  return [
    "## ACI & Procedural Memory",
    "Você possui um sistema avançado de memória procedural para tarefas de navegador.",
    "Siga este fluxo estrito para QUALQUER tarefa complexa de navegador (ex: login, formulários, flows multi-passo):",
    "1. **RECALL**: ANTES de tocar no navegador, chame `aci_recall(taskDescription)`. Se houver uma trajetória salva, SIGA-A.",
    "2. **SEE**: Ao interagir com páginas, prefira `action='aci_scan'` em vez de screenshot puro. Isso lhe dá a visão estruturada dos elementos interativos.",
    "3. **REMEMBER**: Após concluir uma tarefa nova ou difícil com sucesso, chame `aci_remember` para salvar a trajetória para o seu 'eu do futuro'.",
    "",
  ];
}

/**
 * Constrói o prompt do sistema abrangente para o agente Zero.
 *
 * Esta função monta várias seções do prompt com base na configuração de tempo de execução, ferramentas disponíveis,
 * arquivos de contexto e modo operacional. Ela constrói dinamicamente instruções para:
 * - Uso e disponibilidade de ferramentas
 * - Execução de habilidades (skills)
 * - Memória de longo prazo (recall e armazenamento)
 * - Identidade e preferências do usuário
 * - Restrições e capacidades de mensagens
 * - Orientação de voz (TTS)
 * - Detalhes do ambiente sandbox
 * - Referências de documentação
 * - Estado do tempo de execução (OS, modelo, canal)
 *
 * @param params - Parâmetros de configuração para construir o prompt.
 * @param params.workspaceDir - O caminho absoluto para o workspace do agente.
 * @param params.defaultThinkLevel - O nível padrão de pensamento/raciocínio.
 * @param params.reasoningLevel - O nível de raciocínio atual (ex: "on", "off", "stream").
 * @param params.extraSystemPrompt - Texto de prompt personalizado adicional para anexar.
 * @param params.ownerNumbers - Lista de números de telefone autorizados como proprietários (para mensagens).
 * @param params.reasoningTagHint - Se deve incluir instruções para tags <think>.
 * @param params.toolNames - Lista de nomes de ferramentas disponíveis.
 * @param params.toolSummaries - Resumos/descrições personalizados para ferramentas específicas.
 * @param params.modelAliasLines - Instruções para resolução de alias de modelo.
 * @param params.userTimezone - O fuso horário do usuário.
 * @param params.userTime - A hora atual formatada para o usuário.
 * @param params.userTimeFormat - O formato usado para a hora do usuário.
 * @param params.contextFiles - Lista de arquivos de contexto injetados (ex: documentação do projeto, soul.md).
 * @param params.skillsPrompt - Texto do prompt derivado das habilidades disponíveis.
 * @param params.heartbeatPrompt - Texto do prompt usado para polls de heartbeat.
 * @param params.docsPath - Caminho para a documentação local.
 * @param params.workspaceNotes - Notas personalizadas sobre o workspace.
 * @param params.ttsHint - Instruções para comportamento de Text-to-Speech.
 * @param params.promptMode - O modo do prompt ("full", "minimal", "none").
 * @param params.runtimeInfo - Informações sobre o ambiente de execução (host, OS, versão do node, etc.).
 * @param params.messageToolHints - Dicas adicionais para usar ferramentas de mensagem.
 * @param params.sandboxInfo - Informações sobre o ambiente sandbox (acesso restrito, controle do navegador, etc.).
 * @param params.reactionGuidance - Instruções para comportamento de reação com emojis.
 * @returns A string do prompt do sistema totalmente construída.
 */
const PROMPT_IDENTITY_FULL = [
  "Identidade ZERO:",
  "Você não é apenas um chatbot. Você é o Sistema Operacional Agêntico Pessoal do usuário.",
  "- **Soberania**: Você roda localmente. Os dados do usuário são sagrados e não saem daqui.",
  "- **Invisibilidade**: Seja conciso. A magia deve ser invisível. Se puder fazer sem falar, faça.",
  "- **Proatividade**: Não espere ordens para o óbvio. Antecipe necessidades com base no contexto.",
  "- **Segurança (Sentinel)**: Você é protegido pelo Zero Sentinel. Se o Sentinel bloquear algo (PII, Injeção), explique ao usuário o motivo de forma educativa e técnica, reforçando que isso é para a proteção dele.",
  "",
].join("\n");

const PROMPT_IDENTITY_NONE = "You are a personal assistant running inside ZERO.";

const TOOL_STYLE_GUIDE = [
  "",
  "## Estilo de Chamada de Ferramenta",
  "Padrão: não narre chamadas de ferramentas rotineiras e de baixo risco (apenas chame a ferramenta).",
  "Narre apenas quando ajudar: trabalho em várias etapas, problemas complexos/desafiadores, ações sensíveis (ex: deleções) ou quando o usuário pedir explicitamente.",
  "Mantenha a narração breve e densa em valor; evite repetir passos óbvios.",
  "Use linguagem humana simples para narração, a menos que em um contexto técnico.",
  "",
].join("\n");

const CLI_REF_GUIDE = [
  "## Referência Rápida da CLI ZERO",
  "ZERO é controlado via subcomandos. Não invente comandos.",
  "Para gerenciar o serviço daemon do Gateway (start/stop/restart):",
  "- zero gateway status",
  "- zero gateway start",
  "- zero gateway stop",
  "- zero gateway restart",
  "Se não tiver certeza, peça ao usuário para rodar `zero help` (ou `zero gateway --help`) e colar a saída.",
  "",
].join("\n");

const SELF_UPDATE_SECTION = [
  "## ZERO Self-Update",
  "Obter Atualizações (self-update) é PERMITIDO SOMENTE quando o usuário pedir explicitamente.",
  "Não execute config.apply ou update.run a menos que o usuário solicite explicitamente uma atualização ou mudança de configuração; se não for explícito, pergunte primeiro.",
  "Ações: config.get, config.schema, config.apply (validar + escrever configuração completa, depois reiniciar), update.run (atualizar dependências ou git, depois reiniciar).",
  "Após reiniciar, o ZERO chama a última sessão ativa automaticamente.",
].join("\n");

const WORKSPACE_HEADER = "## Workspace";

const SANDBOX_HEADER = "## Sandbox";

const SANDBOX_INTRO =
  "Você está rodando em um runtime em sandbox (ferramentas executam no Docker).";

const WORKSPACE_FILES_HEADER = [
  "## Arquivos do Workspace (injetados)",
  "Estes arquivos editáveis pelo usuário são carregados pelo ZERO e incluídos abaixo no Contexto do Projeto.",
  "",
].join("\n");

const SILENT_REPLY_SECTION = [
  "## Respostas Silenciosas",
  `Quando você não tiver nada a dizer, responda APENAS com: ${SILENT_REPLY_TOKEN}`,
  "",
  "⚠️ Regras:",
  "- Deve ser sua mensagem INTEIRA — nada mais",
  `- Nunca anexe a uma resposta real (nunca inclua "${SILENT_REPLY_TOKEN}" em respostas reais)`,
  "- Nunca envolva em markdown ou blocos de código",
  "",
  `❌ Errado: "Aqui está a ajuda... ${SILENT_REPLY_TOKEN}"`,
  `❌ Errado: "${SILENT_REPLY_TOKEN}"`,
  `✅ Certo: ${SILENT_REPLY_TOKEN}`,
  "",
].join("\n");

const HEARTBEAT_SECTION_BASE = [
  "## Heartbeats",
  "Se você receber um poll de heartbeat (uma mensagem de usuário correspondendo ao prompt de heartbeat acima), e não houver nada que precise de atenção, responda exatamente:",
  "HEARTBEAT_OK",
  'O ZERO trata um "HEARTBEAT_OK" inicial/final como um ack de heartbeat (e pode descartá-lo).',
  'Se algo precisar de atenção, NÃO inclua "HEARTBEAT_OK"; responda com o texto de alerta.',
  "",
].join("\n");

const DEFAULT_TOOL_SUMMARIES: Record<string, string> = {
  read: "Lê o conteúdo de arquivos",
  write: "Cria ou sobrescreve arquivos",
  edit: "Faz edições precisas em arquivos",
  apply_patch: "Aplica patches em múltiplos arquivos",
  grep: "Pesquisa por padrões no conteúdo de arquivos",
  find: "Encontra arquivos por padrão glob",
  ls: "Lista o conteúdo de diretórios",
  exec: "Executa comandos do shell (pty disponível para CLIs que requerem TTY)",
  process: "Gerencia sessões de execução em segundo plano",
  web_search: "Pesquisa na web (Brave API)",
  web_fetch: "Busca e extrai conteúdo legível de uma URL",
  browser: "Controla o navegador web",
  canvas: "Apresenta/avalia/tira snapshot do Canvas",
  nodes: "Lista/descreve/notifica/câmera/tela em nós pareados",
  message: "Envia mensagens e ações de canal",
  gateway: "Reinicia, aplica a configuração ou executa atualizações no processo ZERO em execução",
  agents_list: "Lista ids de agentes permitidos para sessions_spawn",
  sessions_list: "Lista outras sessões (incluindo subagentes) com filtros/últimos",
  sessions_history: "Busca o histórico de outra sessão/subagente",
  sessions_send: "Envia uma mensagem para outra sessão/subagente",
  sessions_spawn: "Inicia uma sessão de subagente",
  session_status: "Mostra um cartão de status equivalente ao /status",
  image: "Analisa uma imagem com o modelo de imagem configurado",
};

export function buildAgentSystemPrompt(params: {
  workspaceDir: string;
  defaultThinkLevel?: ThinkLevel;
  reasoningLevel?: ReasoningLevel;
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
  reasoningTagHint?: boolean;
  toolNames?: string[];
  toolSummaries?: Record<string, string>;
  modelAliasLines?: string[];
  userTimezone?: string;
  userTime?: string;
  userTimeFormat?: ResolvedTimeFormat;
  contextFiles?: EmbeddedContextFile[];
  skillsPrompt?: string;
  heartbeatPrompt?: string;
  docsPath?: string;
  workspaceNotes?: string[];
  ttsHint?: string;
  /** Controls which hardcoded sections to include. Defaults to "full". */
  promptMode?: PromptMode;
  runtimeInfo?: {
    agentId?: string;
    host?: string;
    os?: string;
    arch?: string;
    node?: string;
    model?: string;
    defaultModel?: string;
    channel?: string;
    capabilities?: string[];
    repoRoot?: string;
  };
  messageToolHints?: string[];
  sandboxInfo?: {
    enabled: boolean;
    workspaceDir?: string;
    workspaceAccess?: "none" | "ro" | "rw";
    agentWorkspaceMount?: string;
    browserControlUrl?: string;
    browserNoVncUrl?: string;
    hostBrowserAllowed?: boolean;
    allowedControlUrls?: string[];
    allowedControlHosts?: string[];
    allowedControlPorts?: number[];
    elevated?: {
      allowed: boolean;
      defaultLevel: "on" | "off" | "ask" | "full";
    };
  };
  /** Reaction guidance for the agent (for Telegram minimal/extensive modes). */
  reactionGuidance?: {
    level: "minimal" | "extensive";
    channel: string;
  };
  role?: RoleDefinition;
}) {
  const promptMode = params.promptMode ?? "full";
  if (promptMode === "none") {
    return PROMPT_IDENTITY_NONE;
  }

  const isMinimal = promptMode === "minimal";
  const lines: string[] = [];

  // 1. Identity
  lines.push(PROMPT_IDENTITY_FULL, "");

  // 2. Tools
  lines.push(
    "## Ferramentas (Tooling)",
    "Disponibilidade de ferramentas (filtrada por política):",
    "Nomes de ferramentas são case-sensitive. Chame as ferramentas exatamente como listadas.",
  );

  const toolOrder = [
    "read",
    "write",
    "edit",
    "apply_patch",
    "grep",
    "find",
    "ls",
    "exec",
    "process",
    "web_search",
    "web_fetch",
    "browser",
    "canvas",
    "nodes",
    "cron",
    "message",
    "gateway",
    "agents_list",
    "sessions_list",
    "sessions_history",
    "sessions_send",
    "session_status",
    "image",
  ];

  const rawToolNames = (params.toolNames ?? []).map((tool) => tool.trim());
  const canonicalToolNames = rawToolNames.filter(Boolean);
  const normalizedTools = canonicalToolNames.map((tool) => tool.toLowerCase());
  const availableTools = new Set(normalizedTools);

  const cronExample = `Gerencia tarefas cron e eventos de despertar (use para lembretes; ao agendar um lembrete, escreva o texto do systemEvent como algo que será lido como um lembrete quando disparar, e mencione que é um lembrete dependendo do intervalo de tempo entre definir e disparar; inclua contexto recente no texto do lembrete se apropriado)${
    params.role?.cronJobs?.length
      ? "; NOTA: Este cargo tem tarefas cron pré-configuradas rodando em segundo plano. Verifique-as se necessário."
      : ""
  }`;

  // Combine core summaries with dynamic cron message
  const effectiveToolSummaries: Record<string, string> = {
    ...DEFAULT_TOOL_SUMMARIES,
    cron: cronExample,
  };

  const externalToolSummaries = params.toolSummaries;

  const toolLines: string[] = [];

  // Format tool lines
  const originalToolMap = new Map(canonicalToolNames.map((t) => [t.toLowerCase(), t]));
  for (const tool of toolOrder) {
    if (availableTools.has(tool)) {
      const originalName = originalToolMap.get(tool) ?? tool;
      const summary = effectiveToolSummaries[tool] ?? externalToolSummaries?.[tool];
      toolLines.push(summary ? `- ${originalName}: ${summary}` : `- ${originalName}`);
    }
  }

  // Add extra tools
  const extraTools = normalizedTools.filter((t) => !toolOrder.includes(t)).sort();
  for (const tool of extraTools) {
    const originalName = originalToolMap.get(tool) ?? tool;
    const summary = effectiveToolSummaries[tool] ?? externalToolSummaries?.[tool];
    toolLines.push(summary ? `- ${originalName}: ${summary}` : `- ${originalName}`);
  }

  if (toolLines.length > 0) {
    lines.push(toolLines.join("\n"));
  } else {
    lines.push("Nenhuma ferramenta disponível neste contexto.");
  }

  lines.push(
    "TOOLS.md não controla a disponibilidade de ferramentas; é um guia para o usuário sobre como usar ferramentas externas.",
    "Se uma tarefa for mais complexa ou demorar mais, inicie um subagente. Ele fará o trabalho para você e o alertará quando terminar. Você sempre pode verificá-lo.",
    "",
  );

  lines.push(TOOL_STYLE_GUIDE);
  lines.push(CLI_REF_GUIDE);

  // 3. Dynamic Sections
  const readToolName = originalToolMap.get("read") ?? "read";
  lines.push(...buildSkillsSection({ skillsPrompt: params.skillsPrompt, isMinimal, readToolName }));
  lines.push(...buildMemorySection({ isMinimal, availableTools }));
  lines.push(...buildLearningSection({ isMinimal, availableTools }));

  const hasGateway = availableTools.has("gateway");
  if (hasGateway && !isMinimal) {
    lines.push(SELF_UPDATE_SECTION, "");
  }

  lines.push(...buildACISection({ isMinimal, availableTools }));

  // Model Aliases
  if (params.modelAliasLines && params.modelAliasLines.length > 0 && !isMinimal) {
    lines.push(
      "## Aliases de Modelo",
      "Prefira aliases ao especificar substituições de modelo; provedor/modelo completo também é aceito.",
      ...params.modelAliasLines,
      "",
    );
  }

  // Workspace
  lines.push(WORKSPACE_HEADER, `Seu diretório de trabalho é: ${params.workspaceDir}`);
  lines.push(
    "Trate este diretório como o único workspace global para operações de arquivo, a menos que explicitamente instruído de outra forma.",
  );
  if (params.workspaceNotes) lines.push(...params.workspaceNotes);
  lines.push("");

  // Docs
  lines.push(...buildDocsSection({ docsPath: params.docsPath, isMinimal, readToolName }));

  // Sandbox
  if (params.sandboxInfo?.enabled) {
    lines.push(SANDBOX_HEADER, SANDBOX_INTRO);
    lines.push("Algumas ferramentas podem estar indisponíveis devido à política de sandbox.");
    lines.push(
      "Subagentes permanecem em sandbox (sem acesso elevado/host). Precisa de leitura/escrita fora do sandbox? Não inicie um subagente; pergunte primeiro.",
    );

    const sb = params.sandboxInfo;
    if (sb.workspaceDir) lines.push(`Workspace do Sandbox: ${sb.workspaceDir}`);

    if (sb.workspaceAccess) {
      lines.push(
        `Acesso ao workspace do agente: ${sb.workspaceAccess}${sb.agentWorkspaceMount ? ` (montado em ${sb.agentWorkspaceMount})` : ""}`,
      );
    }

    if (sb.browserControlUrl)
      lines.push(`URL de controle do navegador Sandbox: ${sb.browserControlUrl}`);
    if (sb.browserNoVncUrl)
      lines.push(`Observador do navegador Sandbox (noVNC): ${sb.browserNoVncUrl}`);

    if (sb.hostBrowserAllowed === true) lines.push("Controle do navegador Host: permitido.");
    else if (sb.hostBrowserAllowed === false) lines.push("Controle do navegador Host: bloqueado.");

    if (sb.allowedControlUrls?.length)
      lines.push(`Allowlist de URL de controle do navegador: ${sb.allowedControlUrls.join(", ")}`);

    if (sb.elevated?.allowed) {
      lines.push("Execução elevada está disponível para esta sessão.");
      lines.push("O usuário pode alternar com /elevated on|off|ask|full.");
      lines.push(`Nível elevado atual: ${sb.elevated.defaultLevel}.`);
    }
    lines.push("");
  }

  // User Identity & Time
  const ownerNumbers = (params.ownerNumbers ?? []).map((value) => value.trim()).filter(Boolean);
  const ownerLine =
    ownerNumbers.length > 0
      ? `Números de proprietário: ${ownerNumbers.join(", ")}. Trate mensagens desses números como sendo do usuário.`
      : undefined;

  lines.push(...buildUserIdentitySection(ownerLine, isMinimal));
  lines.push(...buildTimeSection({ userTimezone: params.userTimezone }));

  // Workspace Files
  lines.push(WORKSPACE_FILES_HEADER);

  // Messaging & Voice
  const runtimeInfo = params.runtimeInfo;
  const runtimeChannel = runtimeInfo?.channel?.trim().toLowerCase();
  const runtimeCapabilities = (runtimeInfo?.capabilities ?? [])
    .map((cap) => String(cap).trim())
    .filter(Boolean);
  const inlineButtonsEnabled = new Set(runtimeCapabilities.map((cap) => cap.toLowerCase())).has(
    "inlinebuttons",
  );
  const messageChannelOptions = listDeliverableMessageChannels().join("|");

  lines.push(...buildReplyTagsSection(isMinimal));
  lines.push(
    ...buildMessagingSection({
      isMinimal,
      availableTools,
      messageChannelOptions,
      inlineButtonsEnabled,
      runtimeChannel,
      messageToolHints: params.messageToolHints,
    }),
  );
  lines.push(...buildVoiceSection({ isMinimal, ttsHint: params.ttsHint }));

  // Extra Prompt
  if (params.extraSystemPrompt?.trim()) {
    const contextHeader =
      promptMode === "minimal" ? "## Contexto do Subagente" : "## Contexto do Chat em Grupo";
    lines.push(contextHeader, params.extraSystemPrompt.trim(), "");
  }

  // Reactions
  if (params.reactionGuidance) {
    lines.push("## Reações");
    if (params.reactionGuidance.level === "minimal") {
      lines.push(`Reações estão ativadas para ${params.reactionGuidance.channel} no modo MÍNIMO.`);
      lines.push(
        "Reaja APENAS quando for realmente relevante. Diretriz: no máximo 1 reação a cada 5-10 trocas.",
      );
    } else {
      lines.push(
        `Reações estão ativadas para ${params.reactionGuidance.channel} no modo EXTENSIVO.`,
      );
      lines.push("Reaja livremente para expressar personalidade e confirmação.");
    }
    lines.push("");
  }

  // Reasoning Hint
  if (params.reasoningTagHint) {
    lines.push(
      "## Formato de Raciocínio",
      "O raciocínio interno DEVE estar dentro de <think>...</think>.",
      "Não produza nenhuma análise fora de <think>.",
      "Formate cada resposta como <think>...</think> seguido por <final>...</final>, sem nenhum outro texto.",
      "",
    );
  }

  // Role
  if (params.role) {
    lines.push(`## Cargo: ${params.role.name}`);
    if (params.role.description) lines.push(params.role.description);
    if (params.role.systemPrompt)
      lines.push("", "### Instruções do Cargo", params.role.systemPrompt);
    if (params.role.skills?.length) {
      lines.push("", "### Habilidades do Cargo", ...params.role.skills.map((s) => `- ${s}`));
    }
    if (params.role.cronJobs?.length) {
      lines.push(
        "",
        "### Tarefas Agendadas (Background)",
        ...params.role.cronJobs.map((j) => `- ${j.schedule}: ${j.description || "Tarefa"}`),
      );
    }
    lines.push("");
  }

  // Context Files (Project Context)
  if (params.contextFiles?.length) {
    lines.push(
      "# Contexto do Projeto",
      "",
      "Os seguintes arquivos de contexto do projeto foram carregados:",
    );
    const hasSoul = params.contextFiles.some((f) => f.path.toLowerCase().endsWith("soul.md"));
    if (hasSoul)
      lines.push(
        "Se SOUL.md estiver presente, incorpore sua persona e tom. Evite respostas rígidas e genéricas; siga suas orientações a menos que instruções de maior prioridade as substituam.",
      );
    lines.push("");
    for (const file of params.contextFiles) {
      lines.push(`## ${file.path}`, "", file.content, "");
    }
  }

  // Final Protocol (Silent & Heartbeat & Runtime)
  if (!isMinimal) {
    lines.push(SILENT_REPLY_SECTION);
    const hbPrompt = params.heartbeatPrompt
      ? `Prompt de Heartbeat: ${params.heartbeatPrompt}`
      : "Prompt de Heartbeat: (configurado)";
    lines.push(hbPrompt, HEARTBEAT_SECTION_BASE);
  }

  lines.push("## Runtime");
  lines.push(
    buildRuntimeLine(runtimeInfo, runtimeChannel, runtimeCapabilities, params.defaultThinkLevel),
  );
  const rLevel = params.reasoningLevel ?? "off";
  lines.push(
    `Raciocínio: ${rLevel} (oculto a menos que on/stream). Alterne /reasoning; /status mostra Raciocínio quando ativado.`,
  );

  return lines.join("\n");
}

/**
 * Formata um resumo de uma única linha do ambiente de execução.
 *
 * Informações incluídas:
 * - ID do Agente
 * - Hostname
 * - Raiz do Repositório
 * - SO / Arquitetura
 * - Versão do Node.js
 * - Informações do Modelo Ativo
 * - Canal (ex: telegram, cli)
 * - Capacidades do Canal
 * - Estado de Pensamento/Raciocínio
 *
 * @param runtimeInfo - Informações básicas do sistema.
 * @param runtimeChannel - O canal de comunicação atual.
 * @param runtimeCapabilities - Capacidades suportadas pelo canal.
 * @param defaultThinkLevel - O nível padrão de pensamento.
 * @returns Uma string delimitada por pipes resumindo o estado do runtime.
 */
export function buildRuntimeLine(
  runtimeInfo?: {
    agentId?: string;
    host?: string;
    os?: string;
    arch?: string;
    node?: string;
    model?: string;
    defaultModel?: string;
    repoRoot?: string;
  },
  runtimeChannel?: string,
  runtimeCapabilities: string[] = [],
  defaultThinkLevel?: ThinkLevel,
): string {
  return `Runtime: ${[
    runtimeInfo?.agentId ? `agent=${runtimeInfo.agentId}` : "",
    runtimeInfo?.host ? `host=${runtimeInfo.host}` : "",
    runtimeInfo?.repoRoot ? `repo=${runtimeInfo.repoRoot}` : "",
    runtimeInfo?.os
      ? `os=${runtimeInfo.os}${runtimeInfo?.arch ? ` (${runtimeInfo.arch})` : ""}`
      : runtimeInfo?.arch
        ? `arch=${runtimeInfo.arch}`
        : "",
    runtimeInfo?.node ? `node=${runtimeInfo.node}` : "",
    runtimeInfo?.model ? `model=${runtimeInfo.model}` : "",
    runtimeInfo?.defaultModel ? `default_model=${runtimeInfo.defaultModel}` : "",
    runtimeChannel ? `channel=${runtimeChannel}` : "",
    runtimeChannel
      ? `capabilities=${runtimeCapabilities.length > 0 ? runtimeCapabilities.join(",") : "none"}`
      : "",
    `thinking=${defaultThinkLevel ?? "off"}`,
  ]
    .filter(Boolean)
    .join(" | ")}`;
}

import type { ReasoningLevel, ThinkLevel } from "../auto-reply/thinking.js";
import { SILENT_REPLY_TOKEN } from "../auto-reply/tokens.js";
import { listDeliverableMessageChannels } from "../utils/message-channel.js";
import type { ResolvedTimeFormat } from "./date-time.js";
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
    "Mirror: https://docs.zero.local",
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
}) {
  const coreToolSummaries: Record<string, string> = {
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
    // Channel docking: add login tools here when a channel needs interactive linking.
    browser: "Controla o navegador web",
    canvas: "Apresenta/avalia/tira snapshot do Canvas",
    nodes: "Lista/descreve/notifica/câmera/tela em nós pareados",
    cron: "Gerencia tarefas cron e eventos de despertar (use para lembretes; ao agendar um lembrete, escreva o texto do systemEvent como algo que será lido como um lembrete quando disparar, e mencione que é um lembrete dependendo do intervalo de tempo entre definir e disparar; inclua contexto recente no texto do lembrete se apropriado)",
    message: "Envia mensagens e ações de canal",
    gateway: "Reinicia, aplica a configuração ou executa atualizações no processo ZERO em execução",
    agents_list: "Lista ids de agentes permitidos para sessions_spawn",
    sessions_list: "Lista outras sessões (incluindo subagentes) com filtros/últimos",
    sessions_history: "Busca o histórico de outra sessão/subagente",
    sessions_send: "Envia uma mensagem para outra sessão/subagente",
    sessions_spawn: "Inicia uma sessão de subagente",
    session_status:
      "Mostra um cartão de status equivalente ao /status (uso + tempo + Raciocínio/Verbo/Elevado); use para perguntas sobre uso do modelo (📊 session_status); substituição opcional de modelo por sessão",
    image: "Analisa uma imagem com o modelo de imagem configurado",
  };

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
  // Preserve caller casing while deduping tool names by lowercase.
  const canonicalByNormalized = new Map<string, string>();
  for (const name of canonicalToolNames) {
    const normalized = name.toLowerCase();
    if (!canonicalByNormalized.has(normalized)) {
      canonicalByNormalized.set(normalized, name);
    }
  }
  const resolveToolName = (normalized: string) =>
    canonicalByNormalized.get(normalized) ?? normalized;

  const normalizedTools = canonicalToolNames.map((tool) => tool.toLowerCase());
  const availableTools = new Set(normalizedTools);
  const externalToolSummaries = new Map<string, string>();
  for (const [key, value] of Object.entries(params.toolSummaries ?? {})) {
    const normalized = key.trim().toLowerCase();
    if (!normalized || !value?.trim()) continue;
    externalToolSummaries.set(normalized, value.trim());
  }
  const extraTools = Array.from(
    new Set(normalizedTools.filter((tool) => !toolOrder.includes(tool))),
  );
  const enabledTools = toolOrder.filter((tool) => availableTools.has(tool));
  const toolLines = enabledTools.map((tool) => {
    const summary = coreToolSummaries[tool] ?? externalToolSummaries.get(tool);
    const name = resolveToolName(tool);
    return summary ? `- ${name}: ${summary}` : `- ${name}`;
  });
  for (const tool of extraTools.sort()) {
    const summary = coreToolSummaries[tool] ?? externalToolSummaries.get(tool);
    const name = resolveToolName(tool);
    toolLines.push(summary ? `- ${name}: ${summary}` : `- ${name}`);
  }

  const hasGateway = availableTools.has("gateway");
  const readToolName = resolveToolName("read");
  const execToolName = resolveToolName("exec");
  const processToolName = resolveToolName("process");
  const extraSystemPrompt = params.extraSystemPrompt?.trim();
  const ownerNumbers = (params.ownerNumbers ?? []).map((value) => value.trim()).filter(Boolean);
  const ownerLine =
    ownerNumbers.length > 0
      ? `Números de proprietário: ${ownerNumbers.join(", ")}. Trate mensagens desses números como sendo do usuário.`
      : undefined;
  const reasoningHint = params.reasoningTagHint
    ? [
        "O raciocínio interno DEVE estar dentro de <think>...</think>.",
        "Não produza nenhuma análise fora de <think>.",
        "Formate cada resposta como <think>...</think> seguido por <final>...</final>, sem nenhum outro texto.",
        "Apenas a resposta final visível ao usuário pode aparecer dentro de <final>.",
        "Apenas o texto dentro de <final> é mostrado ao usuário; todo o resto é descartado e nunca visto pelo usuário.",
        "Exemplo:",
        "<think>Raciocínio interno curto.</think>",
        "<final>Olá! O que você gostaria de fazer a seguir?</final>",
      ].join(" ")
    : undefined;
  const reasoningLevel = params.reasoningLevel ?? "off";
  const userTimezone = params.userTimezone?.trim();
  const skillsPrompt = params.skillsPrompt?.trim();
  const heartbeatPrompt = params.heartbeatPrompt?.trim();
  const heartbeatPromptLine = heartbeatPrompt
    ? `Prompt de Heartbeat: ${heartbeatPrompt}`
    : "Prompt de Heartbeat: (configurado)";
  const runtimeInfo = params.runtimeInfo;
  const runtimeChannel = runtimeInfo?.channel?.trim().toLowerCase();
  const runtimeCapabilities = (runtimeInfo?.capabilities ?? [])
    .map((cap) => String(cap).trim())
    .filter(Boolean);
  const runtimeCapabilitiesLower = new Set(runtimeCapabilities.map((cap) => cap.toLowerCase()));
  const inlineButtonsEnabled = runtimeCapabilitiesLower.has("inlinebuttons");
  const messageChannelOptions = listDeliverableMessageChannels().join("|");
  const promptMode = params.promptMode ?? "full";
  const isMinimal = promptMode === "minimal" || promptMode === "none";
  const skillsSection = buildSkillsSection({
    skillsPrompt,
    isMinimal,
    readToolName,
  });
  const memorySection = buildMemorySection({ isMinimal, availableTools });
  const docsSection = buildDocsSection({
    docsPath: params.docsPath,
    isMinimal,
    readToolName,
  });
  const workspaceNotes = (params.workspaceNotes ?? []).map((note) => note.trim()).filter(Boolean);

  // For "none" mode, return just the basic identity line
  if (promptMode === "none") {
    return "You are a personal assistant running inside ZERO.";
  }

  const lines = [
    "Você é um assistente pessoal rodando dentro do ZERO.",
    "",
    "## Ferramentas (Tooling)",
    "Disponibilidade de ferramentas (filtrada por política):",
    "Nomes de ferramentas são case-sensitive. Chame as ferramentas exatamente como listadas.",
    toolLines.length > 0
      ? toolLines.join("\n")
      : [
          "Pi lista as ferramentas padrão acima. Este runtime habilita:",
          "- grep: pesquisa por padrões no conteúdo de arquivos",
          "- find: encontra arquivos por padrão glob",
          "- ls: lista o conteúdo de diretórios",
          "- apply_patch: aplica patches em múltiplos arquivos",
          `- ${execToolName}: executa comandos do shell (suporta segundo plano via yieldMs/background)`,
          `- ${processToolName}: gerencia sessões de execução em segundo plano`,
          "- browser: controla o navegador dedicado do zero",
          "- canvas: apresenta/avalia/tira snapshot do Canvas",
          "- nodes: lista/descreve/notifica/câmera/tela em nós pareados",
          "- cron: gerencia tarefas cron e eventos de despertar (use para lembretes; ao agendar um lembrete, escreva o texto do systemEvent como algo que será lido como um lembrete quando disparar, e mencione que é um lembrete dependendo do intervalo de tempo entre definir e disparar; inclua contexto recente no texto do lembrete se apropriado)",
          "- sessions_list: lista sessões",
          "- sessions_history: busca histórico da sessão",
          "- sessions_send: envia para outra sessão",
        ].join("\n"),
    "TOOLS.md não controla a disponibilidade de ferramentas; é um guia para o usuário sobre como usar ferramentas externas.",
    "Se uma tarefa for mais complexa ou demorar mais, inicie um subagente. Ele fará o trabalho para você e o alertará quando terminar. Você sempre pode verificá-lo.",
    "",
    "## Estilo de Chamada de Ferramenta",
    "Padrão: não narre chamadas de ferramentas rotineiras e de baixo risco (apenas chame a ferramenta).",
    "Narre apenas quando ajudar: trabalho em várias etapas, problemas complexos/desafiadores, ações sensíveis (ex: deleções) ou quando o usuário pedir explicitamente.",
    "Mantenha a narração breve e densa em valor; evite repetir passos óbvios.",
    "Use linguagem humana simples para narração, a menos que em um contexto técnico.",
    "",
    "## Referência Rápida da CLI ZERO",
    "ZERO é controlado via subcomandos. Não invente comandos.",
    "Para gerenciar o serviço daemon do Gateway (start/stop/restart):",
    "- zero gateway status",
    "- zero gateway start",
    "- zero gateway stop",
    "- zero gateway restart",
    "Se não tiver certeza, peça ao usuário para rodar `zero help` (ou `zero gateway --help`) e colar a saída.",
    "",
    ...skillsSection,
    ...memorySection,
    ...buildLearningSection({ isMinimal, availableTools }),
    // Skip self-update for subagent/none modes
    hasGateway && !isMinimal ? "## ZERO Self-Update" : "",
    hasGateway && !isMinimal
      ? [
          "Obter Atualizações (self-update) é PERMITIDO SOMENTE quando o usuário pedir explicitamente.",
          "Não execute config.apply ou update.run a menos que o usuário solicite explicitamente uma atualização ou mudança de configuração; se não for explícito, pergunte primeiro.",
          "Ações: config.get, config.schema, config.apply (validar + escrever configuração completa, depois reiniciar), update.run (atualizar dependências ou git, depois reiniciar).",
          "Após reiniciar, o ZERO chama a última sessão ativa automaticamente.",
        ].join("\n")
      : "",
    hasGateway && !isMinimal ? "" : "",
    ...buildACISection({ isMinimal, availableTools }),
    "",
    // Skip model aliases for subagent/none modes
    params.modelAliasLines && params.modelAliasLines.length > 0 && !isMinimal
      ? "## Aliases de Modelo"
      : "",
    params.modelAliasLines && params.modelAliasLines.length > 0 && !isMinimal
      ? "Prefira aliases ao especificar substituições de modelo; provedor/modelo completo também é aceito."
      : "",
    params.modelAliasLines && params.modelAliasLines.length > 0 && !isMinimal
      ? params.modelAliasLines.join("\n")
      : "",
    params.modelAliasLines && params.modelAliasLines.length > 0 && !isMinimal ? "" : "",
    "## Workspace",
    `Seu diretório de trabalho é: ${params.workspaceDir}`,
    "Trate este diretório como o único workspace global para operações de arquivo, a menos que explicitamente instruído de outra forma.",
    ...workspaceNotes,
    "",
    ...docsSection,
    params.sandboxInfo?.enabled ? "## Sandbox" : "",
    params.sandboxInfo?.enabled
      ? [
          "Você está rodando em um runtime em sandbox (ferramentas executam no Docker).",
          "Algumas ferramentas podem estar indisponíveis devido à política de sandbox.",
          "Subagentes permanecem em sandbox (sem acesso elevado/host). Precisa de leitura/escrita fora do sandbox? Não inicie um subagente; pergunte primeiro.",
          params.sandboxInfo.workspaceDir
            ? `Workspace do Sandbox: ${params.sandboxInfo.workspaceDir}`
            : "",
          params.sandboxInfo.workspaceAccess
            ? `Acesso ao workspace do agente: ${params.sandboxInfo.workspaceAccess}${
                params.sandboxInfo.agentWorkspaceMount
                  ? ` (montado em ${params.sandboxInfo.agentWorkspaceMount})`
                  : ""
              }`
            : "",
          params.sandboxInfo.browserControlUrl
            ? `URL de controle do navegador Sandbox: ${params.sandboxInfo.browserControlUrl}`
            : "",
          params.sandboxInfo.browserNoVncUrl
            ? `Observador do navegador Sandbox (noVNC): ${params.sandboxInfo.browserNoVncUrl}`
            : "",
          params.sandboxInfo.hostBrowserAllowed === true
            ? "Controle do navegador Host: permitido."
            : params.sandboxInfo.hostBrowserAllowed === false
              ? "Controle do navegador Host: bloqueado."
              : "",
          params.sandboxInfo.allowedControlUrls?.length
            ? `Allowlist de URL de controle do navegador: ${params.sandboxInfo.allowedControlUrls.join(", ")}`
            : "",
          params.sandboxInfo.allowedControlHosts?.length
            ? `Allowlist de host de controle do navegador: ${params.sandboxInfo.allowedControlHosts.join(", ")}`
            : "",
          params.sandboxInfo.allowedControlPorts?.length
            ? `Allowlist de porta de controle do navegador: ${params.sandboxInfo.allowedControlPorts.join(", ")}`
            : "",
          params.sandboxInfo.elevated?.allowed
            ? "Execução elevada está disponível para esta sessão."
            : "",
          params.sandboxInfo.elevated?.allowed
            ? "O usuário pode alternar com /elevated on|off|ask|full."
            : "",
          params.sandboxInfo.elevated?.allowed
            ? "Você também pode enviar /elevated on|off|ask|full quando necessário."
            : "",
          params.sandboxInfo.elevated?.allowed
            ? `Nível elevado atual: ${params.sandboxInfo.elevated.defaultLevel} (ask executa no host com aprovação; full aprova automaticamente).`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    params.sandboxInfo?.enabled ? "" : "",
    ...buildUserIdentitySection(ownerLine, isMinimal),
    ...buildTimeSection({
      userTimezone,
    }),
    "## Arquivos do Workspace (injetados)",
    "Estes arquivos editáveis pelo usuário são carregados pelo ZERO e incluídos abaixo no Contexto do Projeto.",
    "",
    ...buildReplyTagsSection(isMinimal),
    ...buildMessagingSection({
      isMinimal,
      availableTools,
      messageChannelOptions,
      inlineButtonsEnabled,
      runtimeChannel,
      messageToolHints: params.messageToolHints,
    }),
    ...buildVoiceSection({ isMinimal, ttsHint: params.ttsHint }),
  ];

  if (extraSystemPrompt) {
    // Use "Subagent Context" header for minimal mode (subagents), otherwise "Group Chat Context"
    const contextHeader =
      promptMode === "minimal" ? "## Contexto do Subagente" : "## Contexto do Chat em Grupo";
    lines.push(contextHeader, extraSystemPrompt, "");
  }
  if (params.reactionGuidance) {
    const { level, channel } = params.reactionGuidance;
    const guidanceText =
      level === "minimal"
        ? [
            `Reações estão ativadas para ${channel} no modo MÍNIMO.`,
            "Reaja APENAS quando for realmente relevante:",
            "- Confirme solicitações ou confirmações importantes do usuário",
            "- Expresse sentimento genuíno (humor, apreciação) com moderação",
            "- Evite reagir a mensagens de rotina ou às suas próprias respostas",
            "Diretriz: no máximo 1 reação a cada 5-10 trocas.",
          ].join("\n")
        : [
            `Reações estão ativadas para ${channel} no modo EXTENSIVO.`,
            "Sinta-se à vontade para reagir liberalmente:",
            "- Confirme mensagens com emojis apropriados",
            "- Expresse sentimento e personalidade através de reações",
            "- Reaja a conteúdo interessante, humor ou eventos notáveis",
            "- Use reações para confirmar entendimento ou acordo",
            "Diretriz: reaja sempre que parecer natural.",
          ].join("\n");
    lines.push("## Reações", guidanceText, "");
  }
  if (reasoningHint) {
    lines.push("## Formato de Raciocínio", reasoningHint, "");
  }

  const contextFiles = params.contextFiles ?? [];
  if (contextFiles.length > 0) {
    const hasSoulFile = contextFiles.some((file) => {
      const normalizedPath = file.path.trim().replace(/\\/g, "/");
      const baseName = normalizedPath.split("/").pop() ?? normalizedPath;
      return baseName.toLowerCase() === "soul.md";
    });
    lines.push(
      "# Contexto do Projeto",
      "",
      "Os seguintes arquivos de contexto do projeto foram carregados:",
    );
    if (hasSoulFile) {
      lines.push(
        "Se SOUL.md estiver presente, incorpore sua persona e tom. Evite respostas rígidas e genéricas; siga suas orientações a menos que instruções de maior prioridade as substituam.",
      );
    }
    lines.push("");
    for (const file of contextFiles) {
      lines.push(`## ${file.path}`, "", file.content, "");
    }
  }

  // Skip silent replies for subagent/none modes
  if (!isMinimal) {
    lines.push(
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
    );
  }

  // Skip heartbeats for subagent/none modes
  if (!isMinimal) {
    lines.push(
      "## Heartbeats",
      heartbeatPromptLine,
      "Se você receber um poll de heartbeat (uma mensagem de usuário correspondendo ao prompt de heartbeat acima), e não houver nada que precise de atenção, responda exatamente:",
      "HEARTBEAT_OK",
      'O ZERO trata um "HEARTBEAT_OK" inicial/final como um ack de heartbeat (e pode descartá-lo).',
      'Se algo precisar de atenção, NÃO inclua "HEARTBEAT_OK"; responda com o texto de alerta.',
      "",
    );
  }

  lines.push(
    "## Runtime",
    buildRuntimeLine(runtimeInfo, runtimeChannel, runtimeCapabilities, params.defaultThinkLevel),
    `Raciocínio: ${reasoningLevel} (oculto a menos que on/stream). Alterne /reasoning; /status mostra Raciocínio quando ativado.`,
  );

  return lines.filter(Boolean).join("\n");
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

import { CHANNEL_IDS } from "../channels/registry.js";
import { VERSION } from "../version.js";
import { ZEROSchema } from "./zod-schema.js";

export type ConfigUiHint = {
  label?: string;
  help?: string;
  group?: string;
  order?: number;
  advanced?: boolean;
  sensitive?: boolean;
  placeholder?: string;
  itemTemplate?: unknown;
};

export type ConfigUiHints = Record<string, ConfigUiHint>;

export type ConfigSchema = ReturnType<typeof ZEROSchema.toJSONSchema>;

type JsonSchemaNode = Record<string, unknown>;

export type ConfigSchemaResponse = {
  schema: ConfigSchema;
  uiHints: ConfigUiHints;
  version: string;
  generatedAt: string;
};

export type PluginUiMetadata = {
  id: string;
  name?: string;
  description?: string;
  configUiHints?: Record<
    string,
    Pick<ConfigUiHint, "label" | "help" | "advanced" | "sensitive" | "placeholder">
  >;
  configSchema?: JsonSchemaNode;
};

export type ChannelUiMetadata = {
  id: string;
  label?: string;
  description?: string;
  configSchema?: JsonSchemaNode;
  configUiHints?: Record<string, ConfigUiHint>;
};

const GROUP_LABELS: Record<string, string> = {
  wizard: "Assistente",
  update: "Atualização",
  diagnostics: "Diagnóstico",
  logging: "Registros (Logs)",
  gateway: "Gateway",
  nodeHost: "Hospedeiro de Nós",
  agents: "Agentes",
  tools: "Ferramentas",
  bindings: "Atalhos (Bindings)",
  audio: "Áudio",
  models: "Modelos",
  messages: "Mensagens",
  commands: "Comandos",
  session: "Sessão",
  cron: "Agendador (Cron)",
  hooks: "Ganchos (Hooks)",
  ui: "Interface (UI)",
  browser: "Navegador",
  talk: "Voz (Talk)",
  channels: "Canais de Mensageria",
  skills: "Habilidades (Skills)",
  plugins: "Plugins",
  discovery: "Descoberta",
  presence: "Presença",
  voicewake: "Ativação por Voz",
};

const GROUP_ORDER: Record<string, number> = {
  wizard: 20,
  update: 25,
  diagnostics: 27,
  gateway: 30,
  nodeHost: 35,
  agents: 40,
  tools: 50,
  bindings: 55,
  audio: 60,
  models: 70,
  messages: 80,
  commands: 85,
  session: 90,
  cron: 100,
  hooks: 110,
  ui: 120,
  browser: 130,
  talk: 140,
  channels: 150,
  skills: 200,
  plugins: 205,
  discovery: 210,
  presence: 220,
  voicewake: 230,
  logging: 900,
};

const FIELD_LABELS: Record<string, string> = {
  "meta.lastTouchedVersion": "Última Versão Alterada",
  "meta.lastTouchedAt": "Última Alteração em",
  "update.channel": "Canal de Atualização",
  "update.checkOnStart": "Verificar ao Iniciar",
  "diagnostics.enabled": "Diagnóstico Ativado",
  "diagnostics.flags": "Flags de Diagnóstico",
  "diagnostics.otel.enabled": "OpenTelemetry Ativado",
  "diagnostics.otel.endpoint": "Endpoint OpenTelemetry",
  "diagnostics.otel.protocol": "Protocolo OpenTelemetry",
  "diagnostics.otel.headers": "Cabeçalhos OpenTelemetry",
  "diagnostics.otel.serviceName": "Nome do Serviço OpenTelemetry",
  "diagnostics.otel.traces": "Traces OpenTelemetry Ativados",
  "diagnostics.otel.metrics": "Métricas OpenTelemetry Ativadas",
  "diagnostics.otel.logs": "Logs OpenTelemetry Ativados",
  "diagnostics.otel.sampleRate": "Taxa de Amostragem (Trace)",
  "diagnostics.otel.flushIntervalMs": "Intervalo de Flush (ms)",
  "diagnostics.cacheTrace.enabled": "Rastro de Cache Ativado",
  "diagnostics.cacheTrace.filePath": "Caminho do Arquivo de Rastro",
  "diagnostics.cacheTrace.includeMessages": "Incluir Mensagens no Rastro",
  "diagnostics.cacheTrace.includePrompt": "Incluir Prompt no Rastro",
  "diagnostics.cacheTrace.includeSystem": "Incluir Sistema no Rastro",
  "agents.list.*.identity.avatar": "Avatar da Identidade",
  "gateway.remote.url": "URL do Gateway Remoto",
  "gateway.remote.sshTarget": "Alvo SSH do Gateway Remoto",
  "gateway.remote.sshIdentity": "Identidade SSH do Gateway Remoto",
  "gateway.remote.token": "Token do Gateway Remoto",
  "gateway.remote.password": "Senha do Gateway Remoto",
  "gateway.remote.tlsFingerprint": "Impressão Digital TLS Remota",
  "gateway.auth.token": "Token do Gateway",
  "gateway.auth.password": "Senha do Gateway",
  "gateway.auth.allowTailscale": "Permitir Tailscale",
  "gateway.bind": "Vínculo (Bind)",
  "wizard.lastRunAt": "Última Execução em",
  "wizard.lastRunCommand": "Último Comando Executado",
  "wizard.lastRunCommit": "Último Commit",
  "wizard.lastRunMode": "Último Modo",
  "wizard.lastRunVersion": "Última Versão Executada",
  "agents.defaults.compaction": "Compactação",
  "agents.defaults.compaction.mode": "Modo de Compactação",
  "agents.defaults.compaction.reserveTokensFloor": "Reserva de Tokens (Mínimo)",
  "agents.defaults.compaction.memoryFlush": "Limpeza de Memória (Memory Flush)",
  "agents.defaults.compaction.memoryFlush.enabled": "Ativado",
  "agents.defaults.compaction.memoryFlush.softThresholdTokens": "Limiar de Tokens (Soft)",
  "agents.defaults.compaction.memoryFlush.prompt": "Prompt de Compactação",
  "agents.defaults.compaction.memoryFlush.systemPrompt": "Prompt de Sistema para Compactação",
  "agents.defaults.blockStreamingDefault": "Streaming em Blocos (Padrão)",
  "agents.defaults.blockStreamingBreak": "Quebra de Streaming em Blocos",
  "agents.defaults.blockStreamingChunk": "Configuração de Fragmentos (Chunk)",
  "agents.defaults.blockStreamingChunk.minChars": "Caracteres Mínimos",
  "agents.defaults.blockStreamingChunk.maxChars": "Caracteres Máximos",
  "agents.defaults.blockStreamingChunk.breakPreference": "Preferência de Quebra",
  "agents.defaults.blockStreamingCoalesce": "Coalescência de Streaming",
  "agents.defaults.blockStreamingCoalesce.minChars": "Caracteres Mínimos",
  "agents.defaults.blockStreamingCoalesce.maxChars": "Caracteres Máximos",
  "agents.defaults.blockStreamingCoalesce.idleMs": "Tempo de Espera (ms)",
  "agents.defaults.cliBackends": "Backends de CLI",
  "agents.defaults.bootstrapMaxChars": "Máximo de Caracteres no Bootstrap",
  "agents.defaults.repoRoot": "Raiz do Repositório",
  "agents.defaults.workspace": "Espaço de Trabalho",
  "agents.defaults.models": "Modelos",
  "agents.defaults.model.primary": "Modelo Primário",
  "agents.defaults.model.fallbacks": "Fallbacks de Modelo",
  "agents.defaults.imageModel.primary": "Modelo de Imagem",
  "agents.defaults.imageModel.fallbacks": "Fallbacks de Modelo de Imagem",
  "tools.media.image.enabled": "Ativar Compreensão de Imagem",
  "tools.media.image.maxBytes": "Bytes Máximos de Imagem",
  "tools.media.image.maxChars": "Caracteres Máximos de Imagem",
  "tools.media.image.prompt": "Prompt de Compreensão de Imagem",
  "tools.media.image.timeoutSeconds": "Tempo Limite de Imagem (seg)",
  "tools.media.image.attachments": "Política de Anexos de Imagem",
  "tools.media.image.models": "Modelos de Compreensão de Imagem",
  "tools.media.image.scope": "Escopo de Compreensão de Imagem",
  "tools.media.models": "Modelos Compartilhados de Mídia",
  "tools.media.concurrency": "Concorrência de Mídia",
  "tools.media.audio.enabled": "Ativar Compreensão de Áudio",
  "tools.media.audio.maxBytes": "Bytes Máximos de Áudio",
  "tools.media.audio.maxChars": "Caracteres Máximos de Áudio",
  "tools.media.audio.prompt": "Prompt de Compreensão de Áudio",
  "tools.media.audio.timeoutSeconds": "Tempo Limite de Áudio (seg)",
  "tools.media.audio.language": "Idioma de Compreensão de Áudio",
  "tools.media.audio.attachments": "Política de Anexos de Áudio",
  "tools.media.audio.models": "Modelos de Compreensão de Áudio",
  "tools.media.audio.scope": "Escopo de Compreensão de Áudio",
  "tools.media.video.enabled": "Ativar Compreensão de Vídeo",
  "tools.media.video.maxBytes": "Bytes Máximos de Vídeo",
  "tools.media.video.maxChars": "Caracteres Máximos de Vídeo",
  "tools.media.video.prompt": "Prompt de Compreensão de Vídeo",
  "tools.media.video.timeoutSeconds": "Tempo Limite de Vídeo (seg)",
  "tools.media.video.attachments": "Política de Anexos de Vídeo",
  "tools.media.video.models": "Modelos de Compreensão de Vídeo",
  "tools.media.video.scope": "Escopo de Compreensão de Vídeo",
  "tools.links.enabled": "Ativar Compreensão de Links",
  "tools.links.maxLinks": "Máximo de Links",
  "tools.links.timeoutSeconds": "Tempo Limite de Links (seg)",
  "tools.links.models": "Modelos de Compreensão de Links",
  "tools.links.scope": "Escopo de Compreensão de Links",
  "tools.profile": "Perfil de Ferramentas",
  "agents.list[].tools.profile": "Perfil de Ferramentas do Agente",
  "tools.byProvider": "Política de Ferramentas por Provedor",
  "agents.list[].tools.byProvider": "Política de Ferramentas do Agente por Provedor",
  "tools.exec.applyPatch.enabled": "Ativar apply_patch",
  "tools.exec.applyPatch.allowModels": "Modelos Permitidos para apply_patch",
  "tools.exec.notifyOnExit": "Notificar ao Sair da Execução",
  "tools.exec.approvalRunningNoticeMs": "Aviso de Execução (ms)",
  "tools.exec.host": "Hospedeiro de Execução",
  "tools.exec.security": "Segurança de Execução",
  "tools.exec.ask": "Solicitar Confirmação",
  "tools.exec.node": "Vínculo de Nó de Execução",
  "tools.exec.pathPrepend": "Precedência de Caminho (PATH)",
  "tools.exec.safeBins": "Binários Seguros (Exec)",
  "tools.message.allowCrossContextSend": "Permitir Mensagens Multi-Contexto",
  "tools.message.crossContext.allowWithinProvider": "Permitir Multi-Contexto (Mesmo Provedor)",
  "tools.message.crossContext.allowAcrossProviders": "Permitir Multi-Contexto (Entre Provedores)",
  "tools.message.crossContext.marker.enabled": "Marcador de Multi-Contexto",
  "tools.message.crossContext.marker.prefix": "Prefixo do Marcador de Multi-Contexto",
  "tools.message.crossContext.marker.suffix": "Sufixo do Marcador de Multi-Contexto",
  "tools.message.broadcast.enabled": "Ativar Transmissão (Broadcast)",
  "tools.web.search.enabled": "Ativar Ferramenta de Busca Web",
  "tools.web.search.provider": "Provedor de Busca Web",
  "tools.web.search.apiKey": "Chave da API Brave Search",
  "tools.web.search.maxResults": "Máximo de Resultados de Busca",
  "tools.web.search.timeoutSeconds": "Tempo Limite de Busca (seg)",
  "tools.web.search.cacheTtlMinutes": "Tempo de Cache de Busca (min)",
  "tools.web.fetch.enabled": "Ativar Ferramenta de Captura Web",
  "tools.web.fetch.maxChars": "Máximo de Caracteres da Captura Web",
  "tools.web.fetch.timeoutSeconds": "Tempo Limite de Captura (seg)",
  "tools.web.fetch.cacheTtlMinutes": "Tempo de Cache de Captura (min)",
  "tools.web.fetch.maxRedirects": "Máximo de Redirecionamentos",
  "tools.web.fetch.userAgent": "User-Agent da Captura Web",
  "gateway.controlUi.basePath": "Caminho Base da Interface de Controle",
  "gateway.controlUi.allowInsecureAuth": "Permitir Autenticação Insegura na UI",
  "gateway.http.endpoints.chatCompletions.enabled": "Endpoint de Chat Completions (OpenAI)",
  "gateway.reload.mode": "Modo de Recarregamento de Configuração",
  "gateway.reload.debounceMs": "Debounce de Recarregamento (ms)",
  "gateway.nodes.browser.mode": "Modo de Navegador do Nó",
  "gateway.nodes.browser.node": "Vínculo de Nó de Navegador",
  "gateway.nodes.allowCommands": "Comandos Permitidos (Extra)",
  "gateway.nodes.denyCommands": "Comandos Bloqueados",
  "nodeHost.browserProxy.enabled": "Proxy de Navegador do Nó Ativado",
  "nodeHost.browserProxy.allowProfiles": "Perfis de Navegador Permitidos",
  "skills.load.watch": "Monitorar Habilidades (Watch)",
  "skills.load.watchDebounceMs": "Debounce de Monitoramento (ms)",
  "agents.defaults.envelopeTimezone": "Fuso Horário do Envelope",
  "agents.defaults.envelopeTimestamp": "Timestamp do Envelope",
  "agents.defaults.envelopeElapsed": "Tempo Decorrido no Envelope",
  "agents.defaults.memorySearch": "Busca em Memória",
  "agents.defaults.memorySearch.enabled": "Ativar Busca em Memória",
  "agents.defaults.memorySearch.sources": "Fontes de Busca em Memória",
  "agents.defaults.memorySearch.experimental.sessionMemory": "Índice de Memória de Sessão (Experimental)",
  "agents.defaults.memorySearch.provider": "Provedor de Busca em Memória",
  "agents.defaults.memorySearch.remote.baseUrl": "URL Base de Embedding Remoto",
  "agents.defaults.memorySearch.remote.apiKey": "Chave da API de Embedding Remoto",
  "agents.defaults.memorySearch.remote.headers": "Cabeçalhos de Embedding Remoto",
  "agents.defaults.memorySearch.remote.batch.concurrency": "Concorrência em Lote Remota",
  "agents.defaults.memorySearch.model": "Modelo de Busca em Memória",
  "agents.defaults.memorySearch.fallback": "Fallback de Busca em Memória",
  "agents.defaults.memorySearch.local.modelPath": "Caminho do Modelo de Embedding Local",
  "agents.defaults.memorySearch.store.path": "Caminho do Índice de Memória",
  "agents.defaults.memorySearch.store.vector.enabled": "Índice Vetorial de Memória",
  "agents.defaults.memorySearch.store.vector.extensionPath": "Caminho da Extensão Vetorial",
  "agents.defaults.memorySearch.chunking.tokens": "Tokens por Fragmento de Memória",
  "agents.defaults.memorySearch.chunking.overlap": "Tokens de Sobreposição de Memória",
  "agents.defaults.memorySearch.sync.onSessionStart": "Indexar ao Iniciar Sessão",
  "agents.defaults.memorySearch.sync.onSearch": "Indexar na Busca (Lazy)",
  "agents.defaults.memorySearch.sync.watch": "Monitorar Arquivos de Memória",
  "agents.defaults.memorySearch.sync.watchDebounceMs": "Debounce de Memória (ms)",
  "agents.defaults.memorySearch.sync.sessions.deltaBytes": "Delta de Bytes da Sessão",
  "agents.defaults.memorySearch.sync.sessions.deltaMessages": "Delta de Mensagens da Sessão",
  "agents.defaults.memorySearch.query.maxResults": "Resultados Máximos da Busca",
  "agents.defaults.memorySearch.query.minScore": "Pontuação Mínima da Busca",
  "agents.defaults.memorySearch.query.hybrid.enabled": "Busca Híbrida de Memória",
  "agents.defaults.memorySearch.query.hybrid.vectorWeight": "Peso Vetorial (Híbrido)",
  "agents.defaults.memorySearch.query.hybrid.textWeight": "Peso de Texto (Híbrido)",
  "agents.defaults.memorySearch.query.hybrid.candidateMultiplier": "Multiplicador de Candidatos Híbridos",
  "agents.defaults.memorySearch.cache.enabled": "Cache de Embedding de Memória",
  "agents.defaults.memorySearch.cache.maxEntries": "Máximo de Entradas no Cache de Embedding",
  "auth.profiles": "Perfis de Autenticação",
  "auth.order": "Ordem dos Perfis de Autenticação",
  "auth.cooldowns.billingBackoffHours": "Intervalo de Faturamento (horas)",
  "auth.cooldowns.billingBackoffHoursByProvider": "Overrides de Intervalo de Faturamento",
  "auth.cooldowns.billingMaxHours": "Limite de Intervalo de Faturamento (horas)",
  "auth.cooldowns.failureWindowHours": "Janela de Failover (horas)",
  "agents.defaults.humanDelay.mode": "Modo de Atraso Humano",
  "agents.defaults.humanDelay.minMs": "Atraso Humano Mínimo (ms)",
  "agents.defaults.humanDelay.maxMs": "Atraso Humano Máximo (ms)",
  "commands.native": "Comandos Nativos",
  "commands.nativeSkills": "Comandos de Habilidades Nativas",
  "commands.text": "Comandos de Texto",
  "commands.bash": "Permitir Comando Bash no Chat",
  "commands.bashForegroundMs": "Janela de Primeiro Plano Bash (ms)",
  "commands.config": "Permitir /config",
  "commands.debug": "Permitir /debug",
  "commands.restart": "Permitir Reinício",
  "commands.useAccessGroups": "Usar Grupos de Acesso",
  "ui.seamColor": "Cor de Destaque",
  "ui.assistant.name": "Nome do Assistente",
  "ui.assistant.avatar": "Avatar do Assistente",
  "browser.controlUrl": "URL de Controle do Navegador",
  "browser.snapshotDefaults": "Padrões de Instantâneo (Snapshot)",
  "browser.snapshotDefaults.mode": "Modo de Instantâneo",
  "browser.remoteCdpTimeoutMs": "Tempo Limite de CDP Remoto (ms)",
  "browser.remoteCdpHandshakeTimeoutMs": "Tempo Limite de Handshake CDP (ms)",
  "session.dmScope": "Escopo da Sessão de DM",
  "session.agentToAgent.maxPingPongTurns": "Turnos de Ping-Pong Agente-Agente",
  "messages.ackReaction": "Emoji de Reação de Confirmação",
  "messages.ackReactionScope": "Escopo da Reação de Confirmação",
  "messages.inbound.debounceMs": "Debounce de Mensagens Recebidas (ms)",
  "talk.apiKey": "Chave da API Talk",
  "channels.telegram.botToken": "Token do Bot do Telegram",
  "channels.telegram.dmPolicy": "Política de DM do Telegram",
  "channels.telegram.streamMode": "Modo de Streaming do Telegram",
  "channels.telegram.draftChunk.minChars": "Caracteres Mínimos do Fragmento",
  "channels.telegram.draftChunk.maxChars": "Caracteres Máximos do Fragmento",
  "channels.telegram.draftChunk.breakPreference": "Preferência de Quebra do Fragmento",
  "channels.telegram.retry.attempts": "Tentativas de Re-execução do Telegram",
  "channels.telegram.retry.minDelayMs": "Atraso Mínimo de Re-execução (ms)",
  "channels.telegram.retry.maxDelayMs": "Atraso Máximo de Re-execução (ms)",
  "channels.telegram.retry.jitter": "Jitter de Re-execução (Telegram)",
  "channels.telegram.timeoutSeconds": "Tempo Limite da API do Telegram (seg)",
  "channels.telegram.capabilities.inlineButtons": "Botões Inline do Telegram",
  "channels.whatsapp.dmPolicy": "Política de DM do WhatsApp",
  "channels.whatsapp.selfChatMode": "Modo de Auto-Chat do WhatsApp",
  "channels.whatsapp.debounceMs": "Debounce de Mensagens do WhatsApp (ms)",
  "channels.signal.dmPolicy": "Política de DM do Signal",
  "channels.imessage.dmPolicy": "Política de DM do iMessage",
  "channels.bluebubbles.dmPolicy": "Política de DM do BlueBubbles",
  "channels.discord.dm.policy": "Política de DM do Discord",
  "channels.discord.retry.attempts": "Tentativas de Re-execução do Discord",
  "channels.discord.retry.minDelayMs": "Atraso Mínimo de Re-execução (ms)",
  "channels.discord.retry.maxDelayMs": "Atraso Máximo de Re-execução (ms)",
  "channels.discord.retry.jitter": "Jitter de Re-execução (Discord)",
  "channels.discord.maxLinesPerMessage": "Máximo de Linhas por Mensagem (Discord)",
  "channels.slack.dm.policy": "Política de DM do Slack",
  "channels.slack.allowBots": "Permitir Mensagens de Bots no Slack",
  "channels.discord.token": "Token do Bot do Discord",
  "channels.slack.botToken": "Token do Bot do Slack",
  "channels.slack.appToken": "Token do App do Slack",
  "channels.slack.userToken": "Token de Usuário do Slack",
  "channels.slack.userTokenReadOnly": "Token de Usuário do Slack (Apenas Leitura)",
  "channels.slack.thread.historyScope": "Escopo do Histórico de Threads no Slack",
  "channels.slack.thread.inheritParent": "Herança de Pai na Thread do Slack",
  "channels.mattermost.botToken": "Token do Bot do Mattermost",
  "channels.mattermost.baseUrl": "URL Base do Mattermost",
  "channels.mattermost.chatmode": "Modo de Chat do Mattermost",
  "channels.mattermost.oncharPrefixes": "Prefixos onchar do Mattermost",
  "channels.mattermost.requireMention": "Exigir Menção no Mattermost",
  "channels.signal.account": "Conta do Signal",
  "channels.imessage.cliPath": "Caminho da CLI do iMessage",
  "agents.list[].identity.avatar": "Avatar do Agente",
  "plugins.enabled": "Ativar Plugins",
  "plugins.allow": "Lista de Permissões de Plugins",
  "plugins.deny": "Lista de Bloqueio de Plugins",
  "plugins.load.paths": "Caminhos de Carga de Plugins",
  "plugins.slots": "Slots de Plugins",
  "plugins.slots.memory": "Plugin de Memória",
  "plugins.entries": "Entradas de Plugins",
  "plugins.entries.*.enabled": "Plugin Ativado",
  "plugins.entries.*.config": "Configuração do Plugin",
  "plugins.installs": "Registros de Instalação de Plugins",
  "plugins.installs.*.source": "Fonte de Instalação do Plugin",
  "plugins.installs.*.spec": "Especificação da Instalação",
  "plugins.installs.*.sourcePath": "Caminho de Origem da Instalação",
  "plugins.installs.*.installPath": "Caminho de Instalação",
  "plugins.installs.*.version": "Versão da Instalação",
  "plugins.installs.*.installedAt": "Hora da Instalação",
};

const FIELD_HELP: Record<string, string> = {
  "meta.lastTouchedVersion": "Definido automaticamente quando o ZERO grava a configuração.",
  "meta.lastTouchedAt": "Timestamp ISO da última gravação da configuração (automático).",
  "update.channel": 'Canal de atualização para git + npm ("stable", "beta" ou "dev").',
  "update.checkOnStart": "Verificar atualizações do npm quando o gateway inicia (padrão: true).",
  "gateway.remote.url": "URL do WebSocket do Gateway Remoto (ws:// ou wss://).",
  "gateway.remote.tlsFingerprint":
    "Fingerprint TLS sha256 esperada para o gateway remoto (pinagem para evitar MITM).",
  "gateway.remote.sshTarget":
    "Gateway remoto via SSH (túnel da porta do gateway para localhost). Formato: user@host ou user@host:port.",
  "gateway.remote.sshIdentity": "Caminho opcional do arquivo de identidade SSH (passado para ssh -i).",
  "agents.list[].identity.avatar":
    "Caminho da imagem do avatar (relativo ao workspace do agente) ou uma URL remota/dados.",
  "gateway.auth.token": "Recomendado para todos os gateways; obrigatório para vínculos não-loopback.",
  "gateway.auth.password": "Obrigatório para o túnel Tailscale.",
  "gateway.controlUi.basePath": "Prefixo de URL opcional onde a Interface de Controle é servida (ex: /zero).",
  "gateway.controlUi.allowInsecureAuth":
    "Permitir autenticação na UI sobre HTTP inseguro (apenas token; não recomendado).",
  "gateway.http.endpoints.chatCompletions.enabled":
    "Ativar o endpoint compatível com OpenAI `POST /v1/chat/completions` (padrão: false).",
  "gateway.reload.mode": 'Estratégia de recarregamento a quente para mudanças na config ("hybrid" recomendado).',
  "gateway.reload.debounceMs": "Janela de debounce (ms) antes de aplicar mudanças na configuração.",
  "gateway.nodes.browser.mode":
    'Roteamento de navegador do nó ("auto" = escolhe um nó conectado, "manual" = exige parâmetro, "off" = desativa).',
  "gateway.nodes.browser.node": "Fixar o roteamento do navegador em um id ou nome de nó específico (opcional).",
  "gateway.nodes.allowCommands":
    "Comandos extras node.invoke permitidos além dos padrões do gateway (array de strings).",
  "gateway.nodes.denyCommands":
    "Comandos a serem bloqueados mesmo se presentes nas permissões do nó ou na lista padrão.",
  "nodeHost.browserProxy.enabled": "Expor o servidor local de controle do navegador via proxy do nó.",
  "nodeHost.browserProxy.allowProfiles":
    "Lista opcional de nomes de perfis de navegador permitidos via proxy do nó.",
  "diagnostics.flags":
    'Ativar logs de diagnóstico específicos por flag (ex: ["telegram.http"]). Suporta curingas como "telegram.*" ou "*".',
  "diagnostics.cacheTrace.enabled":
    "Logar instantâneos de rastro de cache para execuções de agentes (padrão: false).",
  "diagnostics.cacheTrace.filePath":
    "Caminho de saída JSONL para logs de rastro de cache (padrão: $ZERO_STATE_DIR/logs/cache-trace.jsonl).",
  "diagnostics.cacheTrace.includeMessages":
    "Incluir payloads de mensagens completos na saída do rastro (padrão: true).",
  "diagnostics.cacheTrace.includePrompt": "Incluir texto do prompt na saída do rastro (padrão: true).",
  "diagnostics.cacheTrace.includeSystem": "Incluir prompt de sistema na saída do rastro (padrão: true).",

  "tools.exec.applyPatch.enabled":
    "Experimental. Enables apply_patch for OpenAI models when allowed by tool policy.",
  "tools.exec.applyPatch.allowModels":
    'Optional allowlist of model ids (e.g. "gpt-5.2" or "openai/gpt-5.2").',
  "tools.exec.notifyOnExit":
    "When true (default), backgrounded exec sessions enqueue a system event and request a heartbeat on exit.",
  "tools.exec.pathPrepend": "Directories to prepend to PATH for exec runs (gateway/sandbox).",
  "tools.exec.safeBins":
    "Allow stdin-only safe binaries to run without explicit allowlist entries.",
  "tools.message.allowCrossContextSend":
    "Legacy override: allow cross-context sends across all providers.",
  "tools.message.crossContext.allowWithinProvider":
    "Allow sends to other channels within the same provider (default: true).",
  "tools.message.crossContext.allowAcrossProviders":
    "Allow sends across different providers (default: false).",
  "tools.message.crossContext.marker.enabled":
    "Add a visible origin marker when sending cross-context (default: true).",
  "tools.message.crossContext.marker.prefix":
    'Text prefix for cross-context markers (supports "{channel}").',
  "tools.message.crossContext.marker.suffix":
    'Text suffix for cross-context markers (supports "{channel}").',
  "tools.message.broadcast.enabled": "Enable broadcast action (default: true).",
  "tools.web.search.enabled": "Enable the web_search tool (requires a provider API key).",
  "tools.web.search.provider": 'Search provider ("brave" or "perplexity").',
  "tools.web.search.apiKey": "Brave Search API key (fallback: BRAVE_API_KEY env var).",
  "tools.web.search.maxResults": "Default number of results to return (1-10).",
  "tools.web.search.timeoutSeconds": "Timeout in seconds for web_search requests.",
  "tools.web.search.cacheTtlMinutes": "Cache TTL in minutes for web_search results.",
  "tools.web.search.perplexity.apiKey":
    "Perplexity or OpenRouter API key (fallback: PERPLEXITY_API_KEY or OPENROUTER_API_KEY env var).",
  "tools.web.search.perplexity.baseUrl":
    "Perplexity base URL override (default: https://openrouter.ai/api/v1 or https://api.perplexity.ai).",
  "tools.web.search.perplexity.model":
    'Perplexity model override (default: "perplexity/sonar-pro").',
  "tools.web.fetch.enabled": "Enable the web_fetch tool (lightweight HTTP fetch).",
  "tools.web.fetch.maxChars": "Max characters returned by web_fetch (truncated).",
  "tools.web.fetch.timeoutSeconds": "Timeout in seconds for web_fetch requests.",
  "tools.web.fetch.cacheTtlMinutes": "Cache TTL in minutes for web_fetch results.",
  "tools.web.fetch.maxRedirects": "Maximum redirects allowed for web_fetch (default: 3).",
  "tools.web.fetch.userAgent": "Override User-Agent header for web_fetch requests.",
  "tools.web.fetch.readability":
    "Use Readability to extract main content from HTML (fallbacks to basic HTML cleanup).",
  "tools.web.fetch.firecrawl.enabled": "Enable Firecrawl fallback for web_fetch (if configured).",
  "tools.web.fetch.firecrawl.apiKey": "Firecrawl API key (fallback: FIRECRAWL_API_KEY env var).",
  "tools.web.fetch.firecrawl.baseUrl":
    "Firecrawl base URL (e.g. https://api.firecrawl.dev or custom endpoint).",
  "tools.web.fetch.firecrawl.onlyMainContent":
    "When true, Firecrawl returns only the main content (default: true).",
  "tools.web.fetch.firecrawl.maxAgeMs":
    "Firecrawl maxAge (ms) for cached results when supported by the API.",
  "tools.web.fetch.firecrawl.timeoutSeconds": "Timeout in seconds for Firecrawl requests.",
  "channels.slack.allowBots":
    "Allow bot-authored messages to trigger Slack replies (default: false).",
  "channels.slack.thread.historyScope":
    'Scope for Slack thread history context ("thread" isolates per thread; "channel" reuses channel history).',
  "channels.slack.thread.inheritParent":
    "If true, Slack thread sessions inherit the parent channel transcript (default: false).",
  "channels.mattermost.botToken":
    "Bot token from Mattermost System Console -> Integrations -> Bot Accounts.",
  "channels.mattermost.baseUrl":
    "Base URL for your Mattermost server (e.g., https://chat.example.com).",
  "channels.mattermost.chatmode":
    'Reply to channel messages on mention ("oncall"), on trigger chars (">" or "!") ("onchar"), or on every message ("onmessage").',
  "channels.mattermost.oncharPrefixes": 'Trigger prefixes for onchar mode (default: [">", "!"]).',
  "channels.mattermost.requireMention":
    "Require @mention in channels before responding (default: true).",
  "auth.profiles": "Named auth profiles (provider + mode + optional email).",
  "auth.order": "Ordered auth profile IDs per provider (used for automatic failover).",
  "auth.cooldowns.billingBackoffHours":
    "Base backoff (hours) when a profile fails due to billing/insufficient credits (default: 5).",
  "auth.cooldowns.billingBackoffHoursByProvider":
    "Optional per-provider overrides for billing backoff (hours).",
  "auth.cooldowns.billingMaxHours": "Cap (hours) for billing backoff (default: 24).",
  "auth.cooldowns.failureWindowHours": "Failure window (hours) for backoff counters (default: 24).",
  "agents.defaults.bootstrapMaxChars":
    "Max characters of each workspace bootstrap file injected into the system prompt before truncation (default: 20000).",
  "agents.defaults.repoRoot":
    "Optional repository root shown in the system prompt runtime line (overrides auto-detect).",
  "agents.defaults.envelopeTimezone":
    'Timezone for message envelopes ("utc", "local", "user", or an IANA timezone string).',
  "agents.defaults.envelopeTimestamp":
    'Include absolute timestamps in message envelopes ("on" or "off").',
  "agents.defaults.envelopeElapsed": 'Include elapsed time in message envelopes ("on" or "off").',
  "agents.defaults.models": "Configured model catalog (keys are full provider/model IDs).",
  "agents.defaults.memorySearch":
    "Vector search over MEMORY.md and memory/*.md (per-agent overrides supported).",
  "agents.defaults.memorySearch.sources":
    'Sources to index for memory search (default: ["memory"]; add "sessions" to include session transcripts).',
  "agents.defaults.memorySearch.experimental.sessionMemory":
    "Enable experimental session transcript indexing for memory search (default: false).",
  "agents.defaults.memorySearch.provider": 'Embedding provider ("openai", "gemini", or "local").',
  "agents.defaults.memorySearch.remote.baseUrl":
    "Custom base URL for remote embeddings (OpenAI-compatible proxies or Gemini overrides).",
  "agents.defaults.memorySearch.remote.apiKey": "Custom API key for the remote embedding provider.",
  "agents.defaults.memorySearch.remote.headers":
    "Extra headers for remote embeddings (merged; remote overrides OpenAI headers).",
  "agents.defaults.memorySearch.remote.batch.enabled":
    "Enable batch API for memory embeddings (OpenAI/Gemini; default: true).",
  "agents.defaults.memorySearch.remote.batch.wait":
    "Wait for batch completion when indexing (default: true).",
  "agents.defaults.memorySearch.remote.batch.concurrency":
    "Max concurrent embedding batch jobs for memory indexing (default: 2).",
  "agents.defaults.memorySearch.remote.batch.pollIntervalMs":
    "Polling interval in ms for batch status (default: 2000).",
  "agents.defaults.memorySearch.remote.batch.timeoutMinutes":
    "Timeout in minutes for batch indexing (default: 60).",
  "agents.defaults.memorySearch.local.modelPath":
    "Local GGUF model path or hf: URI (node-llama-cpp).",
  "agents.defaults.memorySearch.fallback":
    'Fallback provider when embeddings fail ("openai", "gemini", "local", or "none").',
  "agents.defaults.memorySearch.store.path":
    "SQLite index path (default: ~/.zero/memory/{agentId}.sqlite).",
  "agents.defaults.memorySearch.store.vector.enabled":
    "Enable sqlite-vec extension for vector search (default: true).",
  "agents.defaults.memorySearch.store.vector.extensionPath":
    "Optional override path to sqlite-vec extension library (.dylib/.so/.dll).",
  "agents.defaults.memorySearch.query.hybrid.enabled":
    "Enable hybrid BM25 + vector search for memory (default: true).",
  "agents.defaults.memorySearch.query.hybrid.vectorWeight":
    "Weight for vector similarity when merging results (0-1).",
  "agents.defaults.memorySearch.query.hybrid.textWeight":
    "Weight for BM25 text relevance when merging results (0-1).",
  "agents.defaults.memorySearch.query.hybrid.candidateMultiplier":
    "Multiplier for candidate pool size (default: 4).",
  "agents.defaults.memorySearch.cache.enabled":
    "Cache chunk embeddings in SQLite to speed up reindexing and frequent updates (default: true).",
  "agents.defaults.memorySearch.cache.maxEntries":
    "Optional cap on cached embeddings (best-effort).",
  "agents.defaults.memorySearch.sync.onSearch":
    "Lazy sync: schedule a reindex on search after changes.",
  "agents.defaults.memorySearch.sync.watch": "Watch memory files for changes (chokidar).",
  "agents.defaults.memorySearch.sync.sessions.deltaBytes":
    "Minimum appended bytes before session transcripts trigger reindex (default: 100000).",
  "agents.defaults.memorySearch.sync.sessions.deltaMessages":
    "Minimum appended JSONL lines before session transcripts trigger reindex (default: 50).",
  "plugins.enabled": "Enable plugin/extension loading (default: true).",
  "plugins.allow": "Optional allowlist of plugin ids; when set, only listed plugins load.",
  "plugins.deny": "Optional denylist of plugin ids; deny wins over allowlist.",
  "plugins.load.paths": "Additional plugin files or directories to load.",
  "plugins.slots": "Select which plugins own exclusive slots (memory, etc.).",
  "plugins.slots.memory":
    'Select the active memory plugin by id, or "none" to disable memory plugins.',
  "plugins.entries": "Per-plugin settings keyed by plugin id (enable/disable + config payloads).",
  "plugins.entries.*.enabled": "Overrides plugin enable/disable for this entry (restart required).",
  "plugins.entries.*.config": "Plugin-defined config payload (schema is provided by the plugin).",
  "plugins.installs":
    "CLI-managed install metadata (used by `zero plugins update` to locate install sources).",
  "plugins.installs.*.source": 'Install source ("npm", "archive", or "path").',
  "plugins.installs.*.spec": "Original npm spec used for install (if source is npm).",
  "plugins.installs.*.sourcePath": "Original archive/path used for install (if any).",
  "plugins.installs.*.installPath": "Resolved install directory (usually ~/.zero/extensions/<id>).",
  "plugins.installs.*.version": "Version recorded at install time (if available).",
  "plugins.installs.*.installedAt": "ISO timestamp of last install/update.",
  "agents.list.*.identity.avatar":
    "Agent avatar (workspace-relative path, http(s) URL, or data URI).",
  "agents.defaults.model.primary": "Primary model (provider/model).",
  "agents.defaults.model.fallbacks":
    "Ordered fallback models (provider/model). Used when the primary model fails.",
  "agents.defaults.imageModel.primary":
    "Optional image model (provider/model) used when the primary model lacks image input.",
  "agents.defaults.imageModel.fallbacks": "Ordered fallback image models (provider/model).",
  "agents.defaults.cliBackends": "Optional CLI backends for text-only fallback (claude-cli, etc.).",
  "agents.defaults.humanDelay.mode": 'Delay style for block replies ("off", "natural", "custom").',
  "agents.defaults.humanDelay.minMs": "Minimum delay in ms for custom humanDelay (default: 800).",
  "agents.defaults.humanDelay.maxMs": "Maximum delay in ms for custom humanDelay (default: 2500).",
  "commands.native":
    "Register native commands with channels that support it (Discord/Slack/Telegram).",
  "commands.nativeSkills":
    "Register native skill commands (user-invocable skills) with channels that support it.",
  "commands.text": "Allow text command parsing (slash commands only).",
  "commands.bash":
    "Allow bash chat command (`!`; `/bash` alias) to run host shell commands (default: false; requires tools.elevated).",
  "commands.bashForegroundMs":
    "How long bash waits before backgrounding (default: 2000; 0 backgrounds immediately).",
  "commands.config": "Allow /config chat command to read/write config on disk (default: false).",
  "commands.debug": "Allow /debug chat command for runtime-only overrides (default: false).",
  "commands.restart": "Allow /restart and gateway restart tool actions (default: false).",
  "commands.useAccessGroups": "Enforce access-group allowlists/policies for commands.",
  "session.dmScope":
    'DM session scoping: "main" keeps continuity; "per-peer" or "per-channel-peer" isolates DM history (recommended for shared inboxes).',
  "session.identityLinks":
    "Map canonical identities to provider-prefixed peer IDs for DM session linking (example: telegram:123456).",
  "channels.telegram.configWrites":
    "Allow Telegram to write config in response to channel events/commands (default: true).",
  "channels.slack.configWrites":
    "Allow Slack to write config in response to channel events/commands (default: true).",
  "channels.mattermost.configWrites":
    "Allow Mattermost to write config in response to channel events/commands (default: true).",
  "channels.discord.configWrites":
    "Allow Discord to write config in response to channel events/commands (default: true).",
  "channels.whatsapp.configWrites":
    "Allow WhatsApp to write config in response to channel events/commands (default: true).",
  "channels.signal.configWrites":
    "Allow Signal to write config in response to channel events/commands (default: true).",
  "channels.imessage.configWrites":
    "Allow iMessage to write config in response to channel events/commands (default: true).",
  "channels.msteams.configWrites":
    "Allow Microsoft Teams to write config in response to channel events/commands (default: true).",
  "channels.discord.commands.native": 'Override native commands for Discord (bool or "auto").',
  "channels.discord.commands.nativeSkills":
    'Override native skill commands for Discord (bool or "auto").',
  "channels.telegram.commands.native": 'Override native commands for Telegram (bool or "auto").',
  "channels.telegram.commands.nativeSkills":
    'Override native skill commands for Telegram (bool or "auto").',
  "channels.slack.commands.native": 'Override native commands for Slack (bool or "auto").',
  "channels.slack.commands.nativeSkills":
    'Override native skill commands for Slack (bool or "auto").',
  "session.agentToAgent.maxPingPongTurns":
    "Max reply-back turns between requester and target (0–5).",
  "channels.telegram.customCommands":
    "Additional Telegram bot menu commands (merged with native; conflicts ignored).",
  "messages.ackReaction": "Emoji reaction used to acknowledge inbound messages (empty disables).",
  "messages.ackReactionScope":
    'When to send ack reactions ("group-mentions", "group-all", "direct", "all").',
  "messages.inbound.debounceMs":
    "Debounce window (ms) for batching rapid inbound messages from the same sender (0 to disable).",
  "channels.telegram.dmPolicy":
    'Direct message access control ("pairing" recommended). "open" requires channels.telegram.allowFrom=["*"].',
  "channels.telegram.streamMode":
    "Draft streaming mode for Telegram replies (off | partial | block). Separate from block streaming; requires private topics + sendMessageDraft.",
  "channels.telegram.draftChunk.minChars":
    'Minimum chars before emitting a Telegram draft update when channels.telegram.streamMode="block" (default: 200).',
  "channels.telegram.draftChunk.maxChars":
    'Target max size for a Telegram draft update chunk when channels.telegram.streamMode="block" (default: 800; clamped to channels.telegram.textChunkLimit).',
  "channels.telegram.draftChunk.breakPreference":
    "Preferred breakpoints for Telegram draft chunks (paragraph | newline | sentence). Default: paragraph.",
  "channels.telegram.retry.attempts":
    "Max retry attempts for outbound Telegram API calls (default: 3).",
  "channels.telegram.retry.minDelayMs": "Minimum retry delay in ms for Telegram outbound calls.",
  "channels.telegram.retry.maxDelayMs":
    "Maximum retry delay cap in ms for Telegram outbound calls.",
  "channels.telegram.retry.jitter": "Jitter factor (0-1) applied to Telegram retry delays.",
  "channels.telegram.timeoutSeconds":
    "Max seconds before Telegram API requests are aborted (default: 500 per grammY).",
  "channels.whatsapp.dmPolicy":
    'Direct message access control ("pairing" recommended). "open" requires channels.whatsapp.allowFrom=["*"].',
  "channels.whatsapp.selfChatMode": "Same-phone setup (bot uses your personal WhatsApp number).",
  "channels.whatsapp.debounceMs":
    "Debounce window (ms) for batching rapid consecutive messages from the same sender (0 to disable).",
  "channels.signal.dmPolicy":
    'Direct message access control ("pairing" recommended). "open" requires channels.signal.allowFrom=["*"].',
  "channels.imessage.dmPolicy":
    'Direct message access control ("pairing" recommended). "open" requires channels.imessage.allowFrom=["*"].',
  "channels.bluebubbles.dmPolicy":
    'Direct message access control ("pairing" recommended). "open" requires channels.bluebubbles.allowFrom=["*"].',
  "channels.discord.dm.policy":
    'Direct message access control ("pairing" recommended). "open" requires channels.discord.dm.allowFrom=["*"].',
  "channels.discord.retry.attempts":
    "Max retry attempts for outbound Discord API calls (default: 3).",
  "channels.discord.retry.minDelayMs": "Minimum retry delay in ms for Discord outbound calls.",
  "channels.discord.retry.maxDelayMs": "Maximum retry delay cap in ms for Discord outbound calls.",
  "channels.discord.retry.jitter": "Jitter factor (0-1) applied to Discord retry delays.",
  "channels.discord.maxLinesPerMessage": "Soft max line count per Discord message (default: 17).",
  "channels.slack.dm.policy":
    'Direct message access control ("pairing" recommended). "open" requires channels.slack.dm.allowFrom=["*"].',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  "gateway.remote.url": "ws://host:18789",
  "gateway.remote.tlsFingerprint": "sha256:ab12cd34…",
  "gateway.remote.sshTarget": "user@host",
  "gateway.controlUi.basePath": "/zero",
  "channels.mattermost.baseUrl": "https://chat.example.com",
  "agents.list[].identity.avatar": "avatars/zero.png",
};

const SENSITIVE_PATTERNS = [/token/i, /password/i, /secret/i, /api.?key/i];

function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(path));
}

type JsonSchemaObject = JsonSchemaNode & {
  type?: string | string[];
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  additionalProperties?: JsonSchemaObject | boolean;
};

function cloneSchema<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function asSchemaObject(value: unknown): JsonSchemaObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonSchemaObject;
}

function isObjectSchema(schema: JsonSchemaObject): boolean {
  const type = schema.type;
  if (type === "object") return true;
  if (Array.isArray(type) && type.includes("object")) return true;
  return Boolean(schema.properties || schema.additionalProperties);
}

function mergeObjectSchema(base: JsonSchemaObject, extension: JsonSchemaObject): JsonSchemaObject {
  const mergedRequired = new Set<string>([...(base.required ?? []), ...(extension.required ?? [])]);
  const merged: JsonSchemaObject = {
    ...base,
    ...extension,
    properties: {
      ...base.properties,
      ...extension.properties,
    },
  };
  if (mergedRequired.size > 0) {
    merged.required = Array.from(mergedRequired);
  }
  const additional = extension.additionalProperties ?? base.additionalProperties;
  if (additional !== undefined) merged.additionalProperties = additional;
  return merged;
}

function buildBaseHints(): ConfigUiHints {
  const hints: ConfigUiHints = {};
  for (const [group, label] of Object.entries(GROUP_LABELS)) {
    hints[group] = {
      label,
      group: label,
      order: GROUP_ORDER[group],
    };
  }
  for (const [path, label] of Object.entries(FIELD_LABELS)) {
    const current = hints[path];
    hints[path] = current ? { ...current, label } : { label };
  }
  for (const [path, help] of Object.entries(FIELD_HELP)) {
    const current = hints[path];
    hints[path] = current ? { ...current, help } : { help };
  }
  for (const [path, placeholder] of Object.entries(FIELD_PLACEHOLDERS)) {
    const current = hints[path];
    hints[path] = current ? { ...current, placeholder } : { placeholder };
  }
  return hints;
}

function applySensitiveHints(hints: ConfigUiHints): ConfigUiHints {
  const next = { ...hints };
  for (const key of Object.keys(next)) {
    if (isSensitivePath(key)) {
      next[key] = { ...next[key], sensitive: true };
    }
  }
  return next;
}

function applyPluginHints(hints: ConfigUiHints, plugins: PluginUiMetadata[]): ConfigUiHints {
  const next: ConfigUiHints = { ...hints };
  for (const plugin of plugins) {
    const id = plugin.id.trim();
    if (!id) continue;
    const name = (plugin.name ?? id).trim() || id;
    const basePath = `plugins.entries.${id}`;

    next[basePath] = {
      ...next[basePath],
      label: name,
      help: plugin.description
        ? `${plugin.description} (plugin: ${id})`
        : `Plugin entry for ${id}.`,
    };
    next[`${basePath}.enabled`] = {
      ...next[`${basePath}.enabled`],
      label: `Enable ${name}`,
    };
    next[`${basePath}.config`] = {
      ...next[`${basePath}.config`],
      label: `${name} Config`,
      help: `Plugin-defined config payload for ${id}.`,
    };

    const uiHints = plugin.configUiHints ?? {};
    for (const [relPathRaw, hint] of Object.entries(uiHints)) {
      const relPath = relPathRaw.trim().replace(/^\./, "");
      if (!relPath) continue;
      const key = `${basePath}.config.${relPath}`;
      next[key] = {
        ...next[key],
        ...hint,
      };
    }
  }
  return next;
}

function applyChannelHints(hints: ConfigUiHints, channels: ChannelUiMetadata[]): ConfigUiHints {
  const next: ConfigUiHints = { ...hints };
  for (const channel of channels) {
    const id = channel.id.trim();
    if (!id) continue;
    const basePath = `channels.${id}`;
    const current = next[basePath] ?? {};
    const label = channel.label?.trim();
    const help = channel.description?.trim();
    next[basePath] = {
      ...current,
      ...(label ? { label } : {}),
      ...(help ? { help } : {}),
    };

    const uiHints = channel.configUiHints ?? {};
    for (const [relPathRaw, hint] of Object.entries(uiHints)) {
      const relPath = relPathRaw.trim().replace(/^\./, "");
      if (!relPath) continue;
      const key = `${basePath}.${relPath}`;
      next[key] = {
        ...next[key],
        ...hint,
      };
    }
  }
  return next;
}

function listHeartbeatTargetChannels(channels: ChannelUiMetadata[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of CHANNEL_IDS) {
    const normalized = id.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }
  for (const channel of channels) {
    const normalized = channel.id.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

function applyHeartbeatTargetHints(
  hints: ConfigUiHints,
  channels: ChannelUiMetadata[],
): ConfigUiHints {
  const next: ConfigUiHints = { ...hints };
  const channelList = listHeartbeatTargetChannels(channels);
  const channelHelp = channelList.length ? ` Known channels: ${channelList.join(", ")}.` : "";
  const help = `Delivery target ("last", "none", or a channel id).${channelHelp}`;
  const paths = ["agents.defaults.heartbeat.target", "agents.list.*.heartbeat.target"];
  for (const path of paths) {
    const current = next[path] ?? {};
    next[path] = {
      ...current,
      help: current.help ?? help,
      placeholder: current.placeholder ?? "last",
    };
  }
  return next;
}

function applyPluginSchemas(schema: ConfigSchema, plugins: PluginUiMetadata[]): ConfigSchema {
  const next = cloneSchema(schema);
  const root = asSchemaObject(next);
  const pluginsNode = asSchemaObject(root?.properties?.plugins);
  const entriesNode = asSchemaObject(pluginsNode?.properties?.entries);
  if (!entriesNode) return next;

  const entryBase = asSchemaObject(entriesNode.additionalProperties);
  const entryProperties = entriesNode.properties ?? {};
  entriesNode.properties = entryProperties;

  for (const plugin of plugins) {
    if (!plugin.configSchema) continue;
    const entrySchema = entryBase
      ? cloneSchema(entryBase)
      : ({ type: "object" } as JsonSchemaObject);
    const entryObject = asSchemaObject(entrySchema) ?? ({ type: "object" } as JsonSchemaObject);
    const baseConfigSchema = asSchemaObject(entryObject.properties?.config);
    const pluginSchema = asSchemaObject(plugin.configSchema);
    const nextConfigSchema =
      baseConfigSchema &&
        pluginSchema &&
        isObjectSchema(baseConfigSchema) &&
        isObjectSchema(pluginSchema)
        ? mergeObjectSchema(baseConfigSchema, pluginSchema)
        : cloneSchema(plugin.configSchema);

    entryObject.properties = {
      ...entryObject.properties,
      config: nextConfigSchema,
    };
    entryProperties[plugin.id] = entryObject;
  }

  return next;
}

function applyChannelSchemas(schema: ConfigSchema, channels: ChannelUiMetadata[]): ConfigSchema {
  const next = cloneSchema(schema);
  const root = asSchemaObject(next);
  const channelsNode = asSchemaObject(root?.properties?.channels);
  if (!channelsNode) return next;
  const channelProps = channelsNode.properties ?? {};
  channelsNode.properties = channelProps;

  for (const channel of channels) {
    if (!channel.configSchema) continue;
    const existing = asSchemaObject(channelProps[channel.id]);
    const incoming = asSchemaObject(channel.configSchema);
    if (existing && incoming && isObjectSchema(existing) && isObjectSchema(incoming)) {
      channelProps[channel.id] = mergeObjectSchema(existing, incoming);
    } else {
      channelProps[channel.id] = cloneSchema(channel.configSchema);
    }
  }

  return next;
}

let cachedBase: ConfigSchemaResponse | null = null;

function stripChannelSchema(schema: ConfigSchema): ConfigSchema {
  const next = cloneSchema(schema);
  const root = asSchemaObject(next);
  if (!root || !root.properties) return next;
  const channelsNode = asSchemaObject(root.properties.channels);
  if (channelsNode) {
    channelsNode.properties = {};
    channelsNode.required = [];
    channelsNode.additionalProperties = true;
  }
  return next;
}

function buildBaseConfigSchema(): ConfigSchemaResponse {
  if (cachedBase) return cachedBase;
  const schema = ZEROSchema.toJSONSchema({
    target: "draft-07",
    unrepresentable: "any",
  });
  schema.title = "ZEROConfig";
  const hints = applySensitiveHints(buildBaseHints());
  const next = {
    schema: stripChannelSchema(schema),
    uiHints: hints,
    version: VERSION,
    generatedAt: new Date().toISOString(),
  };
  cachedBase = next;
  return next;
}

export function buildConfigSchema(params?: {
  plugins?: PluginUiMetadata[];
  channels?: ChannelUiMetadata[];
}): ConfigSchemaResponse {
  const base = buildBaseConfigSchema();
  const plugins = params?.plugins ?? [];
  const channels = params?.channels ?? [];
  if (plugins.length === 0 && channels.length === 0) return base;
  const mergedHints = applySensitiveHints(
    applyHeartbeatTargetHints(
      applyChannelHints(applyPluginHints(base.uiHints, plugins), channels),
      channels,
    ),
  );
  const mergedSchema = applyChannelSchemas(applyPluginSchemas(base.schema, plugins), channels);
  return {
    ...base,
    schema: mergedSchema,
    uiHints: mergedHints,
  };
}

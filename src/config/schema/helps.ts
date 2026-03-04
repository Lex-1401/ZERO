
export const FIELD_HELP: Record<string, string> = {
    "meta.lastTouchedVersion": "Definido automaticamente quando o ZERO grava a configuração.",
    "meta.lastTouchedAt": "Timestamp ISO da última gravação da configuração (automático).",
    "update.channel": 'Canal de atualização para git + npm ("stable", "beta" ou "dev").',
    "update.checkOnStart": "Verificar atualizações do npm quando o gateway inicia (padrão: true).",
    "gateway.remote.url": "URL do WebSocket do Gateway Remoto (ws:// ou wss://).",
    "gateway.remote.tlsFingerprint":
        "Fingerprint TLS sha256 esperada para o gateway remoto (pinagem para evitar MITM).",
    "gateway.remote.sshTarget":
        "Gateway remoto via SSH (túnel da porta do gateway para localhost). Formato: user@host ou user@host:port.",
    "gateway.remote.sshIdentity":
        "Caminho opcional do arquivo de identidade SSH (passado para ssh -i).",
    "agents.list[].identity.avatar":
        "Caminho da imagem do avatar (relativo ao workspace do agente) ou uma URL remota/dados.",
    "gateway.auth.token":
        "Recomendado para todos os gateways; obrigatório para vínculos não-loopback.",
    "gateway.auth.password": "Obrigatório para o túnel Tailscale.",
    "gateway.controlUi.basePath":
        "Prefixo de URL opcional onde a Interface de Controle é servida (ex: /zero).",
    "gateway.controlUi.allowInsecureAuth":
        "Permitir autenticação na UI sobre HTTP inseguro (apenas token; não recomendado).",
    "gateway.http.endpoints.chatCompletions.enabled":
        "Ativar o endpoint compatível com OpenAI `POST /v1/chat/completions` (padrão: false).",
    "gateway.reload.mode":
        'Estratégia de recarregamento a quente para mudanças na config ("hybrid" recomendado).',
    "gateway.reload.debounceMs": "Janela de debounce (ms) antes de aplicar mudanças na configuração.",
    "gateway.nodes.browser.mode":
        'Roteamento de navegador do nó ("auto" = escolhe um nó conectado, "manual" = exige parâmetro, "off" = desativa).',
    "gateway.nodes.browser.node":
        "Fixar o roteamento do navegador em um id ou nome de nó específico (opcional).",
    "gateway.nodes.allowCommands":
        "Comandos extras node.invoke permitidos além dos padrões do gateway (array de strings).",
    "gateway.nodes.denyCommands":
        "Comandos a serem bloqueados mesmo se presentes nas permissões do nó ou na lista padrão.",
    "nodeHost.browserProxy.enabled":
        "Expor o servidor local de controle do navegador via proxy do nó.",
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
    "diagnostics.cacheTrace.includePrompt":
        "Incluir texto do prompt na saída do rastro (padrão: true).",
    "diagnostics.cacheTrace.includeSystem":
        "Incluir prompt de sistema na saída do rastro (padrão: true).",

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
        'Direct message access control ("pairing" pairing recommended). "open" requires channels.whatsapp.allowFrom=["*"].',
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

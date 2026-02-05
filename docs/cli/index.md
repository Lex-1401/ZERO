---
summary: "Referência da CLI do ZERO para comandos, subcomandos e opções de `zero`"
read_when:
  - Adicionando ou modificando comandos ou opções da CLI
  - Documentando novas superfícies de comando
---

# Referência da CLI

Esta página descreve o comportamento atual da CLI. Se os comandos mudarem, atualize este documento.

## Páginas de comandos

- [`setup`](/cli/setup)
- [`onboard`](/cli/onboard)
- [`configure`](/cli/configure)
- [`config`](/cli/config)
- [`doctor`](/cli/doctor)
- [`dashboard`](/cli/dashboard)
- [`reset`](/cli/reset)
- [`uninstall`](/cli/uninstall)
- [`update`](/cli/update)
- [`message`](/cli/message)
- [`agent`](/cli/agent)
- [`agents`](/cli/agents)
- [`acp`](/cli/acp)
- [`status`](/cli/status)
- [`health`](/cli/health)
- [`sessions`](/cli/sessions)
- [`gateway`](/cli/gateway)
- [`logs`](/cli/logs)
- [`system`](/cli/system)
- [`models`](/cli/models)
- [`memory`](/cli/memory)
- [`nodes`](/cli/nodes)
- [`devices`](/cli/devices)
- [`node`](/cli/node)
- [`approvals`](/cli/approvals)
- [`sandbox`](/cli/sandbox)
- [`tui`](/cli/tui)
- [`browser`](/cli/browser)
- [`cron`](/cli/cron)
- [`dns`](/cli/dns)
- [`docs`](/cli/docs)
- [`hooks`](/cli/hooks)
- [`webhooks`](/cli/webhooks)
- [`pairing`](/cli/pairing)
- [`plugins`](/cli/plugins) (comandos de plugin)
- [`channels`](/cli/channels)
- [`security`](/cli/security)
- [`skills`](/cli/skills)
- [`voicecall`](/cli/voicecall) (plugin; se instalado)

## Flags globais

- `--dev`: isola o estado sob `~/.zero-dev` e muda as portas padrão.
- `--profile <nome>`: isola o estado sob `~/.zero-<nome>`.
- `--no-color`: desativa as cores ANSI.
- `--update`: atalho para `zero update` (apenas para instalações a partir do código-fonte).
- `-V`, `--version`, `-v`: imprime a versão e sai.

## Estilo de saída (Output)

- Cores ANSI e indicadores de progresso só aparecem em sessões TTY.
- Hiperlinks OSC-8 aparecem como links clicáveis em terminais suportados; caso contrário, recorremos a URLs simples.
- `--json` (e `--plain` onde suportado) desativa o estilo para uma saída limpa.
- `--no-color` desativa o estilo ANSI; `NO_COLOR=1` também é respeitado.
- Comandos de longa duração mostram um indicador de progresso (OSC 9;4 quando suportado).

## Paleta de cores

O ZERO usa uma paleta "void" para a saída da CLI.

- `accent` (#FF5A2D): cabeçalhos, rótulos, destaques primários.
- `accentBright` (#FF7A3D): nomes de comandos, ênfase.
- `accentDim` (#D14A22): texto de destaque secundário.
- `info` (#FF8A5B): valores informativos.
- `success` (#2FBF71): estados de sucesso.
- `warn` (#FFB020): avisos, fallbacks, atenção.
- `error` (#E23D2D): erros, falhas.
- `muted` (#8B7F77): desênfase, metadados.

Fonte da verdade da paleta: `src/terminal/palette.ts`.

## Árvore de comandos

```text
zero [--dev] [--profile <nome>] <comando>
  setup
  onboard
  configure
  config
    get
    set
    unset
  doctor
  security
    audit
  reset
  uninstall
  update
  channels
    list
    status
    logs
    add
    remove
    login
    logout
  skills
    list
    info
    check
  plugins
    list
    info
    install
    enable
    disable
    doctor
  memory
    status
    index
    search
  message
  agent
  agents
    list
    add
    delete
  acp
  status
  health
  sessions
  gateway
    call
    health
    status
    probe
    discover
    install
    uninstall
    start
    stop
    restart
    run
  logs
  system
    event
    heartbeat last|enable|disable
    presence
  models
    list
    status
    set
    set-image
    aliases list|add|remove
    fallbacks list|add|remove|clear
    image-fallbacks list|add|remove|clear
    scan
    auth add|setup-token|paste-token
    auth order get|set|clear
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
  devices
  node
    run
    status
    install
    uninstall
    start
    stop
    restart
  approvals
    get
    set
    allowlist add|remove
  browser
    status
    start
    stop
    reset-profile
    tabs
    open
    focus
    close
    profiles
    create-profile
    delete-profile
    screenshot
    snapshot
    navigate
    resize
    click
    type
    press
    hover
    drag
    select
    upload
    fill
    dialog
    wait
    evaluate
    console
    pdf
  hooks
    list
    info
    check
    enable
    disable
    install
    update
  webhooks
    gmail setup|run
  pairing
    list
    approve
  docs
  dns
    setup
  tui
```

Nota: plugins podem adicionar comandos adicionais de nível superior (por exemplo, `zero voicecall`).

## Segurança

- `zero security audit` — audita a configuração + estado local para problemas comuns de segurança.
- `zero security audit --deep` — sonda o Gateway ao vivo (melhor esforço).
- `zero security audit --fix` — reforça padrões seguros e altera permissões (`chmod`) de estado/configuração.

## Plugins

Gerencie extensões e suas configurações:

- `zero plugins list` — descobre plugins (use `--json` para saída de máquina).
- `zero plugins info <id>` — mostra detalhes de um plugin.
- `zero plugins install <caminho|.tgz|spec-npm>` — instala um plugin (ou adiciona um caminho de plugin a `plugins.load.paths`).
- `zero plugins enable <id>` / `disable <id>` — alterna `plugins.entries.<id>.enabled`.
- `zero plugins doctor` — relata erros de carregamento de plugins.

A maioria das alterações de plugin exige a reinicialização do gateway. Veja [/plugin](/plugin).

## Memória

Busca vetorial sobre `MEMORY.md` + `memory/*.md`:

- `zero memory status` — mostra estatísticas do índice.
- `zero memory index` — reindexa arquivos de memória.
- `zero memory search "<consulta>"` — busca semântica sobre a memória.

## Comandos de barra (slash commands) no chat

As mensagens de chat suportam comandos `/...` (texto e nativos). Veja [/tools/slash-commands](/tools/slash-commands).

Destaques:

- `/status` para diagnósticos rápidos.
- `/config` para alterações de configuração persistidas.
- `/debug` para substituições de configuração apenas em tempo de execução (memória, não disco; exige `commands.debug: true`).

## Configuração + Integração (Setup + Onboarding)

### `setup`

Inicializa a configuração + espaço de trabalho (workspace).

Opções:

- `--workspace <diretório>`: caminho do espaço de trabalho do agente (padrão `~/zero`).
- `--wizard`: executa o assistente de integração.
- `--non-interactive`: executa o assistente sem prompts.
- `--mode <local|remote>`: modo do assistente.
- `--remote-url <url>`: URL do Gateway remoto.
- `--remote-token <token>`: token do Gateway remoto.

O assistente (wizard) é executado automaticamente quando qualquer flag do assistente está presente (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Assistente interativo para configurar gateway, espaço de trabalho e habilidades (skills).

Opções:

- `--workspace <dir>`
- `--reset` (reseta config + credenciais + sessões + workspace antes do assistente)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual é um alias para advanced)
- `--auth-choice <lista de opções de autenticação>`
- `--token-provider <id>` (não-interativo; usado com `--auth-choice token`)
- `--token <token>` (não-interativo; usado com `--auth-choice token`)
- `--token-profile-id <id>` (não-interativo; padrão: `<provider>:manual`)
- `--token-expires-in <duração>` (não-interativo; ex: `365d`, `12h`)
- `--anthropic-api-key <chave>`
- `--openai-api-key <chave>`
- `...` (outras chaves de API)
- `--gateway-port <porta>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <off|token|password>`
- `--gateway-token <token>`
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` (alias: `--skip-daemon`)
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>` (pnpm recomendado; bun não recomendado para a execução do Gateway)
- `--json`

### `configure`

Assistente de configuração interativo (modelos, canais, habilidades, gateway).

### `config`

Auxiliares de configuração não-interativos (get/set/unset). Executar `zero config` sem subcomando lança o assistente.

Subcomandos:

- `config get <caminho>`: imprime um valor de configuração (caminho ponto/colchetes).
- `config set <caminho> <valor>`: define um valor (JSON5 ou string pura).
- `config unset <caminho>`: remove um valor.

### `doctor`

Verificações de saúde (health checks) + correções rápidas (configuração + gateway + serviços legados).

Opções:

- `--no-workspace-suggestions`: desativa as dicas de memória do espaço de trabalho.
- `--yes`: aceita padrões sem perguntar (headless).
- `--non-interactive`: pula prompts; aplica apenas migrações seguras.
- `--deep`: escaneia serviços do sistema em busca de instalações extras de gateway.

## Auxiliares de Canal

### `channels`

Gerencia contas de canais de chat (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/MS Teams).

Subcomandos:

- `channels list`: mostra canais configurados e perfis de autenticação (sincronização de OAuth do Claude Code + Codex CLI inclusa).
- `channels status`: verifica a acessibilidade do gateway e a saúde do canal (`--probe` executa verificações extras; use `zero health` ou `zero status --deep` para sondagens de saúde do gateway).
- Dica: `channels status` imprime avisos com sugestões de correção quando detecta configurações incorretas comuns (e então aponta para o `zero doctor`).
- `channels logs`: mostra logs recentes de canais a partir do arquivo de log do gateway.
- `channels add`: assistente de configuração quando nenhuma flag é passada; flags mudam para o modo não-interativo.
- `channels remove`: desativa por padrão; passe `--delete` para remover entradas de configuração sem prompts.
- `channels login`: login interativo no canal (apenas WhatsApp Web).
- `channels logout`: faz logout de uma sessão de canal (se suportado).

Opções comuns:

- `--channel <nome>`: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`: id da conta do canal (padrão `default`)
- `--name <rótulo>`: nome de exibição da conta

Opções de `channels login`:

- `--channel <canal>` (padrão `whatsapp`; suporta `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

Opções de `channels logout`:

- `--channel <canal>` (padrão `whatsapp`)
- `--account <id>`

Opções de `channels list`:

- `--no-usage`: pula instantâneos de uso/cota do provedor de modelos (apenas com suporte de OAuth/API).
- `--json`: saída JSON (inclui uso a menos que `--no-usage` esteja definido).

Opções de `channels logs`:

- `--channel <nome|all>` (padrão `all`)
- `--lines <n>` (padrão `200`)
- `--json`

Fontes de sincronização OAuth:

- Claude Code → `anthropic:claude-cli`
  - macOS: Item do Keychain "Claude Code-credentials" (escolha "Sempre Permitir" para evitar prompts do launchd)
  - Linux/Windows: `~/.claude/.credentials.json`
- `~/.codex/auth.json` → `openai-codex:codex-cli`

Mais detalhes: [/concepts/oauth](/concepts/oauth)

Exemplos:

```bash
zero channels add --channel telegram --account alerts --name "Bot de Alertas" --token $TELEGRAM_BOT_TOKEN
zero channels add --channel discord --account trabalho --name "Bot de Trabalho" --token $DISCORD_BOT_TOKEN
zero channels remove --channel discord --account trabalho --delete
zero channels status --probe
zero status --deep
```

### `skills`

Lista e inspeciona habilidades disponíveis e informações de prontidão.

Subcomandos:

- `skills list`: lista habilidades (padrão quando não há subcomando).
- `skills info <nome>`: mostra detalhes de uma habilidade.
- `skills check`: resumo de requisitos prontos vs ausentes.

Opções:

- `--eligible`: mostra apenas habilidades prontas.
- `--json`: saída JSON (sem estilo).
- `-v`, `--verbose`: inclui detalhes dos requisitos ausentes.

Dica: use `npx zerohub` para pesquisar, instalar e sincronizar habilidades.

### `pairing`

Aprova solicitações de emparelhamento de DM entre canais.

Subcomandos:

- `pairing list <canal> [--json]`
- `pairing approve <canal> <code> [--notify]`

### `webhooks gmail`

Configuração de hook Pub/Sub do Gmail + executor (runner). Veja [/automation/gmail-pubsub](/automation/gmail-pubsub).

Subcomandos:

- `webhooks gmail setup` (exige `--account <email>`; suporta diversas flags de configuração)
- `webhooks gmail run` (substituições de tempo de execução para as mesmas flags)

### `dns setup`

Auxiliar de DNS para descoberta em área ampla (CoreDNS + Tailscale). Veja [/gateway/discovery](/gateway/discovery).

Opções:

- `--apply`: instala/atualiza a configuração do CoreDNS (exige sudo; apenas macOS).

## Mensagens + Agente

### `message`

Mensagens de saída unificadas + ações de canal.

Veja: [/cli/message](/cli/message)

Subcomandos:

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

Exemplos:

- `zero message send --target +15555550123 --message "Oi"`
- `zero message poll --channel discord --target channel:123 --poll-question "Lanche?" --poll-option Pizza --poll-option Sushi`

### `agent`

Executa um turno de agente via Gateway (ou `--local` embutido).

Exigido:

- `--message <texto>`

Opções:

- `--to <dest>` (para chave de sessão e entrega opcional)
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>` (apenas modelos GPT-5.2 + Codex)
- `--verbose <on|full|off>`
- `--channel <canal>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <segundos>`

### `agents`

Gerencia agentes isolados (espaços de trabalho + autenticação + roteamento).

#### `agents list`

Lista agentes configurados.

Opções:

- `--json`
- `--bindings`

#### `agents add [nome]`

Adiciona um novo agente isolado. Executa o assistente guiado a menos que flags (ou `--non-interactive`) sejam passadas; `--workspace` é obrigatório no modo não-interativo.

Opções:

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <canal[:accountId]>` (repetível)
- `--non-interactive`
- `--json`

As especificações de vínculo (binding) usam `canal[:accountId]`. Quando o `accountId` é omitido para o WhatsApp, o id da conta padrão é usado.

#### `agents delete <id>`

Deleta um agente e remove seu espaço de trabalho + estado.

Opções:

- `--force`
- `--json`

### `acp`

Executa a ponte ACP que conecta as IDEs ao Gateway.

Veja [`acp`](/cli/acp) para opções completas e exemplos.

### `status`

Mostra a saúde das sessões vinculadas e os destinatários recentes.

Opções:

- `--json`
- `--all` (diagnóstico completo; apenas leitura, colável)
- `--deep` (sonda canais)
- `--usage` (mostra o uso/cota do provedor de modelos)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias para `--verbose`)

Notas:

- A visão geral inclui o status do serviço de host do Gateway + nó quando disponível.

### Acompanhamento de uso (Usage tracking)

O ZERO pode apresentar o uso/cota do provedor quando as credenciais OAuth/API estão disponíveis.

Onde aparece:

- `/status` (adiciona uma linha curta de uso do provedor quando disponível)
- `zero status --usage` (imprime o detalhamento completo do provedor)
- Barra de menus do macOS (seção Uso sob Contexto)

Notas:

- Os dados vêm diretamente dos endpoints de uso do provedor (sem estimativas).
- Provedores: Anthropic, GitHub Copilot, OpenAI Codex OAuth, além de Gemini CLI/Google Cloud Auth quando esses plugins de provedor estão ativados.
- Se não existirem credenciais correspondentes, o uso é ocultado.
- Detalhes: veja [Acompanhamento de uso](/concepts/usage-tracking).

### `health`

Busca a saúde do Gateway em execução.

Opções:

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

Lista as sessões de conversa armazenadas.

Opções:

- `--json`
- `--verbose`
- `--store <caminho>`
- `--active <minutos>`

## Redefinir / Desinstalar (Reset / Uninstall)

### `reset`

Reseta a configuração/estado local (mantém a CLI instalada).

Opções:

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notas:

- `--non-interactive` exige `--scope` e `--yes`.

### `uninstall`

Desinstala o serviço do gateway + dados locais (a CLI permanece).

Opções:

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notas:

- `--non-interactive` exige `--yes` e escopos explícitos (ou `--all`).

## Gateway

### `gateway`

Executa o Gateway WebSocket.

Opções:

- diversos controles de rede, autenticação e depuração.

### `gateway service`

Gerencia o serviço do Gateway (launchd/systemd/schtasks).

Subcomandos:

- `gateway status` (sonda a RPC do Gateway por padrão)
- `gateway install` (instalação do serviço)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

### `logs`

Acompanha (tail) os logs de arquivo do Gateway via RPC.

Notas:

- Sessões TTY renderizam uma visão estruturada e colorida; sessões não-TTY recorrem a texto simples.
- `--json` emite JSON delimitado por linhas.

### `gateway <subcomando>`

Auxiliares da CLI do Gateway (use diversas flags para subcomandos RPC).

Subcomandos:

- `gateway call <método> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

## Modelos

Consulte [/concepts/models](/concepts/models) para comportamento de fallback e estratégia de varredura.

Autenticação preferencial da Anthropic (token CLI, não chave de API):

```bash
claude setup-token
zero models status
```

### `models` (raiz)

`zero models` é um alias para `models status`.

### `models list`

### `models status`

Inclui sempre a visão geral de autenticação e o status de expiração do OAuth para perfis no armazenamento de autenticação. `--probe` executa requisições ao vivo.

### `models set <modelo>`

### `models set-image <modelo>`

### `models aliases list|add|remove`

### `models fallbacks list|add|remove|clear`

### `models image-fallbacks list|add|remove|clear`

### `models scan`

### `models auth add|setup-token|paste-token`

### `models auth order get|set|clear`

## Sistema

### `system event`

Enfileira um evento de sistema e opcionalmente dispara um heartbeat (RPC do Gateway).

### `system heartbeat last|enable|disable`

Controles de heartbeat (RPC do Gateway).

### `system presence`

Lista entradas de presença do sistema (RPC do Gateway).

## Cron

Gerencia tarefas agendadas (RPC do Gateway). Veja [/automation/cron-jobs](/automation/cron-jobs).

Subcomandos:

- `cron status [--json]`
- `cron list`
- `cron add`
- `cron edit`
- `cron rm`
- `cron enable|disable`
- `cron runs`
- `cron run`

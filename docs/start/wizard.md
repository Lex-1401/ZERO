---
summary: "Assistente de integração da CLI: configuração guiada para gateway, espaço de trabalho, canais e habilidades"
read_when:
  - Executando ou configurando o assistente de integração
  - Configurando uma nova máquina
---

# Assistente de Integração (CLI)

O assistente de integração é a forma **recomendada** de configurar o ZERO no macOS,
Linux ou Windows (via WSL2; fortemente recomendado).
Ele configura um Gateway local ou uma conexão com um Gateway remoto, além de canais, habilidades
e padrões de espaço de trabalho em um único fluxo guiado.

Ponto de entrada principal:

```bash
zero onboard
```

Reconfiguração posterior:

```bash
zero configure
```

Recomendado: configure uma chave de API do Brave Search para que o agente possa usar `web_search`
(`web_fetch` funciona sem uma chave). Caminho mais fácil: `zero configure --section web`,
que armazena `tools.web.search.apiKey`. Documentação: [Ferramentas Web](/tools/web).

## Início Rápido vs Avançado

O assistente começa com o **Início Rápido** (padrões) vs **Avançado** (controle total).

O **Início Rápido** mantém os padrões:

- Gateway local (loopback)
- Espaço de trabalho padrão (ou existente)
- Porta do Gateway **18789**
- Autenticação do Gateway via **Token** (gerado automaticamente, mesmo em loopback)
- Exposição via Tailscale **Desativada**
- DMs do Telegram + WhatsApp padronizadas para **lista de permissões** (você será solicitado a fornecer seu número de telefone)

O **Avançado** expõe cada etapa (modo, espaço de trabalho, gateway, canais, daemon, habilidades).

## O que o assistente faz

O **Modo local (padrão)** guia você por:

- Modelo/Autenticação (OAuth de assinatura OpenAI Code (Codex), chave de API Anthropic (recomendado) ou setup-token (colar), além de opções MiniMax/GLM/Moonshot/AI Gateway)
- Localização do espaço de trabalho + arquivos de bootstrap
- Configurações do Gateway (porta/vínculo/autenticação/tailscale)
- Provedores (Telegram, WhatsApp, Discord, Google Chat, Mattermost (plugin), Signal)
- Instalação do Daemon (LaunchAgent / unidade de usuário systemd)
- Verificação de saúde
- Habilidades (recomendado)

O **Modo remoto** apenas configura o cliente local para se conectar a um Gateway em outro lugar.
Ele **não** instala nem altera nada no host remoto.

Para adicionar mais agentes isolados (espaço de trabalho + sessões + autenticação separados), use:

```bash
zero agents add <nome>
```

Dica: `--json` **não** implica modo não interativo. Use `--non-interactive` (e `--workspace`) para scripts.

## Detalhes do fluxo (local)

1) **Detecção de configuração existente**
   - Se `~/.zero/zero.json` existir, escolha **Manter / Modificar / Redefinir**.
   - Executar o assistente novamente **não** apaga nada, a menos que você escolha explicitamente **Redefinir**
     (ou passe `--reset`).
   - Se a configuração for inválida ou contiver chaves legadas, o assistente para e solicita
     que você execute `zero doctor` antes de continuar.
   - A redefinição usa `trash` (nunca `rm`) e oferece escopos:
     - Apenas configuração
     - Configuração + credenciais + sessões
     - Redefinição total (também remove o espaço de trabalho)

2) **Modelo/Autenticação**
   - **Chave de API Anthropic (recomendado)**: usa `ANTHROPIC_API_KEY`, se presente, ou solicita uma chave, salvando-a para uso do daemon.
   - **OAuth Anthropic (Claude Code CLI)**: no macOS, o assistente verifica o item do Keychain "Claude Code-credentials" (escolha "Sempre Permitir" para que as inicializações do launchd não sejam bloqueadas); no Linux/Windows, ele reutiliza `~/.claude/.credentials.json`, se presente.
   - **Token Anthropic (colar setup-token)**: execute `claude setup-token` em qualquer máquina e cole o token (você pode dar um nome a ele; em branco = padrão).
   - **Assinatura OpenAI Code (Codex) (Codex CLI)**: se `~/.codex/auth.json` existir, o assistente pode reutilizá-lo.
   - **Assinatura OpenAI Code (Codex) (OAuth)**: fluxo no navegador; cole o `code#state`.
     - Define `agents.defaults.model` como `openai-codex/gpt-5.2` quando o modelo não estiver definido ou for `openai/*`.
   - **Chave de API OpenAI**: usa `OPENAI_API_KEY`, se presente, ou solicita uma chave, salvando-a em `~/.zero/.env` para que o launchd possa lê-la.
   - **OpenCode Zen (proxy multimodelo)**: solicita `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`, obtenha em <https://opencode.ai/auth>).
   - **Chave de API**: armazena a chave para você.
   - **AI Gateway da Vercel (proxy multimodelo)**: solicita `AI_GATEWAY_API_KEY`.
   - Mais detalhes: [AI Gateway da Vercel](/providers/vercel-ai-gateway)
   - **MiniMax M2.1**: a configuração é gravada automaticamente.
   - Mais detalhes: [MiniMax](/providers/minimax)
   - **Synthetic (compatível com Anthropic)**: solicita `SYNTHETIC_API_KEY`.
   - Mais detalhes: [Synthetic](/providers/synthetic)
   - **Moonshot (Kimi K2)**: a configuração é gravada automaticamente.
   - **Kimi Code**: a configuração é gravada automaticamente.
   - Mais detalhes: [Moonshot AI (Kimi + Kimi Code)](/providers/moonshot)
   - **Pular**: nenhuma autenticação configurada ainda.
   - Escolha um modelo padrão das opções detectadas (ou insira provedor/modelo manualmente).
   - O assistente executa uma verificação do modelo e avisa se o modelo configurado for desconhecido ou se houver falta de autenticação.
   - Credenciais OAuth residem em `~/.zero/credentials/oauth.json`; perfis de autenticação residem em `~/.zero/agents/<agentId>/agent/auth-profiles.json` (Chaves de API + OAuth).
   - Mais detalhes: [/concepts/oauth](/concepts/oauth)

3) **Espaço de Trabalho**
   - Padrão `~/zero` (configurável).
   - Semeia os arquivos de espaço de trabalho necessários para o ritual de bootstrap do agente.
   - Layout completo do espaço de trabalho + guia de backup: [Espaço de trabalho do agente](/concepts/agent-workspace)

4) **Gateway**
   - Porta, vínculo (bind), modo de autenticação, exposição via Tailscale.
   - Recomendação de autenticação: mantenha **Token** mesmo para loopback para que clientes WS locais devam se autenticar.
   - Desative a autenticação apenas se você confiar totalmente em cada processo local.
   - Vínculos que não sejam de loopback ainda exigem autenticação.

5) **Canais**
   - WhatsApp: login opcional via QR.
   - Telegram: token do bot.
   - Discord: token do bot.
   - Google Chat: JSON da conta de serviço + audiência do webhook.
   - Mattermost (plugin): token do bot + URL base.
   - Signal: instalação opcional do `signal-cli` + configuração da conta.
   - iMessage: caminho local da CLI `imsg` + acesso ao banco de dados.
   - Segurança de DM: o padrão é pareamento (pairing). A primeira DM envia um código; aprove via `zero pairing approve <canal> <code>` ou use listas de permissões.

6) **Instalação do Daemon**
   - macOS: LaunchAgent
     - Requer uma sessão de usuário logado; para headless, use um LaunchDaemon personalizado (não fornecido).
   - Linux (e Windows via WSL2): unidade de usuário systemd
     - O assistente tenta habilitar a permanência via `loginctl enable-linger <usuário>` para que o Gateway permaneça ativo após o logout.
     - Pode solicitar sudo (grava em `/var/lib/systemd/linger`); tenta sem sudo primeiro.
   - **Seleção de Runtime**: Node (recomendado; necessário para WhatsApp/Telegram). Bun **não é recomendado**.

7) **Verificação de Saúde**
   - Inicia o Gateway (se necessário) e executa `zero health`.
   - Dica: `zero status --deep` adiciona verificações de saúde do gateway à saída do status (requer um gateway acessível).

8) **Habilidades (recomendado)**
   - Lê as habilidades disponíveis e verifica os requisitos.
   - Permite escolher um gerenciador de nós: **npm / pnpm** (bun não recomendado).
   - Instala dependências opcionais (algumas usam Homebrew no macOS).

9) **Finalização**
   - Resumo + próximos passos, incluindo aplicativos para iOS/Android/macOS para recursos extras.
   - Se nenhum GUI for detectado, o assistente imprime instruções de encaminhamento de porta SSH para a UI de Controle em vez de abrir um navegador.
   - Se os ativos da UI de Controle estiverem ausentes, o assistente tenta construí-los; o fallback é `pnpm ui:build` (instala as dependências da UI automaticamente).

## Modo Remoto

O modo remoto configura um cliente local para se conectar a um Gateway em outro lugar.

O que você configurará:

- URL do Gateway Remoto (`ws://...`)
- Token, se o Gateway remoto exigir autenticação (recomendado)

Notas:

- Nenhuma instalação remota ou alteração de daemon é realizada.
- Se o Gateway for apenas loopback, use tunelamento SSH ou uma tailnet.
- Dicas de descoberta:
  - macOS: Bonjour (`dns-sd`)
  - Linux: Avahi (`avahi-browse`)

## Adicionar outro agente

Use `zero agents add <nome>` para criar um agente separado com seu próprio espaço de trabalho,
sessões e perfis de autenticação. Executar sem `--workspace` inicia o assistente.

O que ele define:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Espaços de trabalho padrão seguem `~/zero-<agentId>`.
- Adicione `bindings` para rotear mensagens recebidas (o assistente pode fazer isso).
- Sinalizadores não interativos: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Modo não interativo

Use `--non-interactive` para automatizar ou criar scripts de integração:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Adicione `--json` para um resumo legível por máquina.

Exemplo Gemini:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Exemplo Z.AI:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice zai-api-key \
  --zai-api-key "$ZAI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Exemplo AI Gateway da Vercel:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Exemplo Moonshot:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice moonshot-api-key \
  --moonshot-api-key "$MOONSHOT_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Exemplo Synthetic:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice synthetic-api-key \
  --synthetic-api-key "$SYNTHETIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Exemplo OpenCode Zen:

```bash
zero onboard --non-interactive \
  --mode local \
  --auth-choice opencode-zen \
  --opencode-zen-api-key "$OPENCODE_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Exemplo de adição de agente (não interativo):

```bash
zero agents add work \
  --workspace ~/zero-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## RPC do assistente do Gateway

O Gateway expõe o fluxo do assistente via RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Clientes (app macOS, UI de Controle) podem renderizar etapas sem implementar novamente a lógica de integração.

## Configuração do Signal (signal-cli)

O assistente pode instalar o `signal-cli` a partir de lançamentos do GitHub:

- Baixa o ativo de lançamento apropriado.
- Armazena em `~/.zero/tools/signal-cli/<versão>/`.
- Grava `channels.signal.cliPath` em sua configuração.

Notas:

- Builds JVM requerem **Java 21**.
- Builds nativos são usados quando disponíveis.
- O Windows usa WSL2; a instalação do signal-cli segue o fluxo do Linux dentro do WSL.

## O que o assistente grava

Campos típicos em `~/.zero/zero.json`:

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (se Minimax for escolhido)
- `gateway.*` (modo, vínculo, autenticação, tailscale)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- Listas de permissões de canais (Slack/Discord/Matrix/Microsoft Teams) quando você opta por isso durante as solicitações (nomes resolvem para IDs quando possível).
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`zero agents add` grava `agents.list[]` e `bindings` opcionais.

As credenciais do WhatsApp ficam em `~/.zero/credentials/whatsapp/<accountId>/`.
As sessões são armazenadas em `~/.zero/agents/<agentId>/sessions/`.

Alguns canais são fornecidos como plugins. Quando você escolhe um durante a integração, o assistente
solicitará a instalação (npm ou um caminho local) antes que possa ser configurado.

## Documentos relacionados

- Integração do app macOS: [Integração](/start/onboarding)
- Referência de configuração: [Configuração do Gateway](/gateway/configuration)
- Provedores: [WhatsApp](/channels/whatsapp), [Telegram](/channels/telegram), [Discord](/channels/discord), [Google Chat](/channels/googlechat), [Signal](/channels/signal), [iMessage](/channels/imessage)
- Habilidades: [Habilidades](/tools/skills), [Configuração de Habilidades](/tools/skills-config)

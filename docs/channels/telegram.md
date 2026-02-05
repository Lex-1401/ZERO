---
summary: "Status de suporte do bot Telegram, capacidades e configuração"
read_when:
  - Trabalhando em recursos ou webhooks Telegram
---

# Telegram (Bot API)

Status: pronto para produção para DMs de bot + grupos via grammY. Long-polling por padrão; webhook opcional.

## Configuração rápida (iniciante)

1) Crie um bot com **@BotFather** e copie o token.
2) Defina o token:
   - Env: `TELEGRAM_BOT_TOKEN=...`
   - Ou config: `channels.telegram.botToken: "..."`.
   - Se ambos estiverem definidos, a config tem precedência (fallback de env é apenas para conta padrão).
3) Inicie o gateway.
4) O acesso via DM é pairing (emparelhamento) por padrão; aprove o código de emparelhamento no primeiro contato.

Configuração mínima:

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing"
    }
  }
}
```

## O que é

- Um canal Telegram Bot API de propriedade do Gateway.
- Roteamento determinístico: respostas voltam para o Telegram; o modelo nunca escolhe canais.
- DMs compartilham a sessão principal do agente; grupos permanecem isolados (`agent:<agentId>:telegram:group:<chatId>`).

## Configuração (caminho rápido)

### 1) Criar um token de bot (BotFather)

1) Abra o Telegram e converse com **@BotFather**.
2) Execute `/newbot`, depois siga as instruções (nome + nome de usuário terminando em `bot`).
3) Copie o token e guarde-o com segurança.

Configurações opcionais do BotFather:

- `/setjoingroups` — permitir/negar adicionar o bot a grupos.
- `/setprivacy` — controlar se o bot vê todas as mensagens do grupo.

### 2) Configurar o token (env ou config)

Exemplo:

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } }
    }
  }
}
```

Opção Env: `TELEGRAM_BOT_TOKEN=...` (funciona para a conta padrão).
Se ambos env e config estiverem definidos, a config tem precedência.

Suporte multi-conta: use `channels.telegram.accounts` com tokens por conta e `name` opcional. Veja [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) para o padrão compartilhado.

1) Inicie o gateway. O Telegram inicia quando um token é resolvido (config primeiro, fallback de env).
2) Acesso DM padroniza para pairing. Aprove o código quando o bot for contatado pela primeira vez.
3) Para grupos: adicione o bot, decida comportamento de privacidade/admin (abaixo), depois defina `channels.telegram.groups` para controlar bloqueio por menção + allowlists.

## Token + privacidade + permissões (lado Telegram)

### Criação de token (BotFather)

- `/newbot` cria o bot e retorna o token (mantenha-o secreto).
- Se um token vazar, revogue/regenere-o via @BotFather e atualize sua configuração.

### Visibilidade de mensagens de grupo (Privacy Mode)

Bots do Telegram padronizam para **Privacy Mode**, que limita quais mensagens de grupo eles recebem.
Se seu bot deve ver *todas* as mensagens de grupo, você tem duas opções:

- Desativar modo de privacidade com `/setprivacy` **ou**
- Adicionar o bot como um **admin** do grupo (bots admin recebem todas as mensagens).

**Nota:** Quando você alterna o modo de privacidade, o Telegram exige remover + readicionar o bot
a cada grupo para que a mudança tenha efeito.

### Permissões de grupo (direitos de admin)

Status de admin é definido dentro do grupo (UI do Telegram). Bots admin sempre recebem todas as
mensagens do grupo, então use admin se precisar de visibilidade total.

## Como funciona (comportamento)

- Mensagens de entrada são normalizadas no envelope de canal compartilhado com contexto de resposta e placeholders de mídia.
- Respostas de grupo requerem uma menção por padrão (nativo @menção ou `agents.list[].groupChat.mentionPatterns` / `messages.groupChat.mentionPatterns`).
- Sobrescrita multi-agente: defina padrões por agente em `agents.list[].groupChat.mentionPatterns`.
- Respostas sempre roteiam de volta para o mesmo chat Telegram.
- Long-polling usa grammY runner com sequenciamento por chat; concorrência geral é limitada por `agents.defaults.maxConcurrent`.
- Telegram Bot API não suporta recibos de leitura; não há opção `sendReadReceipts`.

## Formatação (Telegram HTML)

- Texto de saída do Telegram usa `parse_mode: "HTML"` (subconjunto de tags suportado pelo Telegram).
- Entrada estilo Markdown é renderizada em **HTML seguro para Telegram** (negrito/itálico/riscado/código/links); elementos de bloco são achatados para texto com novas linhas/marcadores.
- HTML bruto de modelos é escapado para evitar erros de parse do Telegram.
- Se o Telegram rejeitar o payload HTML, o ZERO tenta novamente a mesma mensagem como texto puro.

## Comandos (nativos + personalizados)

O ZERO registra comandos nativos (como `/status`, `/reset`, `/model`) no menu de bot do Telegram na inicialização.
Você pode adicionar comandos personalizados ao menu via configuração:

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Backup Git" },
        { command: "generate", description: "Criar uma imagem" }
      ]
    }
  }
}
```

## Solução de problemas

- `setMyCommands failed` nos logs geralmente significa que HTTPS/DNS de saída está bloqueado para `api.telegram.org`.
- Se você ver falhas de `sendMessage` ou `sendChatAction`, verifique roteamento IPv6 e DNS.

Mais ajuda: [Solução de problemas de canal](/channels/troubleshooting).

Notas:

- Comandos personalizados são **apenas entradas de menu**; ZERO não os implementa a menos que você lide com eles em outro lugar.
- Nomes de comando são normalizados (barra `/` inicial removida, minúsculo) e devem corresponder a `a-z`, `0-9`, `_` (1–32 chars).
- Comandos personalizados **não podem sobrescrever comandos nativos**. Conflitos são ignorados e logados.
- Se `commands.native` estiver desativado, apenas comandos personalizados são registrados (ou limpos se nenhum).

## Limites

- Texto de saída é fragmentado para `channels.telegram.textChunkLimit` (padrão 4000).
- Fragmentação por nova linha opcional: defina `channels.telegram.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- Downloads/uploads de mídia são limitados por `channels.telegram.mediaMaxMb` (padrão 5).
- Requisições Telegram Bot API expiram após `channels.telegram.timeoutSeconds` (padrão 500 via grammY). Defina menor para evitar bloqueios longos.
- Contexto de histórico básico usa `channels.telegram.historyLimit` (ou `channels.telegram.accounts.*.historyLimit`), revertendo para `messages.groupChat.historyLimit`. Defina `0` para desativar (padrão 50).
- Histórico DM pode ser limitado com `channels.telegram.dmHistoryLimit` (turnos de usuário). Sobrescritas por usuário: `channels.telegram.dms["<user_id>"].historyLimit`.

## Modos de ativação de grupo

Por padrão, o bot só responde a menções em grupos (`@nomebot` ou padrões em `agents.list[].groupChat.mentionPatterns`). Para mudar este comportamento:

### Via configuração (recomendado)

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": { requireMention: false }  // sempre responder neste grupo
      }
    }
  }
}
```

**Importante:** Definir `channels.telegram.groups` cria uma **allowlist** - apenas grupos listados (ou `"*"`) serão aceitos.
Tópicos de fórum herdam a configuração do grupo pai (allowFrom, requireMention, skills, prompts) a menos que você adicione sobrescritas por tópico sob `channels.telegram.groups.<groupId>.topics.<topicId>`.

Para permitir todos os grupos com always-respond:

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false }  // todos os grupos, sempre responder
      }
    }
  }
}
```

Para manter apenas menção para todos os grupos (comportamento padrão):

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: true }  // ou omitir groups inteiramente
      }
    }
  }
}
```

### Via comando (nível de sessão)

Envie no grupo:

- `/activation always` - responder a todas as mensagens
- `/activation mention` - exigir menções (padrão)

**Nota:** Comandos atualizam apenas o estado da sessão. Para comportamento persistente através de reinicializações, use configuração.

### Obtendo o ID de chat do grupo

Encaminhe qualquer mensagem do grupo para `@userinfobot` ou `@getidsbot` no Telegram para ver o ID do chat (número negativo como `-1001234567890`).

**Dica:** Para seu próprio ID de usuário, mande DM para o bot e ele responderá com seu ID de usuário (mensagem de emparelhamento), ou use `/whoami` assim que comandos estiverem ativados.

**Nota de privacidade:** `@userinfobot` é um bot de terceiros. Se preferir, adicione o bot ao grupo, envie uma mensagem, e use `zero logs --follow` para ler `chat.id`, ou use o Bot API `getUpdates`.

## Gravações de configuração

Por padrão, o Telegram tem permissão para gravar atualizações de configuração acionadas por eventos de canal ou `/config set|unset`.

Isso acontece quando:

- Um grupo é atualizado para supergrupo e o Telegram emite `migrate_to_chat_id` (ID do chat muda). O ZERO pode migrar `channels.telegram.groups` automaticamente.
- Você executa `/config set` ou `/config unset` em um chat Telegram (requer `commands.config: true`).

Desative com:

```json5
{
  channels: { telegram: { configWrites: false } }
}
```

## Tópicos (supergrupos fórum)

Tópicos de fórum Telegram incluem um `message_thread_id` por mensagem. ZERO:

- Anexa `:topic:<threadId>` à chave de sessão de grupo Telegram para que cada tópico seja isolado.
- Envia indicadores de digitação e respostas com `message_thread_id` para que respostas fiquem no tópico.
- Tópico Geral (thread id `1`) é especial: envios de mensagem omitem `message_thread_id` (Telegram rejeita), mas indicadores de digitação ainda o incluem.
- Expõe `MessageThreadId` + `IsForum` no contexto de template para roteamento/templating.
- Configuração específica de tópico está disponível sob `channels.telegram.groups.<chatId>.topics.<threadId>` (skills, allowlists, auto-reply, system prompts, disable).
- Configurações de tópico herdam configurações de grupo (requireMention, allowlists, skills, prompts, enabled) a menos que sobrescritas por tópico.

Chats privados podem incluir `message_thread_id` em alguns casos extremos. ZERO mantém a chave de sessão DM inalterada, mas ainda usa o thread id para respostas/streaming de rascunho quando está presente.

## Botões Inline

Telegram suporta teclados inline com botões de callback.

```json5
{
  "channels": {
    "telegram": {
      "capabilities": {
        "inlineButtons": "allowlist"
      }
    }
  }
}
```

Para configuração por conta:

```json5
{
  "channels": {
    "telegram": {
      "accounts": {
        "main": {
          "capabilities": {
            "inlineButtons": "allowlist"
          }
        }
      }
    }
  }
}
```

Escopos:

- `off` — botões inline desativados
- `dm` — apenas DMs (alvos de grupo bloqueados)
- `group` — apenas grupos (alvos de DM bloqueados)
- `all` — DMs + grupos
- `allowlist` — DMs + grupos, mas apenas remetentes permitidos por `allowFrom`/`groupAllowFrom` (mesmas regras que comandos de controle)

Padrão: `allowlist`.
Legado: `capabilities: ["inlineButtons"]` = `inlineButtons: "all"`.

### Enviando botões

Use a ferramenta de mensagem com o parâmetro `buttons`:

```json5
{
  "action": "send",
  "channel": "telegram",
  "to": "123456789",
  "message": "Escolha uma opção:",
  "buttons": [
    [
      {"text": "Sim", "callback_data": "yes"},
      {"text": "Não", "callback_data": "no"}
    ],
    [
      {"text": "Cancelar", "callback_data": "cancel"}
    ]
  ]
}
```

Quando um usuário clica em um botão, os dados do callback são enviados de volta ao agente como uma mensagem com o formato:
`callback_data: valor`

### Opções de configuração

Capacidades do Telegram podem ser configuradas em dois níveis (forma de objeto mostrada acima; arrays de string legados ainda suportados):

- `channels.telegram.capabilities`: Config de capacidade padrão global aplicada a todas as contas Telegram a menos que sobrescrita.
- `channels.telegram.accounts.<account>.capabilities`: Capacidades por conta que sobrescrevem os padrões globais para essa conta específica.

Use a configuração global quando todos os bots/contas Telegram devem se comportar da mesma maneira. Use configuração por conta quando bots diferentes precisam de comportamentos diferentes (por exemplo, uma conta lida apenas com DMs enquanto outra é permitida em grupos).

## Controle de acesso (DMs + grupos)

### Acesso DM

- Padrão: `channels.telegram.dmPolicy = "pairing"`. Remetentes desconhecidos recebem um código de emparelhamento; mensagens são ignoradas até serem aprovadas (códigos expiram após 1 hora).
- Aprove via:
  - `zero pairing list telegram`
  - `zero pairing approve telegram <CODIGO>`
- Emparelhamento é a troca de token padrão usada para DMs Telegram. Detalhes: [Emparelhamento](/start/pairing)
- `channels.telegram.allowFrom` aceita IDs de usuário numéricos (recomendado) ou entradas `@username`. Não é o nome de usuário do bot; use o ID do remetente humano. O assistente aceita `@username` e o resolve para o ID numérico quando possível.

#### Encontrando seu ID de usuário Telegram

Mais seguro (sem bot de terceiros):

1) Inicie o gateway e mande DM para seu bot.
2) Execute `zero logs --follow` e procure por `from.id`.

Alternativo (Bot API oficial):

1) Mande DM para seu bot.
2) Busque atualizações com seu token de bot e leia `message.from.id`:

   ```bash
   curl "https://api.telegram.org/bot<bot_token>/getUpdates"
   ```

Terceiros (menos privado):

- Mande DM para `@userinfobot` ou `@getidsbot` e use o user id retornado.

### Acesso de grupo

Dois controles independentes:

**1. Quais grupos são permitidos** (allowlist de grupo via `channels.telegram.groups`):

- Sem config `groups` = todos os grupos permitidos
- Com config `groups` = apenas grupos listados ou `"*"` são permitidos
- Exemplo: `"groups": { "-1001234567890": {}, "*": {} }` permite todos os grupos

**2. Quais remetentes são permitidos** (filtragem de remetente via `channels.telegram.groupPolicy`):

- `"open"` = todos os remetentes em grupos permitidos podem enviar mensagem
- `"allowlist"` = apenas remetentes em `channels.telegram.groupAllowFrom` podem enviar mensagem
- `"disabled"` = nenhuma mensagem de grupo aceita de forma alguma
Padrão é `groupPolicy: "allowlist"` (bloqueado a menos que você adicione `groupAllowFrom`).

A maioria dos usuários quer: `groupPolicy: "allowlist"` + `groupAllowFrom` + grupos específicos listados em `channels.telegram.groups`

## Long-polling vs webhook

- Padrão: long-polling (sem URL pública necessária).
- Modo Webhook: defina `channels.telegram.webhookUrl` (opcionalmente `channels.telegram.webhookSecret` + `channels.telegram.webhookPath`).
  - O ouvinte local vincula a `0.0.0.0:8787` e serve `POST /telegram-webhook` por padrão.
  - Se sua URL pública for diferente, use um proxy reverso e aponte `channels.telegram.webhookUrl` para o endpoint público.

## Encadeamento de resposta (Threading)

Telegram suporta respostas encadeadas opcionais via tags:

- `[[reply_to_current]]` -- responder à mensagem de gatilho.
- `[[reply_to:<id>]]` -- responder a um id de mensagem específico.

Controlado por `channels.telegram.replyToMode`:

- `first` (padrão), `all`, `off`.

## Mensagens de áudio (voz vs arquivo)

O Telegram distingue **notas de voz** (balão redondo) de **arquivos de áudio** (cartão de metadados).
O ZERO padroniza para arquivos de áudio para compatibilidade retroativa.

Para forçar um balão de nota de voz em respostas do agente, inclua esta tag em qualquer lugar na resposta:

- `[[audio_as_voice]]` — enviar áudio como uma nota de voz em vez de um arquivo.

A tag é removida do texto entregue. Outros canais ignoram esta tag.

Para envios de ferramenta de mensagem, defina `asVoice: true` com uma URL de `media` de áudio compatível com voz
(`message` é opcional quando mídia está presente):

```json5
{
  "action": "send",
  "channel": "telegram",
  "to": "123456789",
  "media": "https://exemplo.com/voz.ogg",
  "asVoice": true
}
```

## Streaming (rascunhos)

O Telegram pode fazer stream de **balões de rascunho** enquanto o agente está gerando uma resposta.
O ZERO usa Bot API `sendMessageDraft` (não mensagens reais) e depois envia a
resposta final como uma mensagem normal.

Requisitos (Telegram Bot API 9.3+):

- **Chats privados com tópicos habilitados** (modo de tópico de fórum para o bot).
- Mensagens de entrada devem incluir `message_thread_id` (thread de tópico privado).
- Streaming é ignorado para grupos/supergrupos/canais.

Config:

- `channels.telegram.streamMode: "off" | "partial" | "block"` (padrão: `partial`)
  - `partial`: atualiza o balão de rascunho com o texto de streaming mais recente.
  - `block`: atualiza o balão de rascunho em blocos maiores (fragmentado).
  - `off`: desativa streaming de rascunho.
- Opcional (apenas para `streamMode: "block"`):
  - `channels.telegram.draftChunk: { minChars?, maxChars?, breakPreference? }`
    - padrões: `minChars: 200`, `maxChars: 800`, `breakPreference: "paragraph"` (limitado a `channels.telegram.textChunkLimit`).

Nota: streaming de rascunho é separado de **streaming de bloco** (mensagens de canal).
Streaming de bloco está desligado por padrão e requer `channels.telegram.blockStreaming: true`
se você quiser mensagens Telegram antecipadas em vez de atualizações de rascunho.

Reasoning stream (apenas Telegram):

- `/reasoning stream` faz stream de raciocínio no balão de rascunho enquanto a resposta está
  gerando, depois envia a resposta final sem raciocínio.
- Se `channels.telegram.streamMode` for `off`, reasoning stream é desativado.
Mais contexto: [Streaming + chunking](/concepts/streaming).

## Política de repetição

Chamadas de saída da API Telegram tentam novamente em erros transientes de rede/429 com backoff exponencial e jitter. Configure via `channels.telegram.retry`. Veja [Política de repetição](/concepts/retry).

## Ferramenta de agente (mensagens + reações)

- Ferramenta: `telegram` com ação `sendMessage` (`to`, `content`, opcional `mediaUrl`, `replyToMessageId`, `messageThreadId`).
- Ferramenta: `telegram` com ação `react` (`chatId`, `messageId`, `emoji`).
- Ferramenta: `telegram` com ação `deleteMessage` (`chatId`, `messageId`).
- Semântica de remoção de reação: veja [/tools/reactions](/tools/reactions).
- Bloqueio por ferramenta: `channels.telegram.actions.reactions`, `channels.telegram.actions.sendMessage`, `channels.telegram.actions.deleteMessage` (padrão: enabled).

## Notificações de reação

**Como reações funcionam:**
Reações do Telegram chegam como **eventos `message_reaction` separados**, não como propriedades em payloads de mensagem. Quando um usuário adiciona uma reação, o ZERO:

1. Recebe a atualização `message_reaction` da API Telegram
2. Converte para um **evento de sistema** com formato: `"Telegram reaction added: {emoji} by {user} on msg {id}"`
3. Enfileira o evento de sistema usando a **mesma chave de sessão** das mensagens regulares
4. Quando a próxima mensagem chega nessa conversa, eventos de sistema são drenados e anexados ao início do contexto do agente

O agente vê reações como **notificações de sistema** no histórico da conversa, não como metadados de mensagem.

**Configuração:**

- `channels.telegram.reactionNotifications`: Controla quais reações acionam notificações
  - `"off"` — ignora todas as reações
  - `"own"` — notifica quando usuários reagem a mensagens do bot (melhor esforço; em memória) (padrão)
  - `"all"` — notifica para todas as reações

- `channels.telegram.reactionLevel`: Controla capacidade de reação do agente
  - `"off"` — agente não pode reagir a mensagens
  - `"ack"` — bot envia reações de reconhecimento (👀 enquanto processa) (padrão)
  - `"minimal"` — agente pode reagir com moderação (diretriz: 1 por 5-10 trocas)
  - `"extensive"` — agente pode reagir liberalmente quando apropriado

**Grupos de fórum:** Reações em grupos de fórum incluem `message_thread_id` e usam chaves de sessão como `agent:main:telegram:group:{chatId}:topic:{threadId}`. Isso garante que reações e mensagens no mesmo tópico fiquem juntas.

**Exemplo de config:**

```json5
{
  channels: {
    telegram: {
      reactionNotifications: "all",  // Ver todas as reações
      reactionLevel: "minimal"        // Agente pode reagir com moderação
    }
  }
}
```

**Requisitos:**

- Bots Telegram devem solicitar explicitamente `message_reaction` em `allowed_updates` (configurado automaticamente pelo ZERO)
- Para modo webhook, reações são incluídas no `allowed_updates` do webhook
- Para modo polling, reações são incluídas no `allowed_updates` do `getUpdates`

## Alvos de entrega (CLI/cron)

- Use um chat id (`123456789`) ou um nome de usuário (`@nome`) como o alvo.
- Exemplo: `zero message send --channel telegram --target 123456789 --message "oi"`.

## Solução de problemas

**Bot não responde a mensagens sem menção em um grupo:**

- Se você definiu `channels.telegram.groups.*.requireMention=false`, o **modo de privacidade** da Bot API do Telegram deve estar desativado.
  - BotFather: `/setprivacy` → **Disable** (depois remova + re-adicione o bot ao grupo)
- `zero channels status` mostra um aviso quando a config espera mensagens de grupo não mencionadas.
- `zero channels status --probe` pode adicionalmente checar associação para IDs de grupo numéricos explícitos (não consegue auditar regras curinga `"*"`).
- Teste rápido: `/activation always` (apenas sessão; use config para persistência)

**Bot não vendo mensagens de grupo de forma alguma:**

- Se `channels.telegram.groups` está definido, o grupo deve estar listado ou usar `"*"`
- Verifique Configurações de Privacidade no @BotFather → "Group Privacy" deve estar **OFF**
- Verifique se o bot é realmente um membro (não apenas um admin sem acesso de leitura)
- Verifique logs do gateway: `zero logs --follow` (procure por "skipping group message")

**Bot responde a menções mas não a `/activation always`:**

- O comando `/activation` atualiza estado de sessão mas não persiste na config
- Para comportamento persistente, adicione o grupo a `channels.telegram.groups` com `requireMention: false`

**Comandos como `/status` não funcionam:**

- Certifique-se que seu ID de usuário Telegram está autorizado (via emparelhamento ou `channels.telegram.allowFrom`)
- Comandos exigem autorização mesmo em grupos com `groupPolicy: "open"`

**Long-polling aborta imediatamente no Node 22+ (frequentemente com proxies/fetch personalizado):**

- Node 22+ é mais estrito sobre instâncias `AbortSignal`; sinais estranhos podem abortar chamadas `fetch` imediatamente.
- Atualize para uma build ZERO que normaliza sinais de abort, ou rode o gateway no Node 20 até poder atualizar.

**Bot inicia, depois para de responder silenciosamente (ou loga `HttpError: Network request ... failed`):**

- Alguns hosts resolvem `api.telegram.org` para IPv6 primeiro. Se seu servidor não tem saída IPv6 funcional, o grammY pode ficar preso em requisições apenas IPv6.
- Corrija ativando saída IPv6 **ou** forçando resolução IPv4 para `api.telegram.org` (por exemplo, adicione uma entrada `/etc/hosts` usando o registro A IPv4, ou prefira IPv4 na sua pilha DNS do OS), depois reinicie o gateway.
- Cheque rápido: `dig +short api.telegram.org A` e `dig +short api.telegram.org AAAA` para confirmar o que o DNS retorna.

## Referência de configuração (Telegram)

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.telegram.enabled`: ativar/desativar inicialização do canal.
- `channels.telegram.botToken`: token de bot (BotFather).
- `channels.telegram.tokenFile`: ler token de caminho de arquivo.
- `channels.telegram.dmPolicy`: `pairing | allowlist | open | disabled` (padrão: pairing).
- `channels.telegram.allowFrom`: allowlist de DM (ids/usernames). `open` requer `"*"`.
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (padrão: allowlist).
- `channels.telegram.groupAllowFrom`: allowlist de remetente de grupo (ids/usernames).
- `channels.telegram.groups`: padrões por grupo + allowlist (use `"*"` para padrões globais).
  - `channels.telegram.groups.<id>.requireMention`: padrão de bloqueio por menção.
  - `channels.telegram.groups.<id>.skills`: filtro de habilidade (omitir = todas as skills, vazio = nenhuma).
  - `channels.telegram.groups.<id>.allowFrom`: sobrescrita de allowlist de remetente por grupo.
  - `channels.telegram.groups.<id>.systemPrompt`: prompt de sistema extra para o grupo.
  - `channels.telegram.groups.<id>.enabled`: desativar o grupo quando `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: sobrescritas por tópico (mesmos campos que grupo).
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: sobrescrita de bloqueio por menção por tópico.
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist` (padrão: allowlist).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`: sobrescrita por conta.
- `channels.telegram.replyToMode`: `off | first | all` (padrão: `first`).
- `channels.telegram.textChunkLimit`: tamanho de fragmento de saída (chars).
- `channels.telegram.chunkMode`: `length` (padrão) ou `newline` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- `channels.telegram.linkPreview`: alternar prévias de link para mensagens de saída (padrão: true).
- `channels.telegram.streamMode`: `off | partial | block` (streaming de rascunho).
- `channels.telegram.mediaMaxMb`: limite de mídia de entrada/saída (MB).
- `channels.telegram.retry`: política de repetição para chamadas de saída API Telegram (tentativas, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.proxy`: URL de proxy para chamadas Bot API (SOCKS/HTTP).
- `channels.telegram.webhookUrl`: ativar modo webhook.
- `channels.telegram.webhookSecret`: segredo de webhook (opcional).
- `channels.telegram.webhookPath`: caminho de webhook local (padrão `/telegram-webhook`).
- `channels.telegram.actions.reactions`: bloquear reações de ferramenta Telegram.
- `channels.telegram.actions.sendMessage`: bloquear envios de mensagem de ferramenta Telegram.
- `channels.telegram.actions.deleteMessage`: bloquear deletes de mensagem de ferramenta Telegram.
- `channels.telegram.reactionNotifications`: `off | own | all` — controlar quais reações acionam eventos de sistema (padrão: `own` quando não definido).
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — controlar capacidade de reação do agente (padrão: `minimal` quando não definido).

Opções globais relacionadas:

- `agents.list[].groupChat.mentionPatterns` (padrões de bloqueio por menção).
- `messages.groupChat.mentionPatterns` (fallback global).
- `commands.native` (padroniza para `"auto"` → ligado para Telegram/Discord, desligado para Slack), `commands.text`, `commands.useAccessGroups` (comportamento de comando). Sobrescreva com `channels.telegram.commands.native`.
- `messages.responsePrefix`, `messages.ackReaction`, `messages.ackReactionScope`, `messages.removeAckAfterReply`.

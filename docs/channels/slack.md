---
summary: "Configuração Slack para modo socket ou webhook HTTP"
read_when: "Configurando Slack ou depurando modo socket/HTTP Slack"
---

# Slack

## Modo Socket (padrão)

### Configuração rápida (iniciante)

1) Crie um Slack app e ative **Socket Mode**.
2) Crie um **App Token** (`xapp-...`) e **Bot Token** (`xoxb-...`).
3) Defina tokens para o ZERO e inicie o gateway.

Configuração mínima:

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-..."
    }
  }
}
```

### Configuração

1) Crie um Slack app (From scratch) em <https://api.slack.com/apps>.
2) **Socket Mode** → ative. Depois vá para **Basic Information** → **App-Level Tokens** → **Generate Token and Scopes** com escopo `connections:write`. Copie o **App Token** (`xapp-...`).
3) **OAuth & Permissions** → adicione escopos de token de bot (use o manifesto abaixo). Clique em **Install to Workspace**. Copie o **Bot User OAuth Token** (`xoxb-...`).
4) Opcional: **OAuth & Permissions** → adicione **User Token Scopes** (veja a lista somente leitura abaixo). Reinstale o app e copie o **User OAuth Token** (`xoxp-...`).
5) **Event Subscriptions** → ative eventos e inscreva-se em:
   - `message.*` (inclui edições/deletes/transmissões em thread)
   - `app_mention`
   - `reaction_added`, `reaction_removed`
   - `member_joined_channel`, `member_left_channel`
   - `channel_rename`
   - `pin_added`, `pin_removed`
6) Convide o bot para canais que você quer que ele leia.
7) Slash Commands → crie `/zero` se você usa `channels.slack.slashCommand`. Se você ativar comandos nativos, adicione um slash command por comando integrado (mesmos nomes que `/help`). Nativos padronizam para desligado no Slack a menos que você defina `channels.slack.commands.native: true` (global `commands.native` é `"auto"` o que deixa Slack desligado).
8) App Home → ative **Messages Tab** para que usuários possam enviar DM para o bot.

Use o manifesto abaixo para que escopos e eventos fiquem sincronizados.

Suporte multi-conta: use `channels.slack.accounts` com tokens por conta e `name` opcional. Veja [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) para o padrão compartilhado.

### Configuração ZERO (mínima)

Defina tokens via vars de env (recomendado):

- `SLACK_APP_TOKEN=xapp-...`
- `SLACK_BOT_TOKEN=xoxb-...`

Ou via configuração:

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-..."
    }
  }
}
```

### Token de usuário (opcional)

O ZERO pode usar um token de usuário Slack (`xoxp-...`) para operações de leitura (histórico, pins, reações, emoji, info de membro). Por padrão isso permanece somente leitura: leituras preferem o token de usuário quando presente, e escritas ainda usam o token de bot a menos que você opte explicitamente. Mesmo com `userTokenReadOnly: false`, o token de bot permanece preferido para escritas quando está disponível.

Tokens de usuário são configurados no arquivo de configuração (sem suporte a var de env). Para multi-conta, defina `channels.slack.accounts.<id>.userToken`.

Exemplo com tokens bot + app + user:

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
      userToken: "xoxp-..."
    }
  }
}
```

Exemplo com userTokenReadOnly explicitamente definido (permite escritas com token de usuário):

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
      userToken: "xoxp-...",
      userTokenReadOnly: false
    }
  }
}
```

#### Uso de token

- Operações de leitura (histórico, lista de reações, lista de pins, lista de emoji, info de membro, busca) preferem o token de usuário quando configurado, caso contrário o token de bot.
- Operações de escrita (enviar/editar/deletar mensagens, adicionar/remover reações, pin/unpin, uploads de arquivo) usam o token de bot por padrão. Se `userTokenReadOnly: false` e nenhum token de bot estiver disponível, ZERO recorre ao token de usuário.

### Contexto histórico

- `channels.slack.historyLimit` (ou `channels.slack.accounts.*.historyLimit`) controla quantas mensagens recentes de canal/grupo são incluídas no prompt.
- Fallback para `messages.groupChat.historyLimit`. Defina `0` para desativar (padrão 50).

## Modo HTTP (Events API)

Use modo webhook HTTP quando seu Gateway está alcançável pelo Slack sobre HTTPS (típico para implantações em servidor).
Modo HTTP usa Events API + Interactivity + Slash Commands com uma request URL compartilhada.

### Configuração

1) Crie um Slack app e **desative Socket Mode** (opcional se você só usa HTTP).
2) **Basic Information** → copie o **Signing Secret**.
3) **OAuth & Permissions** → instale o app e copie o **Bot User OAuth Token** (`xoxb-...`).
4) **Event Subscriptions** → ative eventos e defina a **Request URL** para o caminho de webhook do seu gateway (padrão `/slack/events`).
5) **Interactivity & Shortcuts** → ative e defina a mesma **Request URL**.
6) **Slash Commands** → defina a mesma **Request URL** para seu(s) comando(s).

Exemplo request URL:
`https://gateway-host/slack/events`

### Configuração ZERO (mínima)

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "seu-signing-secret",
      webhookPath: "/slack/events"
    }
  }
}
```

Modo HTTP multi-conta: defina `channels.slack.accounts.<id>.mode = "http"` e forneça um `webhookPath` único por conta para que cada app Slack possa apontar para sua própria URL.

### Manifesto (opcional)

Use este manifesto de app Slack para criar o app rapidamente (ajuste o nome/comando se quiser). Inclua os escopos de usuário se planeja configurar um token de usuário.

```json
{
  "display_information": {
    "name": "ZERO",
    "description": "Slack connector for ZERO"
  },
  "features": {
    "bot_user": {
      "display_name": "ZERO",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/zero",
        "description": "Send a message to ZERO",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "groups:write",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ],
      "user": [
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "users:read",
        "reactions:read",
        "pins:read",
        "emoji:read",
        "search:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

Se você ativar comandos nativos, adicione uma entrada `slash_commands` por comando que deseja expor (combinando com a lista `/help`). Sobrescreva com `channels.slack.commands.native`.

## Escopos (atual vs opcional)

A Conversations API do Slack é escopada por tipo: você só precisa dos escopos para os tipos de conversa que você realmente toca (channels, groups, im, mpim). Veja <https://docs.slack.dev/apis/web-api/using-the-conversations-api/> para a visão geral.

### Bot token scopes (obrigatório)

- `chat:write` (enviar/atualizar/deletar mensagens via `chat.postMessage`)
  <https://docs.slack.dev/reference/methods/chat.postMessage>
- `im:write` (abrir DMs via `conversations.open` para DMs de usuário)
  <https://docs.slack.dev/reference/methods/conversations.open>
- `channels:history`, `groups:history`, `im:history`, `mpim:history`
  <https://docs.slack.dev/reference/methods/conversations.history>
- `channels:read`, `groups:read`, `im:read`, `mpim:read`
  <https://docs.slack.dev/reference/methods/conversations.info>
- `users:read` (busca de usuário)
  <https://docs.slack.dev/reference/methods/users.info>
- `reactions:read`, `reactions:write` (`reactions.get` / `reactions.add`)
  <https://docs.slack.dev/reference/methods/reactions.get>
  <https://docs.slack.dev/reference/methods/reactions.add>
- `pins:read`, `pins:write` (`pins.list` / `pins.add` / `pins.remove`)
  <https://docs.slack.dev/reference/scopes/pins.read>
  <https://docs.slack.dev/reference/scopes/pins.write>
- `emoji:read` (`emoji.list`)
  <https://docs.slack.dev/reference/scopes/emoji.read>
- `files:write` (uploads via `files.uploadV2`)
  <https://docs.slack.dev/messaging/working-with-files/#upload>

### User token scopes (opcional, read-only por padrão)

Adicione estes sob **User Token Scopes** se você configurar `channels.slack.userToken`.

- `channels:history`, `groups:history`, `im:history`, `mpim:history`
- `channels:read`, `groups:read`, `im:read`, `mpim:read`
- `users:read`
- `reactions:read`
- `pins:read`
- `emoji:read`
- `search:read`

### Não necessário hoje (mas provável futuro)

- `mpim:write` (apenas se adicionarmos abrir DM de grupo/iniciar DM via `conversations.open`)
- `groups:write` (apenas se adicionarmos gerenciamento de canal privado: criar/renomear/convidar/arquivar)
- `chat:write.public` (apenas se quisermos postar em canais onde o bot não está)
  <https://docs.slack.dev/reference/scopes/chat.write.public>
- `users:read.email` (apenas se precisarmos de campos de email de `users.info`)
  <https://docs.slack.dev/changelog/2017-04-narrowing-email-access>
- `files:read` (apenas se começarmos a listar/ler metadados de arquivo)

## Configuração

Slack usa Socket Mode apenas (sem servidor webhook HTTP). Forneça ambos os tokens:

```json
{
  "slack": {
    "enabled": true,
    "botToken": "xoxb-...",
    "appToken": "xapp-...",
    "groupPolicy": "allowlist",
    "dm": {
      "enabled": true,
      "policy": "pairing",
      "allowFrom": ["U123", "U456", "*"],
      "groupEnabled": false,
      "groupChannels": ["G123"],
      "replyToMode": "all"
    },
    "channels": {
      "C123": { "allow": true, "requireMention": true },
      "#general": {
        "allow": true,
        "requireMention": true,
        "users": ["U123"],
        "skills": ["search", "docs"],
        "systemPrompt": "Keep answers short."
      }
    },
    "reactionNotifications": "own",
    "reactionAllowlist": ["U123"],
    "replyToMode": "off",
    "actions": {
      "reactions": true,
      "messages": true,
      "pins": true,
      "memberInfo": true,
      "emojiList": true
    },
    "slashCommand": {
      "enabled": true,
      "name": "zero",
      "sessionPrefix": "slack:slash",
      "ephemeral": true
    },
    "textChunkLimit": 4000,
    "mediaMaxMb": 20
  }
}
```

Tokens também podem ser fornecidos via vars de env:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Reações de reconhecimento (ack) são controladas globalmente via `messages.ackReaction` +
`messages.ackReactionScope`. Use `messages.removeAckAfterReply` para limpar a
reação de ack depois que o bot responde.

## Limites

- Texto de saída é fragmentado para `channels.slack.textChunkLimit` (padrão 4000).
- Fragmentação por nova linha opcional: defina `channels.slack.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- Uploads de mídia são limitados por `channels.slack.mediaMaxMb` (padrão 20).

## Encadeamento de resposta (Threading)

Por padrão, o ZERO responde no canal principal. Use `channels.slack.replyToMode` para controlar encadeamento automático:

| Modo | Comportamento |
| :--- | :--- |
| `off` | **Padrão.** Responde no canal principal. Apenas encadeia se a mensagem de gatilho já estava em uma thread. |
| `first` | Primeira resposta vai para a thread (sob a mensagem de gatilho), respostas subsequentes vão para o canal principal. Útil para manter contexto visível evitando poluição da thread. |
| `all` | Todas as respostas vão para a thread. Mantém conversas contidas mas pode reduzir visibilidade. |

O modo se aplica a auto-respostas e chamadas de ferramenta de agente (`slack sendMessage`).

### Encadeamento por tipo de chat

Você pode configurar comportamento de encadeamento diferente por tipo de chat definindo `channels.slack.replyToModeByChatType`:

```json5
{
  channels: {
    slack: {
      replyToMode: "off",        // padrão para canais
      replyToModeByChatType: {
        direct: "all",           // DMs sempre thread
        group: "first"           // DMs de grupo/MPIM thread primeira resposta
      },
    }
  }
}
```

Tipos de chat suportados:

- `direct`: 1:1 DMs (Slack `im`)
- `group`: DMs de grupo / MPIMs (Slack `mpim`)
- `channel`: canais padrão (público/privado)

Precedência:

1) `replyToModeByChatType.<chatType>`
2) `replyToMode`
3) Padrão do provedor (`off`)

Legado `channels.slack.dm.replyToMode` ainda é aceito como fallback para `direct` quando nenhuma sobrescrita por tipo de chat está definida.

Exemplos:

Thread apenas DMs:

```json5
{
  channels: {
    slack: {
      replyToMode: "off",
      replyToModeByChatType: { direct: "all" }
    }
  }
}
```

Thread DMs de grupo mas mantenha canais na raiz:

```json5
{
  channels: {
    slack: {
      replyToMode: "off",
      replyToModeByChatType: { group: "first" }
    }
  }
}
```

Faça canais thread, mantenha DMs na raiz:

```json5
{
  channels: {
    slack: {
      replyToMode: "first",
      replyToModeByChatType: { direct: "off", group: "off" }
    }
  }
}
```

### Tags de encadeamento manual

Para controle refinado, use estas tags em respostas do agente:

- `[[reply_to_current]]` — responde à mensagem de gatilho (inicia/continua thread).
- `[[reply_to:<id>]]` — responde a um id de mensagem específico.

## Sessões + roteamento

- DMs compartilham a sessão `main` (como WhatsApp/Telegram).
- Canais mapeiam para sessões `agent:<agentId>:slack:channel:<channelId>`.
- Slash commands usam sessões `agent:<agentId>:slack:slash:<userId>` (prefixo configurável via `channels.slack.slashCommand.sessionPrefix`).
- Se o Slack não fornecer `channel_type`, o ZERO infere do prefixo do ID do canal (`D`, `C`, `G`) e padroniza para `channel` para manter chaves de sessão estáveis.
- Registro de comando nativo usa `commands.native` (padrão global `"auto"` → Slack off) e pode ser sobrescrito por workspace com `channels.slack.commands.native`. Comandos de texto requerem mensagens `/...` autônomas e podem ser desativados com `commands.text: false`. Slack slash commands são gerenciados no app Slack e não são removidos automaticamente. Use `commands.useAccessGroups: false` para ignorar verificações de grupos de acesso para comandos.
- Lista completa de comandos + config: [Slash commands](/tools/slash-commands)

## Segurança de DM (emparelhamento)

- Padrão: `channels.slack.dm.policy="pairing"` — remetentes DM desconhecidos recebem um código de emparelhamento (expira após 1 hora).
- Aprove via: `zero pairing approve slack <codigo>`.
- Para permitir qualquer um: defina `channels.slack.dm.policy="open"` e `channels.slack.dm.allowFrom=["*"]`.
- `channels.slack.dm.allowFrom` aceita IDs de usuário, @handles, ou emails (resolvidos na inicialização quando tokens permitem). O assistente aceita nomes de usuário e os resolve para ids durante setup quando tokens permitem.

## Política de grupo

- `channels.slack.groupPolicy` controla tratamento de canal (`open|disabled|allowlist`).
- `allowlist` requer que canais sejam listados em `channels.slack.channels`.
- Se você definir apenas `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` e nunca criar uma seção `channels.slack`,
   o runtime padroniza `groupPolicy` para `open`. Adicione `channels.slack.groupPolicy`,
   `channels.defaults.groupPolicy`, ou uma allowlist de canal para trancar.
- O assistente de configuração aceita nomes `#channel` e os resolve para IDs quando possível
   (público + privado); se múltiplas correspondências existirem, prefere o canal ativo.
- Na inicialização, o ZERO resolve nomes de canal/usuário em allowlists para IDs (quando tokens permitem)
   e loga o mapeamento; entradas não resolvidas são mantidas como digitadas.
- Para permitir **nenhum canal**, defina `channels.slack.groupPolicy: "disabled"` (ou mantenha uma allowlist vazia).

Opções de canal (`channels.slack.channels.<id>` ou `channels.slack.channels.<name>`):

- `allow`: permitir/negar o canal quando `groupPolicy="allowlist"`.
- `requireMention`: menção obrigatória para o canal.
- `allowBots`: permitir mensagens de autoria de bot neste canal (padrão: false).
- `users`: allowlist de usuário por canal opcional.
- `skills`: filtro de habilidade (omitir = todas as skills, vazio = nenhuma).
- `systemPrompt`: prompt de sistema extra para o canal (combinado com tópico/propósito).
- `enabled`: defina `false` para desativar o canal.

## Alvos de entrega

Use estes com cron/CLI sends:

- `user:<id>` para DMs
- `channel:<id>` para canais

## Ações de ferramenta

Ações de ferramenta Slack podem ser bloqueadas com `channels.slack.actions.*`:

| Grupo de ação | Padrão | Notas |
| :--- | :--- | :--- |
| reactions | enabled | Reagir + listar reações |
| messages | enabled | Ler/enviar/editar/deletar |
| pins | enabled | Pin/unpin/listar |
| memberInfo | enabled | Info de membro |
| emojiList | enabled | Lista de emoji personalizado |

## Notas de segurança

- Escritas padronizam para o token de bot para que ações de mudança de estado permaneçam escopadas às permissões e identidade de bot do app.
- Definir `userTokenReadOnly: false` permite que o token de usuário seja usado para operações de escrita quando um token de bot está indisponível, o que significa que ações rodam com o acesso do usuário instalador. Trate o token de usuário como altamente privilegiado e mantenha portões de ação e allowlists apertados.
- Se você ativar escritas com token de usuário, certifique-se que o token de usuário inclui os escopos de escrita que você espera (`chat:write`, `reactions:write`, `pins:write`, `files:write`) ou essas operações falharão.

## Notas

- Bloqueio por menção é controlado via `channels.slack.channels` (defina `requireMention` para `true`); `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`) também contam como menções.
- Sobrescrita multi-agente: defina padrões por agente em `agents.list[].groupChat.mentionPatterns`.
- Notificações de reação seguem `channels.slack.reactionNotifications` (use `reactionAllowlist` com modo `allowlist`).
- Mensagens de autoria de bot são ignoradas por padrão; ative via `channels.slack.allowBots` ou `channels.slack.channels.<id>.allowBots`.
- Aviso: Se você permitir respostas a outros bots (`channels.slack.allowBots=true` ou `channels.slack.channels.<id>.allowBots=true`), previna loops de resposta bot-para-bot com `requireMention`, allowlists `channels.slack.channels.<id>.users`, e/ou guardrails claros em `AGENTS.md` e `SOUL.md`.
- Para a ferramenta Slack, semântica de remoção de reação está em [/tools/reactions](/tools/reactions).
- Anexos são baixados para o armazenamento de mídia quando permitido e sob o limite de tamanho.

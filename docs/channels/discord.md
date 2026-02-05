---
summary: "Status de suporte do bot Discord, capacidades e configuração"
read_when:
  - Trabalhando em recursos do canal Discord
---

# Discord (Bot API)

Status: pronto para DM e canais de texto de guilda via gateway oficial de bot do Discord.

## Configuração rápida (iniciante)

1) Crie um bot Discord e copie o token do bot.
2) Defina o token para o ZERO:
   - Env: `DISCORD_BOT_TOKEN=...`
   - Ou config: `channels.discord.token: "..."`.
   - Se ambos estiverem definidos, a config tem precedência (fallback de env é apenas para conta padrão).
3) Convide o bot para seu servidor com permissões de mensagem.
4) Inicie o gateway.
5) O acesso via DM é pairing (emparelhamento) por padrão; aprove o código de emparelhamento no primeiro contato.

Configuração mínima:

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "SEU_BOT_TOKEN"
    }
  }
}
```

## Objetivos

- Converse com o ZERO via DMs do Discord ou canais de guilda.
- Chats diretos colapsam na sessão principal do agente (padrão `agent:main:main`); canais de guilda permanecem isolados como `agent:<agentId>:discord:channel:<channelId>` (nomes de exibição usam `discord:<guildSlug>#<channelSlug>`).
- DMs de grupo são ignoradas por padrão; ative via `channels.discord.dm.groupEnabled` e opcionalmente restrinja por `channels.discord.dm.groupChannels`.
- Mantenha o roteamento determinístico: respostas sempre voltam para o canal onde chegaram.

## Como funciona

1. Crie uma aplicação Discord → Bot, ative os intents que você precisa (DMs + mensagens de guilda + conteúdo de mensagem), e pegue o token do bot.
2. Convide o bot para seu servidor com as permissões necessárias para ler/enviar mensagens onde você quer usá-lo.
3. Configure o ZERO com `channels.discord.token` (ou `DISCORD_BOT_TOKEN` como um fallback).
4. Execute o gateway; ele inicia automaticamente o canal Discord quando um token está disponível (config primeiro, fallback de env) e `channels.discord.enabled` não é `false`.
   - Se preferir vars de ambiente, defina `DISCORD_BOT_TOKEN` (um bloco de configuração é opcional).
5. Chats diretos: use `user:<id>` (ou uma menção `<@id>`) ao entregar; todos os turnos caem na sessão compartilhada `main`. IDs numéricos puros são ambíguos e rejeitados.
6. Canais de guilda: use `channel:<channelId>` para entrega. Menções são obrigatórias por padrão e podem ser definidas por guilda ou por canal.
7. Chats diretos: seguros por padrão via `channels.discord.dm.policy` (padrão: `"pairing"`). Remetentes desconhecidos recebem um código de emparelhamento (expira após 1 hora); aprove via `zero pairing approve discord <code>`.
   - Para manter o comportamento antigo "aberto para qualquer um": defina `channels.discord.dm.policy="open"` e `channels.discord.dm.allowFrom=["*"]`.
   - Para hard-allowlist: defina `channels.discord.dm.policy="allowlist"` e liste remetentes em `channels.discord.dm.allowFrom`.
   - Para ignorar todas as DMs: defina `channels.discord.dm.enabled=false` ou `channels.discord.dm.policy="disabled"`.
8. DMs de grupo são ignoradas por padrão; ative via `channels.discord.dm.groupEnabled` e opcionalmente restrinja por `channels.discord.dm.groupChannels`.
9. Regras de guilda opcionais: defina `channels.discord.guilds` indexado por ID de guilda (preferido) ou slug, com regras por canal.
10. Comandos nativos opcionais: `commands.native` padroniza para `"auto"` (ligado para Discord/Telegram, desligado para Slack). Sobrescreva com `channels.discord.commands.native: true|false|"auto"`; `false` limpa comandos previamente registrados. Comandos de texto são controlados por `commands.text` e devem ser enviados como mensagens `/...` isoladas. Use `commands.useAccessGroups: false` para ignorar verificação de grupos de acesso para comandos.
    - Lista completa de comandos + config: [Slash commands](/tools/slash-commands)
11. Histórico de contexto de guilda opcional: defina `channels.discord.historyLimit` (padrão 20, fallback para `messages.groupChat.historyLimit`) para incluir as últimas N mensagens de guilda como contexto ao responder a uma menção. Defina `0` para desativar.
12. Reações: o agente pode disparar reações via ferramenta `discord` (controlado por `channels.discord.actions.*`).
    - Semântica de remoção de reação: veja [/tools/reactions](/tools/reactions).
    - A ferramenta `discord` é exposta apenas quando o canal atual é Discord.
13. Comandos nativos usam chaves de sessão isoladas (`agent:<agentId>:discord:slash:<userId>`) em vez da sessão compartilhada `main`.

Nota: Resolução Nome → id usa busca de membros de guilda e requer Server Members Intent; se o bot não puder buscar membros, use ids ou menções `<@id>`.
Nota: Slugs são minúsculos com espaços substituídos por `-`. Nomes de canais são transformados em slug sem o `#` inicial.
Nota: Linhas de contexto de guilda `[from:]` incluem `author.tag` + `id` para facilitar respostas prontas para ping.

## Gravações de configuração

Por padrão, o Discord tem permissão para gravar atualizações de configuração acionadas por `/config set|unset` (requer `commands.config: true`).

Desative com:

```json5
{
  channels: { discord: { configWrites: false } }
}
```

## Como criar seu próprio bot

Esta é a configuração do "Discord Developer Portal" para rodar o ZERO em um canal de servidor (guilda) como `#help`.

### 1) Criar o app Discord + usuário bot

1. Discord Developer Portal → **Applications** → **New Application**
2. No seu app:
   - **Bot** → **Add Bot**
   - Copie o **Bot Token** (isso é o que você coloca em `DISCORD_BOT_TOKEN`)

### 2) Ativar os intents de gateway que o ZERO precisa

O Discord bloqueia "privileged intents" a menos que você os ative explicitamente.

Em **Bot** → **Privileged Gateway Intents**, ative:

- **Message Content Intent** (obrigatório para ler texto de mensagem na maioria das guildas; sem ele você verá "Used disallowed intents" ou o bot conectará mas não reagirá a mensagens)
- **Server Members Intent** (recomendado; necessário para algumas buscas de membro/usuário e correspondência de allowlist em guildas)

Você geralmente **não** precisa de **Presence Intent**.

### 3) Gerar uma URL de convite (OAuth2 URL Generator)

No seu app: **OAuth2** → **URL Generator**

**Scopes**

- ✅ `bot`
- ✅ `applications.commands` (necessário para comandos nativos)

**Bot Permissions** (baseline mínimo)

- ✅ View Channels
- ✅ Send Messages
- ✅ Read Message History
- ✅ Embed Links
- ✅ Attach Files
- ✅ Add Reactions (opcional mas recomendado)
- ✅ Use External Emojis / Stickers (opcional; apenas se você quiser eles)

Evite **Administrator** a menos que esteja depurando e confie totalmente no bot.

Copie a URL gerada, abra-a, escolha seu servidor e instale o bot.

### 4) Obter os IDs (guild/usuário/canal)

O Discord usa IDs numéricos em todo lugar; a configuração do ZERO prefere IDs.

1. Discord (desktop/web) → **User Settings** → **Advanced** → ative **Developer Mode**
2. Clique com botão direito:
   - Nome do servidor → **Copy Server ID** (guild id)
   - Canal (ex. `#help`) → **Copy Channel ID**
   - Seu usuário → **Copy User ID**

### 5) Configurar ZERO

#### Token

Defina o token do bot via env var (recomendado em servidores):

- `DISCORD_BOT_TOKEN=...`

Ou via configuração:

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "SEU_BOT_TOKEN"
    }
  }
}
```

Suporte multi-conta: use `channels.discord.accounts` com tokens por conta e `name` opcional. Veja [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) para o padrão compartilhado.

#### Allowlist + roteamento de canal

Exemplo "servidor único, permitir apenas eu, permitir apenas #help":

```json5
{
  channels: {
    discord: {
      enabled: true,
      dm: { enabled: false },
      guilds: {
        "SEU_GUILD_ID": {
          users: ["SEU_USER_ID"],
          requireMention: true,
          channels: {
            help: { allow: true, requireMention: true }
          }
        }
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

Notas:

- `requireMention: true` significa que o bot só responde quando mencionado (recomendado para canais compartilhados).
- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`) também contam como menções para mensagens de guilda.
- Sobrescrita multi-agente: defina padrões por agente em `agents.list[].groupChat.mentionPatterns`.
- Se `channels` estiver presente, qualquer canal não listado é negado por padrão.
- Use uma entrada de canal `"*"` para aplicar padrões em todos os canais; entradas de canal explícitas sobrescrevem o curinga (wildcard).
- Threads herdam a configuração do canal pai (allowlist, `requireMention`, skills, prompts, etc.) a menos que você adicione o ID do canal da thread explicitamente.
- Mensagens de autoria de bot são ignoradas por padrão; defina `channels.discord.allowBots=true` para permiti-las (mensagens próprias permanecem filtradas).
- Aviso: Se você permitir respostas a outros bots (`channels.discord.allowBots=true`), previna loops de resposta bot-para-bot com `requireMention`, allowlists `channels.discord.guilds.*.channels.<id>.users`, e/ou guardrails claros em `AGENTS.md` e `SOUL.md`.

### 6) Verificar se funciona

1. Inicie o gateway.
2. No seu canal de servidor, envie: `@Krill olá` (ou seja lá qual for o nome do seu bot).
3. Se nada acontecer: verifique **Solução de problemas** abaixo.

### Solução de problemas

- Primeiro: execute `zero doctor` e `zero channels status --probe` (avisos acionáveis + auditorias rápidas).
- **“Used disallowed intents”**: ative **Message Content Intent** (e provavelmente **Server Members Intent**) no Developer Portal, depois reinicie o gateway.
- **Bot conecta mas nunca responde em um canal de guilda**:
  - Faltando **Message Content Intent**, ou
  - O bot não tem permissões de canal (View/Send/Read History), ou
  - Sua configuração requer menções e você não o mencionou, ou
  - Sua allowlist de guilda/canal nega o canal/usuário.
- **`requireMention: false` mas ainda sem respostas**:
- `channels.discord.groupPolicy` padroniza para **allowlist**; defina para `"open"` ou adicione uma entrada de guilda sob `channels.discord.guilds` (opcionalmente liste canais sob `channels.discord.guilds.<id>.channels` para restringir).
  - Se você define apenas `DISCORD_BOT_TOKEN` e nunca cria uma seção `channels.discord`, o runtime
    padroniza `groupPolicy` para `open`. Adicione `channels.discord.groupPolicy`,
    `channels.defaults.groupPolicy`, ou uma allowlist de guilda/canal para trancar.
- `requireMention` deve viver sob `channels.discord.guilds` (ou um canal específico). `channels.discord.requireMention` no nível superior é ignorado.
- **Auditorias de permissão** (`channels status --probe`) checam apenas IDs de canal numéricos. Se você usar slugs/nomes como chaves `channels.discord.guilds.*.channels`, a auditoria não consegue verificar permissões.
- **DMs não funcionam**: `channels.discord.dm.enabled=false`, `channels.discord.dm.policy="disabled"`, ou você ainda não foi aprovado (`channels.discord.dm.policy="pairing"`).

## Capacidades e limites

- DMs e canais de texto de guilda (threads são tratadas como canais separados; voz não suportada).
- Indicadores de digitação enviados no melhor esforço; fragmentação de mensagem usa `channels.discord.textChunkLimit` (padrão 2000) e divide respostas longas por contagem de linha (`channels.discord.maxLinesPerMessage`, padrão 17).
- Fragmentação por nova linha opcional: defina `channels.discord.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- Uploads de arquivo suportados até o `channels.discord.mediaMaxMb` configurado (padrão 8 MB).
- Respostas de guilda bloqueadas por menção por padrão para evitar bots barulhentos.
- Contexto de resposta é injetado quando uma mensagem referencia outra mensagem (conteúdo citado + ids).
- Encadeamento de resposta nativo está **desligado por padrão**; ative com `channels.discord.replyToMode` e tags de resposta.

## Política de repetição

Chamadas de saída da API Discord tentam novamente em limites de taxa (429) usando `retry_after` do Discord quando disponível, com backoff exponencial e jitter. Configure via `channels.discord.retry`. Veja [Política de repetição](/concepts/retry).

## Configuração

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "abc.123",
      groupPolicy: "allowlist",
      guilds: {
        "*": {
          channels: {
            general: { allow: true }
          }
        }
      },
      mediaMaxMb: 8,
      actions: {
        reactions: true,
        stickers: true,
        emojiUploads: true,
        stickerUploads: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        channels: true,
        voiceStatus: true,
        events: true,
        moderation: false
      },
      replyToMode: "off",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["123456789012345678", "steipete"],
        groupEnabled: false,
        groupChannels: ["zero-dm"]
      },
      guilds: {
        "*": { requireMention: true },
        "123456789012345678": {
          slug: "friends-of-zero",
          requireMention: false,
          reactionNotifications: "own",
          users: ["987654321098765432", "steipete"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["search", "docs"],
              systemPrompt: "Keep answers short."
            }
          }
        }
      }
    }
  }
}
```

Reações de reconhecimento (ack) são controladas globalmente via `messages.ackReaction` +
`messages.ackReactionScope`. Use `messages.removeAckAfterReply` para limpar a
reação de ack depois que o bot responde.

- `dm.enabled`: defina `false` para ignorar todas as DMs (padrão `true`).
- `dm.policy`: controle de acesso de DM (`pairing` recomendado). `"open"` requer `dm.allowFrom=["*"]`.
- `dm.allowFrom`: allowlist de DM (user ids ou nomes). Usado por `dm.policy="allowlist"` e para validação `dm.policy="open"`. O assistente aceita nomes de usuário e os resolve para ids quando o bot pode buscar membros.
- `dm.groupEnabled`: habilitar DMs de grupo (padrão `false`).
- `dm.groupChannels`: allowlist opcional para ids ou slugs de canais DM de grupo.
- `groupPolicy`: controla tratamento de canal de guilda (`open|disabled|allowlist`); `allowlist` requer allowlists de canal.
- `guilds`: regras por guilda indexadas por id de guilda (preferido) ou slug.
- `guilds."*"`: configurações padrão por guilda aplicadas quando nenhuma entrada explícita existe.
- `guilds.<id>.slug`: slug amigável opcional usado para nomes de exibição.
- `guilds.<id>.users`: allowlist de usuário por guilda opcional (ids ou nomes).
- `guilds.<id>.channels.<channel>.allow`: permitir/negar o canal quando `groupPolicy="allowlist"`.
- `guilds.<id>.channels.<channel>.requireMention`: bloqueio por menção para o canal.
- `guilds.<id>.channels.<channel>.users`: allowlist de usuário por canal opcional.
- `guilds.<id>.channels.<channel>.skills`: filtro de habilidade (omitir = todas as skills, vazio = nenhuma).
- `guilds.<id>.channels.<channel>.systemPrompt`: prompt de sistema extra para o canal (combinado com tópico do canal).
- `guilds.<id>.channels.<channel>.enabled`: define `false` para desabilitar o canal.
- `guilds.<id>.channels`: regras de canal (chaves são slugs de canal ou ids).
- `guilds.<id>.requireMention`: requisito de menção por guilda (sobrescrito por canal).
- `guilds.<id>.reactionNotifications`: modo de evento de reação do sistema (`off`, `own`, `all`, `allowlist`).
- `textChunkLimit`: tamanho do fragmento de texto de saída (chars). Padrão: 2000.
- `chunkMode`: `length` (padrão) divide apenas ao exceder `textChunkLimit`; `newline` divide em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- `maxLinesPerMessage`: contagem de linha máxima suave por mensagem. Padrão: 17.
- `mediaMaxMb`: limitar mídia de entrada salva em disco.
- `historyLimit`: número de mensagens de guilda recentes para incluir como contexto ao responder a uma menção (padrão 20; fallback para `messages.groupChat.historyLimit`; `0` desabilita).
- `dmHistoryLimit`: limite de histórico DM em turnos de usuário. Sobrescritas por usuário: `dms["<user_id>"].historyLimit`.
- `retry`: política de repetição para chamadas de API Discord de saída (tentativas, minDelayMs, maxDelayMs, jitter).
- `actions`: bloqueios por ferramenta; omitir para permitir todas (defina `false` para desabilitar).
  - `reactions` (cobre reagir + ler reações)
  - `stickers`, `emojiUploads`, `stickerUploads`, `polls`, `permissions`, `messages`, `threads`, `pins`, `search`
  - `memberInfo`, `roleInfo`, `channelInfo`, `voiceStatus`, `events`
  - `channels` (criar/editar/deletar canais + categorias + permissões)
  - `roles` (adicionar/remover cargo, padrão `false`)
  - `moderation` (timeout/kick/ban, padrão `false`)

Notificações de reação usam `guilds.<id>.reactionNotifications`:

- `off`: sem eventos de reação.
- `own`: reações nas próprias mensagens do bot (padrão).
- `all`: todas as reações em todas as mensagens.
- `allowlist`: reações de `guilds.<id>.users` em todas as mensagens (lista vazia desabilita).

### Padrões de ação de ferramenta

| Action group | Default | Notes |
| :--- | :--- | :--- |
| reactions | enabled | React + list reactions + emojiList |
| stickers | enabled | Send stickers |
| emojiUploads | enabled | Upload emojis |
| stickerUploads | enabled | Upload stickers |
| polls | enabled | Create polls |
| permissions | enabled | Channel permission snapshot |
| messages | enabled | Read/send/edit/delete |
| threads | enabled | Create/list/reply |
| pins | enabled | Pin/unpin/list |
| search | enabled | Message search (recurso de prévia) |
| memberInfo | enabled | Member info |
| roleInfo | enabled | Role list |
| channelInfo | enabled | Channel info + list |
| channels | enabled | Channel/category management |
| voiceStatus | enabled | Voice state lookup |
| events | enabled | List/create scheduled events |
| roles | disabled | Role add/remove |
| moderation | disabled | Timeout/kick/ban |

- `replyToMode`: `off` (padrão), `first`, ou `all`. Aplica-se apenas quando o modelo inclui uma tag de resposta.

## Tags de resposta

Para solicitar uma resposta encadeada (threaded), o modelo pode incluir uma tag em sua saída:

- `[[reply_to_current]]` — responder à mensagem do Discord que acionou.
- `[[reply_to:<id>]]` — responder a um id de mensagem específico do contexto/histórico.
IDs de mensagem atuais são anexados aos prompts como `[message_id: …]`; entradas de histórico já incluem ids.

O comportamento é controlado por `channels.discord.replyToMode`:

- `off`: ignorar tags.
- `first`: apenas o primeiro fragmento/anexo de saída é uma resposta.
- `all`: cada fragmento/anexo de saída é uma resposta.

Notas de correspondência de allowlist:

- `allowFrom`/`users`/`groupChannels` aceitam ids, nomes, tags ou menções como `<@id>`.
- Prefixos como `discord:`/`user:` (usuários) e `channel:` (DMs de grupo) são suportados.
- Use `*` para permitir qualquer remetente/canal.
- Quando `guilds.<id>.channels` está presente, canais não listados são negados por padrão.
- Quando `guilds.<id>.channels` é omitido, todos os canais na guilda da allowlist são permitidos.
- Para permitir **nenhum canal**, defina `channels.discord.groupPolicy: "disabled"` (ou mantenha uma allowlist vazia).
- O assistente de configuração aceita nomes de `Guilda/Canal` (público + privado) e os resolve para IDs quando possível.
- Na inicialização, o ZERO resolve nomes de canal/usuário em allowlists para IDs (quando o bot pode buscar membros)
  e loga o mapeamento; entradas não resolvidas são mantidas como digitadas.

Notas de comando nativo:

- Os comandos registrados espelham os comandos de chat do ZERO.
- Comandos nativos honram as mesmas allowlists de DMs/mensagens de guilda (`channels.discord.dm.allowFrom`, `channels.discord.guilds`, regras por canal).
- Slash commands ainda podem ser visíveis na UI do Discord para usuários que não estão na allowlist; o ZERO reforça allowlists na execução e responde "not authorized".

## Ações de ferramenta

O agente pode chamar `discord` com ações como:

- `react` / `reactions` (adicionar ou listar reações)
- `sticker`, `poll`, `permissions`
- `readMessages`, `sendMessage`, `editMessage`, `deleteMessage`
- Payloads de leitura/busca/pin de ferramenta incluem `timestampMs` normalizado (UTC epoch ms) e `timestampUtc` junto com o `timestamp` bruto do Discord.
- `threadCreate`, `threadList`, `threadReply`
- `pinMessage`, `unpinMessage`, `listPins`
- `searchMessages`, `memberInfo`, `roleInfo`, `roleAdd`, `roleRemove`, `emojiList`
- `channelInfo`, `channelList`, `voiceStatus`, `eventList`, `eventCreate`
- `timeout`, `kick`, `ban`

IDs de mensagem do Discord são exibidos no contexto injetado (`[discord message id: …]` e linhas de histórico) para que o agente possa direcioná-los.
Emoji pode ser unicode (ex., `✅`) ou sintaxe de emoji personalizada como `<:party_blob:1234567890>`.

## Segurança e operações

- Trate o token do bot como uma senha; prefira a var de ambiente `DISCORD_BOT_TOKEN` em hosts supervisionados ou tranque as permissões do arquivo de configuração.
- Conceda ao bot apenas as permissões que ele precisa (tipicamente Read/Send Messages).
- Se o bot estiver travado ou com limite de taxa, reinicie o gateway (`zero gateway --force`) após confirmar que nenhum outro processo possui a sessão Discord.

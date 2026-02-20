---
summary: "Referência CLI para `zero message` (send + ações de canal)"
read_when:
  - Adicionando ou modificando ações CLI de mensagem
  - Mudando comportamento de canal de saída
---

# `zero message`

Comando de saída único para enviar mensagens e ações de canal
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/MS Teams).

## Uso

```
zero message <subcommand> [flags]
```

Seleção de canal:

- `--channel` obrigatório se mais de um canal estiver configurado.
- Se exatamente um canal estiver configurado, ele se torna o padrão.
- Valores: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` (Mattermost requer plugin)

Formatos de alvo (`--target`):

- WhatsApp: E.164 ou JID de grupo
- Telegram: id de chat ou `@username`
- Discord: `channel:<id>` ou `user:<id>` (ou `@id` menção; ids numéricos brutos são tratados como canais)
- Google Chat: `spaces/<spaceId>` ou `users/<userId>`
- Slack: `channel:<id>` ou `user:<id>` (id de canal bruto é aceito)
- Mattermost (plugin): `channel:<id>`, `user:<id>`, ou `@username` (ids puros são tratados como canais)
- Signal: `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, ou `username:<name>`/`u:<name>`
- iMessage: handle, `chat_id:<id>`, `chat_guid:<guid>`, ou `chat_identifier:<id>`
- MS Teams: id de conversa (`19:...@thread.tacv2`) ou `conversation:<id>` ou `user:<aad-object-id>`

Busca de nome:

- Para provedores suportados (Discord/Slack/etc), nomes de canal como `Help` ou `#help` são resolvidos via cache de diretório.
- No miss de cache, ZERO tentará uma busca de diretório ao vivo quando o provedor suportar.

## Flags comuns

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (canal alvo ou usuário para send/poll/read/etc)
- `--targets <name>` (repetir; apenas transmissão)
- `--json`
- `--dry-run`
- `--verbose`

## Ações

### Core

- `send`
  - Canais: WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/MS Teams
  - Obrigatório: `--target`, mais `--message` ou `--media`
  - Opcional: `--media`, `--reply-to`, `--thread-id`, `--gif-playback`
  - Telegram apenas: `--buttons` (requer `channels.telegram.capabilities.inlineButtons` para permitir)
  - Telegram apenas: `--thread-id` (id de tópico de fórum)
  - Slack apenas: `--thread-id` (thread timestamp; `--reply-to` usa o mesmo campo)
  - WhatsApp apenas: `--gif-playback`

- `poll`
  - Canais: WhatsApp/Discord/MS Teams
  - Obrigatório: `--target`, `--poll-question`, `--poll-option` (repetir)
  - Opcional: `--poll-multi`
  - Discord apenas: `--poll-duration-hours`, `--message`

- `react`
  - Canais: Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - Obrigatório: `--message-id`, `--target`
  - Opcional: `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Nota: `--remove` requer `--emoji` (omita `--emoji` para limpar reações próprias onde suportado; veja /tools/reactions)
  - WhatsApp apenas: `--participant`, `--from-me`
  - Reações de grupo Signal: `--target-author` ou `--target-author-uuid` obrigatórios

- `reactions`
  - Canais: Discord/Google Chat/Slack
  - Obrigatório: `--message-id`, `--target`
  - Opcional: `--limit`

- `read`
  - Canais: Discord/Slack
  - Obrigatório: `--target`
  - Opcional: `--limit`, `--before`, `--after`
  - Discord apenas: `--around`

- `edit`
  - Canais: Discord/Slack
  - Obrigatório: `--message-id`, `--message`, `--target`

- `delete`
  - Canais: Discord/Slack/Telegram
  - Obrigatório: `--message-id`, `--target`

- `pin` / `unpin`
  - Canais: Discord/Slack
  - Obrigatório: `--message-id`, `--target`

- `pins` (listar)
  - Canais: Discord/Slack
  - Obrigatório: `--target`

- `permissions`
  - Canais: Discord
  - Obrigatório: `--target`

- `search`
  - Canais: Discord
  - Obrigatório: `--guild-id`, `--query`
  - Opcional: `--channel-id`, `--channel-ids` (repetir), `--author-id`, `--author-ids` (repetir), `--limit`

### Threads

- `thread create`
  - Canais: Discord
  - Obrigatório: `--thread-name`, `--target` (id do canal)
  - Opcional: `--message-id`, `--auto-archive-min`

- `thread list`
  - Canais: Discord
  - Obrigatório: `--guild-id`
  - Opcional: `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Canais: Discord
  - Obrigatório: `--target` (id da thread), `--message`
  - Opcional: `--media`, `--reply-to`

### Emojis

- `emoji list`
  - Discord: `--guild-id`
  - Slack: sem flags extras

- `emoji upload`
  - Canais: Discord
  - Obrigatório: `--guild-id`, `--emoji-name`, `--media`
  - Opcional: `--role-ids` (repetir)

### Stickers

- `sticker send`
  - Canais: Discord
  - Obrigatório: `--target`, `--sticker-id` (repetir)
  - Opcional: `--message`

- `sticker upload`
  - Canais: Discord
  - Obrigatório: `--guild-id`, `--sticker-name`, `--sticker-desc`, `--sticker-tags`, `--media`

### Roles / Canais / Membros / Voz

- `role info` (Discord): `--guild-id`
- `role add` / `role remove` (Discord): `--guild-id`, `--user-id`, `--role-id`
- `channel info` (Discord): `--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` para Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### Eventos

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - Opcional: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Moderação (Discord)

- `timeout`: `--guild-id`, `--user-id` (opcional `--duration-min` ou `--until`; omita ambos para limpar timeout)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` também suporta `--reason`

### Transmissão (Broadcast)

- `broadcast`
  - Canais: qualquer canal configurado; use `--channel all` para mirar todos os provedores
  - Obrigatório: `--targets` (repetir)
  - Opcional: `--message`, `--media`, `--dry-run`

## Exemplos

Enviar uma resposta Discord:

```
zero message send --channel discord \
  --target channel:123 --message "oi" --reply-to 456
```

Criar uma enquete Discord:

```
zero message poll --channel discord \
  --target channel:123 \
  --poll-question "Lanche?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

Enviar uma mensagem proativa Teams:

```
zero message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "oi"
```

Criar uma enquete Teams:

```
zero message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Almoço?" \
  --poll-option Pizza --poll-option Sushi
```

Reagir no Slack:

```
zero message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

Reagir em um grupo Signal:

```
zero message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

Enviar botões inline Telegram:

```
zero message send --channel telegram --target @mychat --message "Escolha:" \
  --buttons '[ [{"text":"Sim","callback_data":"cmd:yes"}], [{"text":"Não","callback_data":"cmd:no"}] ]'
```

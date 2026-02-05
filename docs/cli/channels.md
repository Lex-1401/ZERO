---
summary: "Referência CLI para `zero channels` (contas, status, login/logout, logs)"
read_when:
  - Você quer adicionar/remover contas de canal (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - Você quer checar status de canal ou ver logs de canal
---

# `zero channels`

Gerencie contas de canal de chat e seu status de runtime no Gateway.

Docs relacionadas:

- Guias de canal: [Channels](/channels/index)
- Configuração de Gateway: [Configuration](/gateway/configuration)

## Comandos comuns

```bash
zero channels list
zero channels status
zero channels capabilities
zero channels capabilities --channel discord --target channel:123
zero channels resolve --channel slack "#general" "@jane"
zero channels logs --channel all
```

## Adicionar / remover contas

```bash
zero channels add --channel telegram --token <bot-token>
zero channels remove --channel telegram --delete
```

Dica: `zero channels add --help` mostra flags por canal (token, app token, caminhos signal-cli, etc).

## Login / logout (interativo)

```bash
zero channels login --channel whatsapp
zero channels logout --channel whatsapp
```

## Solução de problemas

- Execute `zero status --deep` para uma sonda ampla.
- Use `zero doctor` para correções guiadas.
- `zero channels list` imprime `Claude: HTTP 403 ... user:profile` → snapshot de uso precisa do escopo `user:profile`. Use `--no-usage`, ou forneça uma chave de sessão claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`), ou re-autentique via Code CLI do Claude.

## Sonda de capacidades

Busque dicas de capacidade do provedor (intents/escopos onde disponível) mais suporte a recurso estático:

```bash
zero channels capabilities
zero channels capabilities --channel discord --target channel:123
```

Notas:

- `--channel` é opcional; omita para listar todo canal (incluindo extensões).
- `--target` aceita `channel:<id>` ou um id numérico de canal bruto e aplica-se apenas ao Discord.
- Sondas são específicas do provedor: Discord intents + permissões opcionais de canal; Slack bot + user scopes; Telegram bot flags + webhook; versão do daemon Signal; token de app MS Teams + roles/escopos Graph (anotado onde conhecido). Canais sem sondas reportam `Probe: unavailable`.

## Resolver nomes para IDs

Resolva nomes de canal/usuário para IDs usando o diretório do provedor:

```bash
zero channels resolve --channel slack "#general" "@jane"
zero channels resolve --channel discord "My Server/#support" "@someone"
zero channels resolve --channel matrix "Project Room"
```

Notas:

- Use `--kind user|group|auto` para forçar o tipo alvo.
- Resolução prefere correspondências ativas quando múltiplas entradas compartilham o mesmo nome.

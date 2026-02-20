---
summary: "Referência CLI para `zero directory` (self, pares, grupos)"
read_when:
  - Você quer buscar contatos/grupos/ids self para um canal
  - Você está desenvolvendo um adaptador de diretório de canal
---

# `zero directory`

Buscas de diretório para canais que suportam isso (contatos/pares, grupos, e "eu").

## Flags comuns

- `--channel <name>`: id/alias do canal (obrigatório quando múltiplos canais estão configurados; auto quando apenas um está configurado)
- `--account <id>`: id da conta (padrão: padrão do canal)
- `--json`: saída JSON

## Notas

- `directory` serve para ajudar você a encontrar IDs que pode colar em outros comandos (especialmente `zero message send --target ...`).
- Para muitos canais, resultados são baseados em config (allowlists / grupos configurados) em vez de um diretório de provedor ao vivo.
- Saída padrão é `id` (e às vezes `name`) separado por tabulação; use `--json` para scripts.

## Usando resultados com `message send`

```bash
zero directory peers list --channel slack --query "U0"
zero message send --channel slack --target user:U012ABCDEF --message "oi"
```

## Formatos de ID (por canal)

- WhatsApp: `+15551234567` (DM), `1234567890-1234567890@g.us` (grupo)
- Telegram: `@username` ou id de chat numérico; grupos são ids numéricos
- Slack: `user:U…` e `channel:C…`
- Discord: `user:<id>` e `channel:<id>`
- Matrix (plugin): `user:@user:server`, `room:!roomId:server`, ou `#alias:server`
- Microsoft Teams (plugin): `user:<id>` e `conversation:<id>`
- Zalo (plugin): user id (Bot API)
- Zalo Personal / `zalouser` (plugin): thread id (DM/grupo) de `zca` (`me`, `friend list`, `group list`)

## Self ("eu")

```bash
zero directory self --channel zalouser
```

## Pares (contatos/usuários)

```bash
zero directory peers list --channel zalouser
zero directory peers list --channel zalouser --query "nome"
zero directory peers list --channel zalouser --limit 50
```

## Grupos

```bash
zero directory groups list --channel zalouser
zero directory groups list --channel zalouser --query "trabalho"
zero directory groups members --channel zalouser --group-id <id>
```

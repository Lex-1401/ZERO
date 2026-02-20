---
summary: "Reforço da lista de permissões do Telegram: normalização de prefixo + espaço em branco"
read_when:
  - Revisando alterações históricas da lista de permissões do Telegram
---
# Reforço da Lista de Permissões do Telegram

**Data**: 05-01-2026  
**Status**: Completo  
**PR**: #216

## Resumo

As listas de permissões (allowlists) do Telegram agora aceitam os prefixos `telegram:` e `tg:` de forma insensível a maiúsculas/minúsculas e toleram espaços em branco acidentais. Isso alinha as verificações da lista de permissões de entrada com a normalização de envio de saída.

## O que mudou

- Os prefixos `telegram:` e `tg:` são tratados da mesma forma (insensível a maiúsculas/minúsculas).
- As entradas da lista de permissões são cortadas (trim); entradas vazias são ignoradas.

## Exemplos

Todos estes são aceitos para o mesmo ID:

- `telegram:123456`
- `TG:123456`
- ` tg:123456 `

## Por que isso importa

Copiar/colar de logs ou IDs de chat muitas vezes inclui prefixos e espaços em branco. A normalização evita falsos negativos ao decidir se deve responder em DMs ou grupos.

## Documentos relacionados

- [Chats de Grupo](/concepts/groups)
- [Provedor Telegram](/channels/telegram)

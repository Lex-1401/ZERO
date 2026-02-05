---
summary: "Regras de roteamento por canal (WhatsApp, Telegram, Discord, Slack) e contexto compartilhado"
read_when:
  - Alterando o roteamento entre canais ou o comportamento da caixa de entrada (inbox)
---
# Canais e Roteamento

O ZERO roteia as respostas **de volta para o canal de onde veio a mensagem**. O modelo não escolhe o canal; o roteamento é determinístico e controlado pela configuração do host.

## Termos-chave

- **Canal (Channel)**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **Id de Conta (AccountId)**: instância da conta por canal (quando suportado).
- **Id de Agente (AgentId)**: um espaço de trabalho isolado + armazenamento de sessão (“cérebro”).
- **Chave de Sessão (SessionKey)**: a chave de balde (bucket key) usada para armazenar o contexto e controlar a concorrência.

## Formatos de chave de sessão (exemplos)

Mensagens diretas são recolhidas para a sessão **principal (main)** do agente:

- `agent:<agentId>:<mainKey>` (padrão: `agent:main:main`)

Grupos e canais permanecem isolados por canal:

- Grupos: `agent:<agentId>:<channel>:group:<id>`
- Canais/salas: `agent:<agentId>:<channel>:channel:<id>`

Threads:

- Threads do Slack/Discord anexam `:thread:<threadId>` à chave base.
- Tópicos de fórum do Telegram incorporam `:topic:<topicId>` na chave do grupo.

Exemplos:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Regras de roteamento (como um agente é escolhido)

O roteamento escolhe **um agente** para cada mensagem de entrada:

1. **Correspondência exata de par (peer)** (`bindings` com `peer.kind` + `peer.id`).
2. **Correspondência de servidor (guild)** (Discord) via `guildId`.
3. **Correspondência de equipe (team)** (Slack) via `teamId`.
4. **Correspondência de conta** (`accountId` no canal).
5. **Correspondência de canal** (qualquer conta naquele canal).
6. **Agente padrão** (`agents.list[].default`, caso contrário a primeira entrada da lista, fallback para `main`).

O agente correspondente determina qual espaço de trabalho e armazenamento de sessão serão usados.

## Grupos de transmissão (Executar múltiplos agentes)

Os grupos de transmissão permitem que você execute **múltiplos agentes** para o mesmo par **quando o ZERO normalmente responderia** (por exemplo: em grupos de WhatsApp, após a validação de menção/ativação).

Configuração:

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["suporte", "logger"]
  }
}
```

Veja: [Grupos de Transmissão](/broadcast-groups).

## Visão geral da configuração

- `agents.list`: definições de agentes nomeados (espaço de trabalho, modelo, etc.).
- `bindings`: mapeia canais/contas/pares de entrada para agentes.

Exemplo:

```json5
{
  agents: {
    list: [
      { id: "suporte", name: "Suporte", workspace: "~/zero-suporte" }
    ]
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "suporte" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "suporte" }
  ]
}
```

## Armazenamento de sessão

Os armazenamentos de sessão residem sob o diretório de estado (padrão `~/.zero`):

- `~/.zero/agents/<agentId>/sessions/sessions.json`
- As transcrições JSONL residem ao lado do armazenamento.

Você pode sobrescrever o caminho do armazenamento via `session.store` e o uso de modelos (templating) com `{agentId}`.

## Comportamento do WebChat

O WebChat vincula-se ao **agente selecionado** e assume como padrão a sessão principal do agente. Por causa disso, o WebChat permite ver o contexto entre canais para esse agente em um único lugar.

## Contexto de resposta

Respostas de entrada incluem:

- `ReplyToId`, `ReplyToBody` e `ReplyToSender`, quando disponíveis.
- O contexto citado é anexado ao `Body` como um bloco `[Respondendo a ...]`.

Isso é consistente em todos os canais.

---
summary: "Comportamento de chat de grupo em várias plataformas (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams)"
read_when:
  - Alterando o comportamento do chat de grupo ou o controle de menções
---
# Grupos

O ZERO trata os chats de grupo de forma consistente em todas as plataformas: WhatsApp, Telegram, Discord, Slack, Signal, iMessage e Microsoft Teams.

## Introdução para iniciantes (2 minutos)

O ZERO “vive” em suas próprias contas de mensagens. Não existe um usuário bot separado no WhatsApp. Se **você** está em um grupo, o ZERO pode ver esse grupo e responder lá.

Comportamento padrão:

- Os grupos são restritos (`groupPolicy: "allowlist"`).
- Respostas exigem uma menção, a menos que você desative explicitamente o controle de menções (mention gating).

Tradução: remetentes permitidos (allowlisted) podem acionar o ZERO mencionando-o.

> TL;DR
>
> - **O acesso via DM** é controlado por `*.allowFrom`.
> - **O acesso via Grupo** é controlado por `*.groupPolicy` + listas de permissão (`*.groups`, `*.groupAllowFrom`).
> - **O acionamento de respostas** é controlado pelo controle de menções (`requireMention`, `/activation`).

Fluxo rápido (o que acontece com uma mensagem de grupo):

```text
groupPolicy? desativada -> descartar
groupPolicy? allowlist -> grupo permitido? não -> descartar
requireMention? sim -> mencionado? não -> armazenar apenas para contexto
caso contrário -> responder
```

Se você quer...

| Objetivo | O que configurar |
|----------|-------------|
| Permitir todos os grupos, mas responder apenas a @menções | `groups: { "*": { requireMention: true } }` |
| Desativar todas as respostas de grupo | `groupPolicy: "disabled"` |
| Apenas grupos específicos | `groups: { "<id-do-grupo>": { ... } }` (sem a chave `"*"` ) |
| Apenas você pode acionar nos grupos | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Chaves de sessão

- As sessões de grupo usam chaves de sessão `agent:<agentId>:<channel>:group:<id>` (salas/canais usam `agent:<agentId>:<channel>:channel:<id>`).
- Tópicos de fórum do Telegram adicionam `:topic:<threadId>` ao ID do grupo, para que cada tópico tenha sua própria sessão.
- Chats diretos usam a sessão principal (ou por remetente, se configurado).
- Heartbeats são pulados em sessões de grupo.

## Padrão: DMs pessoais + grupos públicos (único agente)

Sim — isso funciona bem se o seu tráfego “pessoal” for via **DMs** e o seu tráfego “público” for via **grupos**.

Por quê: no modo de agente único, as DMs geralmente caem na chave de sessão **principal** (`agent:main:main`), enquanto os grupos sempre usam chaves de sessão **não-principais** (`agent:main:<channel>:group:<id>`). Se você habilitar o sandboxing com `mode: "non-main"`, essas sessões de grupo rodam no Docker, enquanto sua sessão principal de DM permanece no host.

Isso lhe dá um “cérebro” de agente único (espaço de trabalho compartilhado + memória), mas duas posturas de execução:

- **DMs**: ferramentas completas (host)
- **Grupos**: sandbox + ferramentas restritas (Docker)

> Se você precisar de espaços de trabalho/personas verdadeiramente separados (o “pessoal” e o “público” nunca devem se misturar), use um segundo agente + vínculos (bindings). Veja [Roteamento Multi-Agente](/concepts/multi-agent).

Exemplo (DMs no host, grupos em sandbox + apenas ferramentas de mensagens):

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // grupos/canais são não-principais -> sandboxed
        scope: "session", // maior isolamento (um contêiner por grupo/canal)
        workspaceAccess: "none"
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        // Se allow não estiver vazio, tudo o resto é bloqueado (deny sempre vence).
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"]
      }
    }
  }
}
```

Quer que “os grupos vejam apenas a pasta X” em vez de “sem acesso ao host”? Mantenha `workspaceAccess: "none"` e monte apenas os caminhos permitidos no sandbox:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
        docker: {
          binds: [
            // caminhoNoHost:caminhoNoContainer:modo
            "~/FriendsShared:/data:ro"
          ]
        }
      }
    }
  }
}
```

Relacionado:

- Chaves de configuração e padrões: [Configuração do Gateway](/gateway/configuration#agentsdefaultssandbox)
- Depurando por que uma ferramenta está bloqueada: [Sandbox vs Política de Ferramentas vs Elevado](/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalhes de montagens (bind mounts): [Sandboxing](/gateway/sandboxing#custom-bind-mounts)

## Rótulos de exibição (Display labels)

- Rótulos de UI usam `displayName` quando disponível, formatado como `<canal>:<token>`.
- `#sala` é reservado para salas/canais; chats de grupo usam `g-<slug>` (letras minúsculas, espaços -> `-`, mantém `#@+._-`).

## Política de grupo

Controla como as mensagens de grupo/sala são tratadas por canal:

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"]
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789", "@usuario"]
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"]
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"]
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["usuario@org.com"]
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "GUILD_ID": { channels: { ajuda: { allow: true } } }
      }
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#geral": { allow: true } }
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@dono:example.org"],
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true }
      }
    }
  }
}
```

| Política | Comportamento |
|----------|----------|
| `"open"` | Grupos ignoram as listas de permissões; o controle de menções ainda se aplica. |
| `"disabled"` | Bloqueia todas as mensagens de grupo inteiramente. |
| `"allowlist"` | Permite apenas grupos/salas que correspondam à lista de permissões configurada. |

Notas:

- `groupPolicy` é separada do controle de menções (que exige @menções).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams: use `groupAllowFrom` (reserva: `allowFrom` explícito).
- Discord: a lista de permissões usa `channels.discord.guilds.<id>.channels`.
- Slack: a lista de permissões usa `channels.slack.channels`.
- Matrix: a lista de permissões usa `channels.matrix.groups` (IDs das salas, aliases ou nomes). Use `channels.matrix.groupAllowFrom` para restringir remetentes; listas de permissões de `usuarios` por sala também são suportadas.
- DMs de grupo são controladas separadamente (`channels.discord.dm.*`, `channels.slack.dm.*`).
- A lista de permissões do Telegram pode corresponder a IDs de usuário (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou nomes de usuário (`"@alice"` ou `"alice"`); os prefixos não diferenciam maiúsculas de minúsculas.
- O padrão é `groupPolicy: "allowlist"`; se sua lista de permissões de grupo estiver vazia, as mensagens de grupo serão bloqueadas.

Modelo mental rápido (ordem de avaliação para mensagens de grupo):

1) `groupPolicy` (open/disabled/allowlist)
2) listas de permissões de grupo (`*.groups`, `*.groupAllowFrom`, lista de permissões específica do canal)
3) controle de menções (`requireMention`, `/activation`)

## Controle de menções (gating, padrão)

Mensagens de grupo exigem uma menção, a menos que sobrescrito por grupo. Os padrões residem por subsistema sob `*.groups."*"`.

Responder a uma mensagem de bot conta como uma menção implícita (quando o canal suporta metadados de resposta). Isso se aplica ao Telegram, WhatsApp, Slack, Discord e Microsoft Teams.

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false }
      }
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false }
      }
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false }
      }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@zero", "zero", "\\+15555550123"],
          historyLimit: 50
        }
      }
    ]
  }
}
```

Notas:

- `mentionPatterns` são regexes case-insensitive.
- Plataformas que fornecem menções explícitas ainda funcionam; os padrões são uma alternativa.
- Sobrescrita por agente: `agents.list[].groupChat.mentionPatterns` (útil quando múltiplos agentes compartilham um grupo).
- O controle de menções só é aplicado quando a detecção de menções é possível (menções nativas ou `mentionPatterns` configurados).
- Os padrões do Discord residem em `channels.discord.guilds."*"` (sobrescrevível por servidor/canal).
- O contexto do histórico do grupo é empacotado uniformemente entre os canais e inclui apenas mensagens pendentes (mensagens ignoradas devido ao controle de menções); use `messages.groupChat.historyLimit` para o padrão global e `channels.<canal>.historyLimit` (ou `channels.<canal>.accounts.*.historyLimit`) para sobrescritas. Defina `0` para desativar.

## Listas de permissão de grupo

Quando `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` são configurados, as chaves atuam como uma lista de permissão do grupo. Use `"*"` para permitir todos os grupos enquanto ainda define o comportamento de menção padrão.

Intenções comuns (copiar/colar):

1) Desativar todas as respostas de grupo

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } }
}
```

1) Permitir apenas grupos específicos (WhatsApp)

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "123@g.us": { requireMention: true },
        "456@g.us": { requireMention: false }
      }
    }
  }
}
```

1) Permitir todos os grupos, mas exigir menção (explícito)

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } }
    }
  }
}
```

1) Apenas o proprietário pode acionar nos grupos (WhatsApp)

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## Ativação (apenas proprietário)

Os proprietários dos grupos podem alternar a ativação por grupo:

- `/activation mention`
- `/activation always`

O proprietário é determinado por `channels.whatsapp.allowFrom` (ou pelo auto E.164 do bot quando não configurado). Envie o comando como uma mensagem avulsa. Outras plataformas ignoram no momento o comando `/activation`.

## Campos de contexto

Os payloads de entrada de grupo definem:

- `ChatType=group`
- `GroupSubject` (se conhecido)
- `GroupMembers` (se conhecido)
- `WasMentioned` (resultado do controle de menções)
- Os tópicos do fórum do Telegram também incluem `MessageThreadId` e `IsForum`.

O prompt do sistema do agente inclui uma introdução do grupo no primeiro turno de uma nova sessão de grupo. Ele lembra o modelo de responder como um humano, evitar tabelas Markdown e evitar digitar sequências `\n` literais.

## Especificidades do iMessage

- Prefira `chat_id:<id>` ao rotear ou permitir.
- Listar chats: `imsg chats --limit 20`.
- Respostas em grupo sempre voltam para o mesmo `chat_id`.

## Especificidades do WhatsApp

Veja [Mensagens de grupo](/concepts/group-messages) para comportamentos específicos do WhatsApp (injeção de histórico, detalhes do tratamento de menções).

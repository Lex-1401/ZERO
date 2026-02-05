---
summary: "Roteamento multi-agente: agentes isolados, contas de canais e vínculos (bindings)"
title: Roteamento Multi-Agente
read_when: "Você deseja múltiplos agentes isolados (espaços de trabalho + autenticação) em um único processo do gateway."
status: active
---
# Roteamento Multi-Agente

Objetivo: múltiplos agentes *isolados* (espaço de trabalho separado + `agentDir` + sessões), além de múltiplas contas de canais (ex: dois WhatsApps) em um único Gateway em execução. A entrada é roteada para um agente via vínculos (bindings).

## O que é “um agente”?

Um **agente** é um cérebro totalmente escopado com seu próprio:

- **Espaço de trabalho** (arquivos, AGENTS.md/SOUL.md/USER.md, notas locais, regras de persona).
- **Diretório de estado** (`agentDir`) para perfis de autenticação, registro de modelos e configuração por agente.
- **Armazenamento de sessão** (histórico de chat + estado de roteamento) sob `~/.zero/agents/<agentId>/sessions`.

Os perfis de autenticação são **por agente**. Cada agente lê o seu próprio:

```text
~/.zero/agents/<agentId>/agent/auth-profiles.json
```

As credenciais do agente principal **não** são compartilhadas automaticamente. Nunca reutilize o `agentDir` entre agentes (isso causa colisões de autenticação/sessão). Se você quiser compartilhar credenciais, copie o `auth-profiles.json` para o `agentDir` do outro agente.

As habilidades são por agente via pasta `skills/` de cada espaço de trabalho, com habilidades compartilhadas disponíveis em `~/.zero/skills`. Veja [Habilidades: por agente vs compartilhadas](/tools/skills#per-agent-vs-shared-skills).

O Gateway pode hospedar **um agente** (padrão) ou **muitos agentes** lado a lado.

**Nota sobre o espaço de trabalho:** o espaço de trabalho de cada agente é o **cwd padrão**, não um sandbox rígido. Caminhos relativos resolvem dentro do espaço de trabalho, mas caminhos absolutos podem alcançar outros locais no host, a menos que o sandboxing esteja habilitado. Veja [Sandboxing](/gateway/sandboxing).

## Caminhos (Mapa rápido)

- Configuração: `~/.zero/zero.json` (ou `ZERO_CONFIG_PATH`)
- Dir de estado: `~/.zero` (ou `ZERO_STATE_DIR`)
- Espaço de trabalho: `~/zero` (ou `~/zero-<agentId>`)
- Dir do agente: `~/.zero/agents/<agentId>/agent` (ou `agents.list[].agentDir`)
- Sessões: `~/.zero/agents/<agentId>/sessions`

### Modo de agente único (padrão)

Se você não fizer nada, o ZERO executa um único agente:

- `agentId` padrão é **`main`**.
- As sessões são chaves como `agent:main:<mainKey>`.
- O espaço de trabalho padrão é `~/zero` (ou `~/zero-<perfil>` quando `ZERO_PROFILE` está configurado).
- O estado padrão é `~/.zero/agents/main/agent`.

## Auxiliar de agente

Use o assistente de agente para adicionar um novo agente isolado:

```bash
zero agents add trabalhar
```

Em seguida, adicione `bindings` (vínculos) (ou deixe o assistente fazer isso) para rotear mensagens de entrada. Verifique com:

```bash
zero agents list --bindings
```

## Múltiplos agentes = múltiplas pessoas, múltiplas personalidades

Com **múltiplos agentes**, cada `agentId` torna-se uma **persona totalmente isolada**:

- **Diferentes números de telefone/contas** (por canal `accountId`).
- **Diferentes personalidades** (arquivos de espaço de trabalho por agente, como `AGENTS.md` e `SOUL.md`).
- **Autenticação + sessões separadas** (sem conversa cruzada, a menos que habilitado explicitamente).

Isso permite que **múltiplas pessoas** compartilhem um servidor Gateway enquanto mantêm seus “cérebros” de IA e dados isolados.

## Um número de WhatsApp, múltiplas pessoas (Divisão de DM)

Você pode rotear **diferentes DMs do WhatsApp** para diferentes agentes permanecendo em **uma única conta de WhatsApp**. Corresponda ao E.164 do remetente (como `+15551234567`) com `peer.kind: "dm"`. As respostas ainda virão do mesmo número de WhatsApp (sem identidade de remetente por agente).

Detalhe importante: chats diretos são recolhidos para a **chave de sessão principal** do agente, portanto, o isolamento verdadeiro exige **um agente por pessoa**.

Exemplo:

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/zero-alex" },
      { id: "mia", workspace: "~/zero-mia" }
    ]
  },
  bindings: [
    { agentId: "alex", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230001" } } },
    { agentId: "mia",  match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230002" } } }
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"]
    }
  }
}
```

Notas:

- O controle de acesso a DM é **global por conta de WhatsApp** (emparelhamento/lista de permissões), não por agente.
- Para grupos compartilhados, vincule o grupo a um agente ou use [Grupos de transmissão](/broadcast-groups).

## Regras de roteamento (como as mensagens escolhem um agente)

Os vínculos (bindings) são **determinísticos** e **quem é mais específico vence**:

1. Correspondência de `peer` (ID exato de DM/grupo/canal)
2. `guildId` (Discord)
3. `teamId` (Slack)
4. Correspondência de `accountId` para um canal
5. Correspondência de nível de canal (`accountId: "*"`)
6. Fallback para o agente padrão (`agents.list[].default`, caso contrário, a primeira entrada da lista, padrão: `main`)

## Múltiplas contas / números de telefone

Canais que suportam **múltiplas contas** (ex: WhatsApp) usam `accountId` para identificar cada login. Cada `accountId` pode ser roteado para um agente diferente, de modo que um servidor pode hospedar vários números de telefone sem misturar as sessões.

## Conceitos

- `agentId`: um “cérebro” (espaço de trabalho, autenticação por agente, armazenamento de sessão por agente).
- `accountId`: uma instância de conta de canal (ex: conta WhatsApp `"pessoal"` vs `"trabalho"`).
- `binding`: roteia mensagens de entrada para um `agentId` por `(canal, accountId, peer)` e, opcionalmente, IDs de servidor/equipe (guild/team).
- Chats diretos são recolhidos para `agent:<agentId>:<mainKey>` (“principal” por agente; `session.mainKey`).

## Exemplo: dois WhatsApps → dois agentes

`~/.zero/zero.json` (JSON5):

```js
{
  agents: {
    list: [
      {
        id: "casa",
        default: true,
        name: "Casa",
        workspace: "~/zero-casa",
        agentDir: "~/.zero/agents/casa/agent",
      },
      {
        id: "trabalho",
        name: "Trabalho",
        workspace: "~/zero-trabalho",
        agentDir: "~/.zero/agents/trabalho/agent",
      },
    ],
  },

  // Roteamento determinístico: a primeira correspondência vence (mais específica primeiro).
  bindings: [
    { agentId: "casa", match: { channel: "whatsapp", accountId: "pessoal" } },
    { agentId: "trabalho", match: { channel: "whatsapp", accountId: "comercial" } },

    // Sobrescrita opcional por par (exemplo: enviar um grupo específico para o agente de trabalho).
    {
      agentId: "trabalho",
      match: {
        channel: "whatsapp",
        accountId: "pessoal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // Desativado por padrão: mensagens de agente para agente devem ser habilitadas explicitamente + permitidas.
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["casa", "trabalho"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        pessoal: {
          // Sobrescrita opcional. Padrão: ~/.zero/credentials/whatsapp/pessoal
          // authDir: "~/.zero/credentials/whatsapp/pessoal",
        },
        comercial: {
          // Sobrescrita opcional. Padrão: ~/.zero/credentials/whatsapp/comercial
          // authDir: "~/.zero/credentials/whatsapp/comercial",
        },
      },
    },
  },
}
```

## Exemplo: chat diário no WhatsApp + trabalho profundo no Telegram

Dividido por canal: roteia o WhatsApp para um agente rápido do dia a dia e o Telegram para um agente Opus.

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Dia a dia",
        workspace: "~/zero-chat",
        model: "anthropic/claude-sonnet-4-5"
      },
      {
        id: "opus",
        name: "Trabalho Profundo",
        workspace: "~/zero-opus",
        model: "anthropic/claude-opus-4-5"
      }
    ]
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } }
  ]
}
```

Notas:

- Se você tiver várias contas para um canal, adicione o `accountId` ao vínculo (por exemplo, `{ channel: "whatsapp", accountId: "pessoal" }`).
- Para rotear uma única DM/grupo para o Opus enquanto mantém o resto no chat, adicione um vínculo `match.peer` para esse par; correspondências de par sempre vencem sobre as regras de todo o canal.

## Exemplo: mesmo canal, um par para o Opus

Mantenha o WhatsApp no agente rápido, mas roteie uma DM para o Opus:

```json5
{
  agents: {
    list: [
      { id: "chat", name: "Dia a dia", workspace: "~/zero-chat", model: "anthropic/claude-sonnet-4-5" },
      { id: "opus", name: "Trabalho Profundo", workspace: "~/zero-opus", model: "anthropic/claude-opus-4-5" }
    ]
  },
  bindings: [
    { agentId: "opus", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551234567" } } },
    { agentId: "chat", match: { channel: "whatsapp" } }
  ]
}
```

Os vínculos de par (peer bindings) sempre vencem, portanto, mantenha-os acima das regras de todo o canal.

## Agente familiar vinculado a um grupo de WhatsApp

Vincula um agente familiar dedicado a um único grupo de WhatsApp, com controle de menções e uma política de ferramentas mais rígida:

```json5
{
  agents: {
    list: [
      {
        id: "familia",
        name: "Família",
        workspace: "~/zero-familia",
        identity: { name: "Bot da Família" },
        groupChat: {
          mentionPatterns: ["@familia", "@botdafamilia", "@Bot da Família"]
        },
        sandbox: {
          mode: "all",
          scope: "agent"
        },
        tools: {
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"]
        }
      }
    ]
  },
  bindings: [
    {
      agentId: "familia",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" }
      }
    }
  ]
}
```

Notas:

- As listas de permissão/negação de ferramentas são **ferramentas**, não habilidades. Se uma habilidade precisar executar um binário, garanta que `exec` seja permitido e que o binário exista no sandbox.
- Para uma validação mais rigorosa, defina `agents.list[].groupChat.mentionPatterns` e mantenha as listas de permissão de grupo habilitadas para o canal.

## Sandbox por Agente e Configuração de Ferramentas

A partir da v2026.1.6, cada agente pode ter seu próprio sandbox e restrições de ferramentas:

```js
{
  agents: {
    list: [
      {
        id: "pessoal",
        workspace: "~/zero-pessoal",
        sandbox: {
          mode: "off",  // Sem sandbox para o agente pessoal
        },
        // Sem restrições de ferramentas - todas as ferramentas disponíveis
      },
      {
        id: "familia",
        workspace: "~/zero-familia",
        sandbox: {
          mode: "all",     // Sempre em sandbox
          scope: "agent",  // Um contêiner por agente
          docker: {
            // Configuração opcional única após a criação do contêiner
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // Apenas ferramenta de leitura
          deny: ["exec", "write", "edit", "apply_patch"],    // Negar outras
        },
      },
    ],
  },
}
```

Nota: `setupCommand` vive sob `sandbox.docker` e roda uma única vez na criação do contêiner. As sobrescritas de `sandbox.docker.*` por agente são ignoradas quando o escopo resolvido é `"shared"`.

**Benefícios:**

- **Isolamento de segurança**: Restrinja ferramentas para agentes não confiáveis.
- **Controle de recursos**: Coloque agentes específicos em sandbox enquanto mantém outros no host.
- **Políticas flexíveis**: Diferentes permissões por agente.

Nota: `tools.elevated` é **global** e baseado no remetente; não é configurável por agente. Se você precisar de limites por agente, use `agents.list[].tools` para negar `exec`. Para segmentação de grupos, use `agents.list[].groupChat.mentionPatterns` para que as @menções mapeiem de forma limpa para o agente pretendido.

Veja [Sandbox e Ferramentas Multi-Agente](/multi-agent-sandbox-tools) para exemplos detalhados.

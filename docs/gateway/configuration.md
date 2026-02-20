---
summary: "Todas as opções de configuração para ~/.zero/zero.json com exemplos"
read_when:
  - Adicionando ou modificando campos de configuração
---
# Configuração 🔧

O ZERO lê uma configuração opcional em formato **JSON5** a partir de `~/.zero/zero.json` (comentários e vírgulas no final são permitidos).

Se o arquivo estiver ausente, o ZERO usa padrões seguros (agente Pi embutido + sessões por remetente + espaço de trabalho `~/zero`). Geralmente, você só precisa de uma configuração para:

- restringir quem pode acionar o bot (`channels.whatsapp.allowFrom`, `channels.telegram.allowFrom`, etc.)
- controlar listas de permissão de grupos + comportamento de menção (`channels.whatsapp.groups`, `channels.telegram.groups`, `channels.discord.guilds`, `agents.list[].groupChat`)
- personalizar prefixos de mensagens (`messages`)
- definir o espaço de trabalho do agente (`agents.defaults.workspace` ou `agents.list[].workspace`)
- ajustar os padrões do agente embutido (`agents.defaults`) e o comportamento da sessão (`session`)
- definir a identidade por agente (`agents.list[].identity`)

> **Novo na configuração?** Confira o guia de [Exemplos de Configuração](/gateway/configuration-examples) para exemplos completos com explicações detalhadas!

## Validação rigorosa da configuração

O ZERO só aceita configurações que correspondam totalmente ao esquema (schema). Chaves desconhecidas, tipos malformados ou valores inválidos fazem com que o Gateway **se recuse a iniciar** por segurança.

Quando a validação falha:

- O Gateway não inicia.
- Apenas comandos de diagnóstico são permitidos (por exemplo: `zero doctor`, `zero logs`, `zero health`, `zero status`, `zero service`, `zero help`).
- Execute `zero doctor` para ver os problemas exatos.
- Execute `zero doctor --fix` (ou `--yes`) para aplicar migrações/reparos.

O comando doctor nunca grava alterações, a menos que você opte explicitamente por `--fix`/`--yes`.

## Esquema + Dicas de Interface (UI hints)

O Gateway expõe uma representação em JSON Schema da configuração via `config.schema` para editores de interface. A Interface de Controle (Control UI) renderiza um formulário a partir deste esquema, com um editor de **JSON Bruto (Raw JSON)** como uma alternativa de saída.

Plugins de canais e extensões podem registrar esquemas e dicas de interface para suas configurações, mantendo as definições de canal orientadas por esquema em todos os aplicativos, sem a necessidade de formulários codificados manualmente.

As dicas (rótulos, agrupamentos, campos sensíveis) são enviadas junto com o esquema para que os clientes possam renderizar formulários melhores sem a necessidade de codificar o conhecimento da configuração.

## Aplicar + Reiniciar (RPC)

Use `config.apply` para validar + gravar a configuração completa e reiniciar o Gateway em uma única etapa. Ele grava um sinalizador (sentinel) de reinicialização e envia um sinal (ping) para a última sessão ativa após o retorno do Gateway.

Aviso: `config.apply` substitui a **configuração inteira**. Se você quiser alterar apenas algumas chaves, use `config.patch` ou `zero config set`. Mantenha um backup de `~/.zero/zero.json`.

Parâmetros:

- `raw` (string) — payload JSON5 para toda a configuração.
- `baseHash` (opcional) — hash da configuração vindo de `config.get` (obrigatório quando uma configuração já existe).
- `sessionKey` (opcional) — chave da última sessão ativa para o sinal de despertar.
- `note` (opcional) — nota a ser incluída no sinalizador de reinicialização.
- `restartDelayMs` (opcional) — atraso antes da reinicialização (padrão 2000).

Exemplo (via `gateway call`):

```bash
zero gateway call config.get --params '{}' # captura o payload.hash
zero gateway call config.apply --params '{
  "raw": "{\\n  agents: { defaults: { workspace: \\"~/zero\\" } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## Atualizações parciais (RPC)

Use `config.patch` para mesclar uma atualização parcial na configuração existente sem sobrescrever chaves não relacionadas. Ele aplica a semântica de "JSON merge patch":

- objetos são mesclados recursivamente.
- `null` deleta uma chave.
- matrizes (arrays) são substituídas.
Assim como o `config.apply`, ele valida, grava a configuração, armazena um sinalizador de reinicialização e agenda a reinicialização do Gateway (com um despertar opcional quando a `sessionKey` é fornecida).

Parâmetros:

- `raw` (string) — payload JSON5 contendo apenas as chaves a serem alteradas.
- `baseHash` (obrigatório) — hash da configuração vindo de `config.get`.
- `sessionKey` (opcional) — chave da última sessão ativa para o sinal de despertar.
- `note` (opcional) — nota a ser incluída no sinalizador de reinicialização.
- `restartDelayMs` (opcional) — atraso antes da reinicialização (padrão 2000).

Exemplo:

```bash
zero gateway call config.get --params '{}' # captura o payload.hash
zero gateway call config.patch --params '{
  "raw": "{\\n  channels: { telegram: { groups: { \\"*\\": { requireMention: false } } } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## Configuração mínima (ponto de partida recomendado)

```json5
{
  agents: { defaults: { workspace: "~/zero" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

Construa a imagem padrão uma vez com:

```bash
scripts/sandbox-setup.sh
```

## Modo auto-chat (recomendado para controle de grupo)

Para evitar que o bot responda a menções com @ no WhatsApp em grupos (respondendo apenas a gatilhos de texto específicos):

```json5
{
  agents: {
    defaults: { workspace: "~/zero" },
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["@zero", "responda"] }
      }
    ]
  },
  channels: {
    whatsapp: {
      // A lista de permissão (allowFrom) é apenas para DMs; incluir seu próprio número habilita o modo auto-chat.
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## Inclusões de Configuração (`$include`)

Divida sua configuração em múltiplos arquivos usando a diretiva `$include`. Isso é útil para:

- Organizar configurações grandes (ex: definições de agentes por cliente).
- Compartilhar configurações comuns entre ambientes.
- Manter configurações sensíveis separadas.

### Uso básico

```json5
// ~/.zero/zero.json
{
  gateway: { port: 18789 },
  
  // Inclui um único arquivo (substitui o valor da chave)
  agents: { "$include": "./agents.json5" },
  
  // Inclui múltiplos arquivos (mesclagem profunda na ordem)
  broadcast: { 
    "$include": [
      "./clients/mueller.json5",
      "./clients/schmidt.json5"
    ]
  }
}
```

```json5
// ~/.zero/agents.json5
{
  defaults: { sandbox: { mode: "all", scope: "session" } },
  list: [
    { id: "main", workspace: "~/zero" }
  ]
}
```

### Comportamento de mesclagem (Merge)

- **Arquivo único**: Substitui o objeto que contém o `$include`.
- **Matriz de arquivos**: Mesclagem profunda dos arquivos na ordem (arquivos posteriores sobrescrevem os anteriores).
- **Com chaves irmãs**: Chaves irmãs são mescladas após as inclusões (sobrescrevem os valores incluídos).
- **Chaves irmãs + matrizes/primitivos**: Não suportado (o conteúdo incluído deve ser um objeto).

```json5
// Chaves irmãs sobrescrevem valores incluídos
{
  "$include": "./base.json5",   // { a: 1, b: 2 }
  b: 99                          // Resultado: { a: 1, b: 99 }
}
```

### Inclusões aninhadas

Arquivos incluídos podem, eles próprios, conter diretivas de `$include` (com até 10 níveis de profundidade):

```json5
// clients/mueller.json5
{
  agents: { "$include": "./mueller/agents.json5" },
  broadcast: { "$include": "./mueller/broadcast.json5" }
}
```

### Resolução de caminhos

- **Caminhos relativos**: Resolvidos em relação ao arquivo que contém a inclusão.
- **Caminhos absolutos**: Usados como estão.
- **Diretórios pais**: Referências com `../` funcionam conforme o esperado.

```json5
{ "$include": "./sub/config.json5" }      // relativo
{ "$include": "/etc/zero/base.json5" } // absoluto
{ "$include": "../shared/common.json5" }   // diretório pai
```

### Tratamento de erros

- **Arquivo ausente**: Erro claro com o caminho resolvido.
- **Erro de análise (Parse)**: Mostra qual arquivo incluído falhou.
- **Inclusões circulares**: Detectadas e reportadas com a cadeia de inclusão.

### Exemplo: Configuração jurídica para múltiplos clientes

```json5
// ~/.zero/zero.json
{
  gateway: { port: 18789, auth: { token: "segredo" } },
  
  // Padrões comuns de agentes
  agents: {
    defaults: {
      sandbox: { mode: "all", scope: "session" }
    },
    // Mescla as listas de agentes de todos os clientes
    list: { "$include": [
      "./clients/mueller/agents.json5",
      "./clients/schmidt/agents.json5"
    ]}
  },
  
  // Mescla as configurações de transmissão (broadcast)
  broadcast: { "$include": [
    "./clients/mueller/broadcast.json5",
    "./clients/schmidt/broadcast.json5"
  ]},
  
  channels: { whatsapp: { groupPolicy: "allowlist" } }
}
```

```json5
// ~/.zero/clients/mueller/agents.json5
[
  { id: "mueller-transcrever", workspace: "~/clients/mueller/transcribe" },
  { id: "mueller-docs", workspace: "~/clients/mueller/docs" }
]
```

```json5
// ~/.zero/clients/mueller/broadcast.json5
{
  "120363403215116621@g.us": ["mueller-transcrever", "mueller-docs"]
}
```

## Opções comuns

### Variáveis de ambiente + `.env`

O ZERO lê as variáveis de ambiente do processo pai (shell, launchd/systemd, CI, etc.).

Além disso, ele carrega:

- `.env` do diretório de trabalho atual (se presente).
- um `.env` de fallback global em `~/.zero/.env` (também conhecido como `$ZERO_STATE_DIR/.env`).

Nenhum arquivo `.env` sobrescreve variáveis de ambiente existentes.

Você também pode fornecer variáveis de ambiente inline na configuração. Elas só são aplicadas se a chave estiver ausente no ambiente do processo (mesma regra de não sobrescrever):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    }
  }
}
```

Veja [/environment](/environment) para a precedência completa e fontes.

### `env.shellEnv` (opcional)

Conveniência de aceitação (opt-in): se habilitado e nenhuma das chaves esperadas estiver configurada, o ZERO executa o seu shell de login e importa apenas as chaves esperadas que estiverem faltando (nunca sobrescreve). Isso efetivamente carrega (sources) o seu perfil de shell.

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  }
}
```

Equivalente em variável de ambiente:

- `ZERO_LOAD_SHELL_ENV=1`
- `ZERO_SHELL_ENV_TIMEOUT_MS=15000`

### Substituição de variáveis de ambiente na configuração

Você pode referenciar variáveis de ambiente diretamente em qualquer valor de string da configuração usando a sintaxe `${NOME_DA_VAR}`. As variáveis são substituídas no momento de carregamento da configuração, antes da validação.

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}"
      }
    }
  },
  gateway: {
    auth: {
      token: "${ZERO_GATEWAY_TOKEN}"
    }
  }
}
```

**Regras:**

- Apenas nomes de variáveis de ambiente em maiúsculas são correspondidos: `[A-Z_][A-Z0-9_]*`.
- Variáveis de ambiente ausentes ou vazias lançam um erro no carregamento da configuração.
- Escape com `$${VAR}` para produzir um literal `${VAR}`.
- Funciona com o `$include` (arquivos incluídos também recebem substituição).

**Substituição inline:**

```json5
{
  models: {
    providers: {
      custom: {
        baseUrl: "${CUSTOM_API_BASE}/v1"  // → "https://api.exemplo.com/v1"
      }
    }
  }
}
```

### Armazenamento de autenticação (OAuth + Chaves de API)

O ZERO armazena perfis de autenticação **por agente** (OAuth + chaves de API) em:

- `<agentDir>/auth-profiles.json` (padrão: `~/.zero/agents/<agentId>/agent/auth-profiles.json`)

Veja também: [/concepts/oauth](/concepts/oauth)

Importações legadas de OAuth:

- `~/.zero/credentials/oauth.json` (ou `$ZERO_STATE_DIR/credentials/oauth.json`)

O agente Pi embutido mantém um cache de tempo de execução (runtime cache) em:

- `<agentDir>/auth.json` (gerenciado automaticamente; não edite manualmente)

Diretório de agente legado (pré multi-agente):

- `~/.zero/agent/*` (migrado pelo `zero doctor` para `~/.zero/agents/<defaultAgentId>/agent/*`)

Sobrescritas:

- Diretório OAuth (apenas importação legada): `ZERO_OAUTH_DIR`.
- Diretório do agente (sobrescrita da raiz do agente padrão): `ZERO_AGENT_DIR` (preferencial), `PI_CODING_AGENT_DIR` (legado).

No primeiro uso, o ZERO importa as entradas de `oauth.json` para o `auth-profiles.json`.

O ZERO também sincroniza automaticamente os tokens OAuth de CLIs externas para o `auth-profiles.json` (quando presentes no host do gateway):

- Claude Code → `anthropic:claude-cli`
  - macOS: Item de chaveiro (Keychain) "Claude Code-credentials" (escolha "Sempre Permitir" para evitar prompts do launchd).
  - Linux/Windows: `~/.claude/.credentials.json`.
- `~/.codex/auth.json` (CLI do Codex) → `openai-codex:codex-cli`.

### `auth`

Metadados opcionais para perfis de autenticação. Isso **não** armazena segredos; ele mapeia os IDs de perfil para um provedor + modo (e e-mail opcional) e define a ordem de rotação do provedor usada para failover.

```json5
{
  auth: {
    profiles: {
      "anthropic:eu@exemplo.com": { provider: "anthropic", mode: "oauth", email: "eu@exemplo.com" },
      "anthropic:trabalho": { provider: "anthropic", mode: "api_key" }
    },
    order: {
      anthropic: ["anthropic:eu@exemplo.com", "anthropic:trabalho"]
    }
  }
}
```

Nota: `anthropic:claude-cli` deve usar `mode: "oauth"` mesmo quando a credencial armazenada for um setup-token. O ZERO migra automaticamente configurações antigas que usavam `mode: "token"`.

### `agents.list[].identity`

Identidade opcional por agente usada para padrões e experiência do usuário (UX). Isto é gravado pelo assistente de integração do macOS.

Se definido, o ZERO deriva padrões (apenas quando você não os definiu explicitamente):

- `messages.ackReaction` vindo da `identity.emoji` do **agente ativo** (volta para 👀 se não definido).
- `agents.list[].groupChat.mentionPatterns` vindo de `identity.name`/`identity.emoji` do agente (para que “@Samantha” funcione em grupos no Telegram/Slack/Discord/Google Chat/iMessage/WhatsApp).
- `identity.avatar` aceita um caminho de imagem relativo ao espaço de trabalho ou uma URL remota/URL de dados. Arquivos locais devem residir dentro do espaço de trabalho do agente.

`identity.avatar` aceita:

- Caminho relativo ao espaço de trabalho (deve permanecer dentro do espaço de trabalho do agente).
- URL `http(s)`.
- URI `data:`.

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Samantha",
          theme: "preguiça prestativa",
          emoji: "🦥",
          avatar: "avatars/samantha.png"
        }
      }
    ]
  }
}
```

### `wizard`

Metadados gravados pelos assistentes da CLI (`onboard`, `configure`, `doctor`).

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local"
  }
}
```

### `logging`

- Arquivo de log padrão: `/tmp/zero/zero-AAAA-MM-DD.log`.
- Se você quiser um caminho estável, defina `logging.file` como `/tmp/zero/zero.log`.
- A saída do console pode ser ajustada separadamente via:
  - `logging.consoleLevel` (o padrão é `info`, sobe para `debug` quando `--verbose` é usado).
  - `logging.consoleStyle` (`pretty` | `compact` | `json`).
- Resumos de ferramentas podem ser redigidos para evitar o vazamento de segredos:
  - `logging.redactSensitive` (`off` | `tools`, o padrão é `tools`).
  - `logging.redactPatterns` (matriz de strings de regex; sobrescreve os padrões).

```json5
{
  logging: {
    level: "info",
    file: "/tmp/zero/zero.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
    redactSensitive: "tools",
    redactPatterns: [
      // Exemplo: sobrescreva os padrões com suas próprias regras.
      "\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1",
      "/\\bsk-[A-Za-z0-9_-]{8,}\\b/gi"
    ]
  }
}
```

### `channels.whatsapp.dmPolicy`

Controla como os chats diretos (DMs) do WhatsApp são tratados:

- `"pairing"` (padrão): remetentes desconhecidos recebem um código de emparelhamento; o proprietário deve aprovar.
- `"allowlist"`: permite apenas remetentes em `channels.whatsapp.allowFrom` (ou no armazenamento de permissões emparelhado).
- `"open"`: permite todas as DMs de entrada (**exige** que `channels.whatsapp.allowFrom` inclua `"*"`).
- `"disabled"`: ignora todas as DMs de entrada.

Os códigos de emparelhamento expiram após 1 hora; o bot só envia um código de emparelhamento quando uma nova solicitação é criada. As solicitações de emparelhamento de DM pendentes são limitadas a **3 por canal** por padrão.

Aprovações de emparelhamento:

- `zero pairing list whatsapp`
- `zero pairing approve whatsapp <code>`

### `channels.whatsapp.allowFrom`

Lista de permissão de números de telefone E.164 que podem acionar respostas automáticas no WhatsApp (**apenas DMs**). Se estiver vazio e `channels.whatsapp.dmPolicy="pairing"`, remetentes desconhecidos receberão um código de emparelhamento. Para grupos, use `channels.whatsapp.groupPolicy` + `channels.whatsapp.groupAllowFrom`.

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000, // tamanho opcional da parte de saída (caracteres)
      chunkMode: "length", // modo opcional de divisão (length | newline)
      mediaMaxMb: 50 // limite opcional de mídia de entrada (MB)
    }
  }
}
```

### `channels.whatsapp.sendReadReceipts`

Controla se as mensagens de entrada do WhatsApp são marcadas como lidas (ticks azuis). O padrão é `true`.

O modo auto-chat sempre ignora os recibos de leitura, mesmo quando habilitado.

Sobrescrita por conta: `channels.whatsapp.accounts.<id>.sendReadReceipts`.

```json5
{
  channels: {
    whatsapp: { sendReadReceipts: false }
  }
}
```

### `channels.whatsapp.accounts` (múltiplas contas)

Execute múltiplas contas do WhatsApp em um único gateway:

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {}, // opcional; mantém o id padrão estável
        pessoal: {},
        biz: {
          // Sobrescrita opcional. Padrão: ~/.zero/credentials/whatsapp/biz
          // authDir: "~/.zero/credentials/whatsapp/biz",
        }
      }
    }
  }
}
```

Notas:

- Comandos de saída usam a conta `default` por padrão, se presente; caso contrário, usam o primeiro ID de conta configurado (ordenado).
- O diretório de autenticação legado de conta única do Baileys é migrado pelo comando `zero doctor` para `whatsapp/default`.

### `channels.telegram.accounts` / `channels.discord.accounts` / `channels.googlechat.accounts` / `channels.slack.accounts` / `channels.mattermost.accounts` / `channels.signal.accounts` / `channels.imessage.accounts`

Execute múltiplas contas por canal (cada conta tem seu próprio `accountId` e `name` opcional):

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Bot primário",
          botToken: "123456:ABC..."
        },
        alertas: {
          name: "Bot de alertas",
          botToken: "987654:XYZ..."
        }
      }
    }
  }
}
```

Notas:

- `default` é usado quando o `accountId` é omitido (CLI + roteamento).
- Tokens de ambiente aplicam-se apenas à conta **padrão (default)**.
- As configurações básicas do canal (política de grupo, restrição de menção, etc.) aplicam-se a todas as contas, a menos que sejam sobrescritas por conta.
- Use `bindings[].match.accountId` para rotear cada conta para diferentes `agents.defaults`.

### Restrição de menção em chats de grupo (`agents.list[].groupChat` + `messages.groupChat`)

Mensagens de grupo assumem por padrão que **exigem menção** (seja uma menção de metadados ou padrões de regex). Aplica-se a chats de grupo do WhatsApp, Telegram, Discord, Google Chat e iMessage.

**Tipos de menção:**

- **Menções de metadados**: Menções @ nativas da plataforma (ex: toque para mencionar no WhatsApp). Ignorado no modo auto-chat do WhatsApp (veja `channels.whatsapp.allowFrom`).
- **Padrões de texto**: Padrões de regex definidos em `agents.list[].groupChat.mentionPatterns`. Sempre verificados, independentemente do modo auto-chat.
- A restrição de menção é aplicada apenas quando a detecção de menção é possível (menções nativas ou pelo menos um `mentionPattern`).

```json5
{
  messages: {
    groupChat: { historyLimit: 50 }
  },
  agents: {
    list: [
      { id: "main", groupChat: { mentionPatterns: ["@zero", "zero", "zero"] } }
    ]
  }
}
```

`messages.groupChat.historyLimit` define o padrão global para o contexto de histórico do grupo. Canais podem sobrescrever com `channels.<canal>.historyLimit` (ou `channels.<canal>.accounts.*.historyLimit` para múltiplas contas). Defina `0` para desativar o envolvimento do histórico.

#### Limites de histórico de DM

Conversas de DM usam histórico baseado em sessão gerenciado pelo agente. Você pode limitar o número de turnos de usuário mantidos por sessão de DM:

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,  // limita sessões de DM a 30 turnos de usuário
      dms: {
        "123456789": { historyLimit: 50 }  // sobrescrita por usuário (ID do usuário)
      }
    }
  }
}
```

Ordem de resolução:

1. Sobrescrita por DM: `channels.<provedor>.dms[userId].historyLimit`.
2. Padrão do provedor: `channels.<provedor>.dmHistoryLimit`.
3. Sem limite (todo o histórico é mantido).

Provedores suportados: `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

Sobrescrita por agente (tem precedência quando definida, mesmo que `[]`):

```json5
{
  agents: {
    list: [
      { id: "trabalho", groupChat: { mentionPatterns: ["@workbot", "\\+15555550123"] } },
      { id: "pessoal", groupChat: { mentionPatterns: ["@homebot", "\\+15555550999"] } }
    ]
  }
}
```

Os padrões de restrição de menção residem por canal (`channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`, `channels.discord.guilds`). Quando `*.groups` é definido, ele também atua como uma lista de permissão de grupo; inclua `"*"` para permitir todos os grupos.

Para responder **apenas** a gatilhos de texto específicos (ignorando menções nativas com @):

```json5
{
  channels: {
    whatsapp: {
      // Inclua o seu próprio número para habilitar o modo auto-chat (ignorar menções nativas com @).
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          // Apenas estes padrões de texto dispararão respostas
          mentionPatterns: ["responda", "@zero"]
        }
      }
    ]
  }
}
```

### Política de grupo (por canal)

Use `channels.*.groupPolicy` para controlar se as mensagens de grupo/sala são aceitas:

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    },
    telegram: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["tg:123456789", "@alice"]
    },
    signal: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    },
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["chat_id:123"]
    },
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["usuario@org.com"]
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "GUILD_ID": {
          channels: { help: { allow: true } }
        }
      }
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#geral": { allow: true } }
    }
  }
}
```

Notas:

- `"open"`: grupos ignoram as listas de permissão; a restrição de menção ainda se aplica.
- `"disabled"`: bloqueia todas as mensagens de grupo/sala.
- `"allowlist"`: permite apenas grupos/salas que correspondam à lista de permissão configurada.
- `channels.defaults.groupPolicy` define o padrão quando a `groupPolicy` de um provedor não estiver definida.
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams usam `groupAllowFrom` (referência reserva: `allowFrom` explícito).
- Discord/Slack usam listas de permissão de canal (`channels.discord.guilds.*.channels`, `channels.slack.channels`).
- DMs de grupo (Discord/Slack) ainda são controladas por `dm.groupEnabled` + `dm.groupChannels`.
- O padrão é `groupPolicy: "allowlist"` (a menos que sobrescrito por `channels.defaults.groupPolicy`); se nenhuma lista de permissão estiver configurada, as mensagens de grupo serão bloqueadas.

### Roteamento multi-agente (`agents.list` + `bindings`)

Execute múltiplos agentes isolados (espaço de trabalho, `agentDir`, sessões separados) dentro de um Gateway. As mensagens de entrada são roteadas para um agente através de vínculos (bindings).

- `agents.list[]`: sobrescritas por agente.
  - `id`: id estável do agente (obrigatório).
  - `default`: opcional; quando múltiplos são definidos, o primeiro vence e um aviso é registrado. Se nenhum for definido, a **primeira entrada** da lista é o agente padrão.
  - `name`: nome de exibição para o agente.
  - `workspace`: padrão `~/zero-<agentId>` (para o `main`, volta para `agents.defaults.workspace`).
  - `agentDir`: padrão `~/.zero/agents/<agentId>/agent`.
  - `model`: modelo padrão por agente, sobrescreve `agents.defaults.model` para esse agente.
    - formato string: `"provedor/modelo"`, sobrescreve apenas `agents.defaults.model.primary`.
    - formato objeto: `{ primary, fallbacks }` (fallbacks sobrescrevem `agents.defaults.model.fallbacks`; `[]` desativa os fallbacks globais para esse agente).
  - `identity`: nome/tema/emoji por agente (usado para padrões de menção + reações de ack).
  - `groupChat`: restrição de menção por agente (`mentionPatterns`).
  - `sandbox`: configuração de sandbox por agente (sobrescreve `agents.defaults.sandbox`).
    - `mode`: `"off"` | `"non-main"` | `"all"`
    - `workspaceAccess`: `"none"` | `"ro"` | `"rw"`
    - `scope`: `"session"` | `"agent"` | `"shared"`
    - `workspaceRoot`: raiz personalizada do espaço de trabalho do sandbox.
    - `docker`: sobrescritas docker por agente (ex: `image`, `network`, `env`, `setupCommand`, limites; ignorado quando `scope: "shared"`).
    - `browser`: sobrescritas de navegador em sandbox por agente (ignorado quando `scope: "shared"`).
    - `prune`: sobrescritas de poda de sandbox por agente (ignorado quando `scope: "shared"`).
  - `subagents`: padrões de sub-agente por agente.
    - `allowAgents`: lista de IDs de agentes permitidos para `sessions_spawn` a partir deste agente (`["*"]` = permite qualquer um; padrão: apenas o próprio agente).
  - `tools`: restrições de ferramentas por agente (aplicadas antes da política de ferramentas do sandbox).
    - `profile`: perfil de ferramenta base (aplicado antes do allow/deny).
    - `allow`: matriz de nomes de ferramentas permitidas.
    - `deny`: matriz de nomes de ferramentas negadas (a negação vence).
- `agents.defaults`: padrões compartilhados de agentes (modelo, espaço de trabalho, sandbox, etc.).
- `bindings[]`: roteia mensagens de entrada para um `agentId`.
  - `match.channel` (obrigatório).
  - `match.accountId` (opcional; `*` = qualquer conta; omitido = conta padrão).
  - `match.peer` (opcional; `{ kind: dm|group|channel, id }`).
  - `match.guildId` / `match.teamId` (opcional; específico do canal).

Ordem de correspondência determinística:

1) `match.peer`
2) `match.guildId`
3) `match.teamId`
4) `match.accountId` (exato, sem peer/guild/team)
5) `match.accountId: "*"` (em todo o canal, sem peer/guild/team)
6) agente padrão (`agents.list[].default`, caso contrário a primeira entrada da lista, caso contrário `"main"`)

Dentro de cada nível de correspondência, a primeira entrada correspondente em `bindings` vence.

#### Perfis de acesso por agente (multi-agente)

Cada agente pode carregar sua própria política de sandbox + ferramentas. Use isso para misturar níveis de acesso em um único gateway:

- **Acesso total** (agente pessoal).
- Ferramentas + espaço de trabalho de **apenas leitura**.
- **Sem acesso ao sistema de arquivos** (apenas ferramentas de mensagens/sessão).

Veja [Sandbox Multi-Agente e Ferramentas](/multi-agent-sandbox-tools) para precedência e exemplos adicionais.

Acesso total (sem sandbox):

```json5
{
  agents: {
    list: [
      {
        id: "pessoal",
        workspace: "~/zero-personal",
        sandbox: { mode: "off" }
      }
    ]
  }
}
```

```json5
{
  agents: {
    list: [
      {
        id: "família",
        workspace: "~/zero-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro"
        },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"]
        }
      }
    ]
  }
}
```

Sem acesso ao sistema de arquivos (ferramentas de mensagens/sessão habilitadas):

```json5
{
  agents: {
    list: [
      {
        id: "publico",
        workspace: "~/zero-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none"
        },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"]
        }
      }
    ]
  }
}
```

Exemplo: duas contas de WhatsApp → dois agentes:

```json5
{
  agents: {
    list: [
      { id: "casa", default: true, workspace: "~/zero-home" },
      { id: "trabalho", workspace: "~/zero-work" }
    ]
  },
  bindings: [
    { agentId: "casa", match: { channel: "whatsapp", accountId: "pessoal" } },
    { agentId: "trabalho", match: { channel: "whatsapp", accountId: "biz" } }
  ],
  channels: {
    whatsapp: {
      accounts: {
        pessoal: {},
        biz: {},
      }
    }
  }
}
```

### `tools.agentToAgent` (opcional)

A troca de mensagens entre agentes é por opção (opt-in):

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["casa", "trabalho"]
    }
  }
}
```

### `messages.queue`

Controla como as mensagens de entrada se comportam quando uma execução de agente já está ativa.

```json5
{
  messages: {
    queue: {
      mode: "collect", // steer | followup | collect | steer-backlog (steer+backlog ok) | interrupt (queue=steer legado)
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
        discord: "collect",
        imessage: "collect",
        webchat: "collect"
      }
    }
  }
}
```

### `messages.inbound`

Agrupa (debounce) mensagens de entrada rápidas do **mesmo remetente** para que múltiplas mensagens consecutivas se tornem um único turno de agente. O agrupamento é delimitado por canal + conversa e usa a mensagem mais recente para threading/IDs de resposta.

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000, // 0 desativa
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500
      }
    }
  }
}
```

Notas:

- O agrupamento processa apenas mensagens de **somente texto**; mídias/anexos são enviados imediatamente.
- Comandos de controle (ex: `/queue`, `/new`) ignoram o agrupamento para que permaneçam independentes.

### `commands` (tratamento de comandos de chat)

Controla como os comandos de chat são habilitados nos conectores.

```json5
{
  commands: {
    native: "auto",         // registra comandos nativos quando suportado (auto)
    text: true,             // analisa comandos de barra (slash) em mensagens de chat
    bash: false,            // permite ! (alias: /bash) (apenas host; requer listas de permissão tools.elevated)
    bashForegroundMs: 2000, // janela de primeiro plano do bash (0 coloca em background imediatamente)
    config: false,          // permite /config (grava no disco)
    debug: false,           // permite /debug (sobrescritas apenas em tempo de execução)
    restart: false,         // permite /restart + ferramenta de reinicialização do gateway
    useAccessGroups: true   // impõe listas de permissão/políticas de grupo de acesso para comandos
  }
}
```

Notas:

- Comandos de texto devem ser enviados como uma mensagem **independente** e usar a barra inicial `/` (sem aliases em texto simples).
- `commands.text: false` desativa a análise de mensagens de chat em busca de comandos.
- `commands.native: "auto"` (padrão) ativa comandos nativos para Discord/Telegram e deixa o Slack desativado; canais não suportados permanecem apenas com texto.
- Defina `commands.native: true|false` para forçar em todos, ou sobrescreva por canal com `channels.discord.commands.native`, `channels.telegram.commands.native`, `channels.slack.commands.native` (boolean ou `"auto"`). `false` limpa comandos registrados anteriormente no Discord/Telegram na inicialização; os comandos do Slack são gerenciados no aplicativo Slack.
- `channels.telegram.customCommands` adiciona entradas extras ao menu do bot no Telegram. Os nomes são normalizados; conflitos com comandos nativos são ignorados.
- `commands.bash: true` habilita `! <cmd>` para executar comandos de shell no host (`/bash <cmd>` também funciona como um alias). Requer `tools.elevated.enabled` e a inclusão do remetente na lista de permissão em `tools.elevated.allowFrom.<canal>`.
- `commands.bashForegroundMs` controla quanto tempo o bash espera antes de ir para o background. Enquanto um job de bash está rodando, novos pedidos de `! <cmd>` são rejeitados (um de cada vez).
- `commands.config: true` habilita o `/config` (lê/grava o `zero.json`).
- `channels.<provedor>.configWrites` controla mutações de configuração iniciadas por esse canal (padrão: true). Isso se aplica a `/config set|unset` além de auto-migrações específicas do provedor (mudanças de ID de supergrupo do Telegram, mudanças de ID de canal do Slack).
- `commands.debug: true` habilita o `/debug` (sobrescritas apenas em tempo de execução).
- `commands.restart: true` habilita o `/restart` e a ação de reinicialização da ferramenta gateway.
- `commands.useAccessGroups: false` permite que os comandos ignorem as listas de permissão/políticas de grupo de acesso.
- Comandos de barra e diretivas só são honrados para **remetentes autorizados**. A autorização é derivada das listas de permissão/emparelhamento do canal mais `commands.useAccessGroups`.

### `web` (tempo de execução do canal web do WhatsApp)

O WhatsApp funciona através do canal web do gateway (Baileys Web). Ele inicia automaticamente quando existe uma sessão vinculada.
Defina `web.enabled: false` para mantê-lo desligado por padrão.

```json5
{
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0
    }
  }
}
```

### `channels.telegram` (transporte do bot)

O ZERO inicia o Telegram apenas quando existe uma seção de configuração `channels.telegram`. O token do bot é resolvido a partir de `channels.telegram.botToken` (ou `channels.telegram.tokenFile`), com `TELEGRAM_BOT_TOKEN` como fallback para a conta padrão.
Defina `channels.telegram.enabled: false` para desativar a inicialização automática.
O suporte a múltiplas contas reside em `channels.telegram.accounts` (veja a seção de múltiplas contas acima). Tokens de ambiente aplicam-se apenas à conta padrão.
Defina `channels.telegram.configWrites: false` para bloquear gravações de configuração iniciadas pelo Telegram (incluindo migrações de ID de supergrupo e `/config set|unset`).

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "seu-token-do-bot",
      dmPolicy: "pairing",                 // pairing | allowlist | open | disabled
      allowFrom: ["tg:123456789"],         // opcional; "open" requer ["*"]
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Mantenha as respostas breves.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Mantenha-se no tópico."
            }
          }
        }
      },
      customCommands: [
        { command: "backup", description: "Backup do Git" },
        { command: "generate", description: "Criar uma imagem" }
      ],
      historyLimit: 50,                     // inclui as últimas N mensagens do grupo como contexto (0 desativa)
      replyToMode: "first",                 // off | first | all
      linkPreview: true,                   // alterna prévias de links de saída
      streamMode: "partial",               // off | partial | block (streaming de rascunho; separado do streaming de bloco)
      draftChunk: {                        // opcional; apenas para streamMode=block
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph"       // paragraph | newline | sentence
      },
      actions: { reactions: true, sendMessage: true }, // portões de ação de ferramenta (false desativa)
      reactionNotifications: "own",   // off | own | all
      mediaMaxMb: 5,
      retry: {                             // política de retentativa de saída
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1
      },
      network: {                           // sobrescritas de transporte
        autoSelectFamily: false
      },
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://exemplo.com/telegram-webhook",
      webhookSecret: "segredo",
      webhookPath: "/telegram-webhook"
    }
  }
}
```

Notas sobre streaming de rascunho:

- Usa `sendMessageDraft` do Telegram (balão de rascunho, não uma mensagem real).
- Requer **tópicos de chat privado** (message_thread_id em DMs; o bot tem tópicos habilitados).
- `/reasoning stream` transmite o raciocínio para o rascunho e, em seguida, envia a resposta final.
Os padrões e o comportamento da política de retentativa estão documentados em [Política de Retentativa](/concepts/retry).

### `channels.discord` (transporte do bot)

Configure o bot do Discord definindo o token do bot e controles opcionais:
O suporte a múltiplas contas reside em `channels.discord.accounts` (veja a seção de múltiplas contas acima). Tokens de ambiente aplicam-se apenas à conta padrão.

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "seu-token-do-bot",
      mediaMaxMb: 8,                          // limita o tamanho da mídia de entrada
      allowBots: false,                       // permite mensagens escritas por bots
      actions: {                              // portões de ação de ferramenta (false desativa)
        reactions: true,
        stickers: true,
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
        voiceStatus: true,
        events: true,
        moderation: false
      },
      replyToMode: "off",                     // off | first | all
      dm: {
        enabled: true,                        // desativa todas as DMs quando false
        policy: "pairing",                    // pairing | allowlist | open | disabled
        allowFrom: ["1234567890", "steipete"], // lista de permissão de DM opcional ("open" requer ["*"])
        groupEnabled: false,                 // habilita DMs em grupo
        groupChannels: ["zero-dm"]          // lista de permissão de DM em grupo opcional
      },
      guilds: {
        "123456789012345678": {               // id da guilda (preferencial) ou slug
          slug: "amigos-do-zero",
          requireMention: false,              // padrão por guilda
          reactionNotifications: "own",       // off | own | all | allowlist
          users: ["987654321098765432"],      // lista de permissão de usuário por guilda opcional
          channels: {
            geral: { allow: true },
            ajuda: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["docs"],
              systemPrompt: "Apenas respostas curtas."
            }
          }
        }
      },
      historyLimit: 20,                       // inclui as últimas N mensagens da guilda como contexto
      textChunkLimit: 2000,                   // tamanho opcional da parte de texto de saída (caracteres)
      chunkMode: "length",                    // modo opcional de divisão (length | newline)
      maxLinesPerMessage: 17,                 // máximo suave de linhas por mensagem (clipping da UI do Discord)
      retry: {                                // política de retentativa de saída
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

O ZERO inicia o Discord apenas quando uma seção de configuração `channels.discord` existe. O token é resolvido a partir de `channels.discord.token`, com `DISCORD_BOT_TOKEN` como fallback para a conta padrão (a menos que `channels.discord.enabled` seja `false`). Use `user:<id>` (DM) ou `channel:<id>` (canal da guilda) ao especificar alvos de entrega para comandos cron/CLI; IDs numéricos puros são ambíguos e rejeitados.
As slugs das guildas estão em letras minúsculas com espaços substituídos por `-`; as chaves do canal usam o nome do canal em formato slug (sem o `#` inicial). Prefira IDs de guilda como chaves para evitar ambiguidade em renomeações.
Mensagens escritas por bots são ignoradas por padrão. Ative com `channels.discord.allowBots` (as próprias mensagens ainda são filtradas para evitar loops de auto-resposta).
Modos de notificação de reação:

- `off`: sem eventos de reação.
- `own`: reações nas próprias mensagens do bot (padrão).
- `all`: todas as reações em todas as mensagens.
- `allowlist`: reações de `guilds.<id>.users` em todas as mensagens (lista vazia desativa).
O texto de saída é dividido por `channels.discord.textChunkLimit` (padrão 2000). Defina `channels.discord.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da divisão por comprimento. Os clientes do Discord podem cortar mensagens muito altas, então `channels.discord.maxLinesPerMessage` (padrão 17) divide respostas longas de várias linhas mesmo quando abaixo de 2000 caracteres.
Os padrões e o comportamento da política de retentativa estão documentados em [Política de Retentativa](/concepts/retry).

### `channels.googlechat` (webhook da API do Chat)

O Google Chat funciona através de webhooks HTTP com autenticação em nível de aplicativo (conta de serviço).
O suporte a múltiplas contas reside em `channels.googlechat.accounts` (veja a seção de múltiplas contas acima). Variáveis de ambiente aplicam-se apenas à conta padrão.

```json5
{
  channels: {
    "googlechat": {
      enabled: true,
      serviceAccountFile: "/caminho/para/conta-de-servico.json",
      audienceType: "app-url",             // app-url | project-number
      audience: "https://gateway.exemplo.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890",        // opcional; melhora a detecção de menção
      dm: {
        enabled: true,
        policy: "pairing",                // pairing | allowlist | open | disabled
        allowFrom: ["users/1234567890"]   // opcional; "open" requer ["*"]
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { allow: true, requireMention: true }
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20
    }
  }
}
```

Notas:

- O JSON da conta de serviço pode ser inline (`serviceAccount`) ou baseado em arquivo (`serviceAccountFile`).
- Fallbacks de ambiente para a conta padrão: `GOOGLE_CHAT_SERVICE_ACCOUNT` ou `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- `audienceType` + `audience` devem corresponder à configuração de autenticação do webhook do aplicativo Chat.
- Use `spaces/<spaceId>` ou `users/<userId|email>` ao definir alvos de entrega.

### `channels.slack` (modo socket)

O Slack funciona no Modo Socket e requer tanto um token de bot quanto um token de aplicativo:

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["U123", "U456", "*"], // opcional; "open" requer ["*"]
        groupEnabled: false,
        groupChannels: ["G123"]
      },
      channels: {
        C123: { allow: true, requireMention: true, allowBots: false },
        "#geral": {
          allow: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "Apenas respostas curtas."
        }
      },
      historyLimit: 50,          // inclui as últimas N mensagens do canal/grupo como contexto (0 desativa)
      allowBots: false,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["U123"],
      replyToMode: "off",           // off | first | all
      thread: {
        historyScope: "thread",     // thread | channel
        inheritParent: false
      },
      actions: {
        reactions: true,
        messages: true,
        pins: true,
        memberInfo: true,
        emojiList: true
      },
      slashCommand: {
        enabled: true,
        name: "zero",
        sessionPrefix: "slack:slash",
        ephemeral: true
      },
      textChunkLimit: 4000,
      chunkMode: "length",
      mediaMaxMb: 20
    }
  }
}
```

O suporte a múltiplas contas reside em `channels.slack.accounts` (veja a seção de múltiplas contas acima). Tokens de ambiente aplicam-se apenas à conta padrão.

O ZERO inicia o Slack quando o provedor está habilitado e ambos os tokens estão configurados (via config ou `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`). Use `user:<id>` (DM) ou `channel:<id>` ao especificar alvos de entrega para comandos cron/CLI.
Defina `channels.slack.configWrites: false` para bloquear gravações de configuração iniciadas pelo Slack (incluindo migrações de ID de canal e `/config set|unset`).

Mensagens escritas por bots são ignoradas por padrão. Ative com `channels.slack.allowBots` ou `channels.slack.channels.<id>.allowBots`.

Modos de notificação de reação:

- `off`: sem eventos de reação.
- `own`: reações nas próprias mensagens do bot (padrão).
- `all`: todas as reações em todas as mensagens.
- `allowlist`: reações de `channels.slack.reactionAllowlist` em todas as mensagens (lista vazia desativa).

Isolamento de sessão de thread:

- `channels.slack.thread.historyScope` controla se o histórico da thread é por thread (`thread`, padrão) ou compartilhado pelo canal (`channel`).
- `channels.slack.thread.inheritParent` controla se as novas sessões de thread herdam o histórico do canal pai (padrão: false).

Grupos de ação do Slack (controlam ações da ferramenta `slack`):

| Grupo de ação | Padrão | Notas |
| --- | --- | --- |
| reactions | habilitado | Reagir + listar reações |
| messages | habilitado | Ler/enviar/editar/deletar |
| pins | habilitado | Fixar/desafixar/listar |
| memberInfo | habilitado | Informações do membro |
| emojiList | habilitado | Lista de emojis personalizados |

### `channels.mattermost` (token do bot)

O Mattermost vem como um plugin e não está incluído na instalação principal.
Instale-o primeiro: `zero plugins install @zero/mattermost` (ou `./extensions/mattermost` a partir de um checkout do git).

O Mattermost requer um token de bot e a URL base para o seu servidor:

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.exemplo.com",
      dmPolicy: "pairing",
      chatmode: "oncall", // oncall | onmessage | onchar
      oncharPrefixes: [">", "!"],
      textChunkLimit: 4000,
      chunkMode: "length"
    }
  }
}
```

O ZERO inicia o Mattermost quando a conta está configurada (token do bot + URL base) e habilitada. O token + URL base são resolvidos a partir de `channels.mattermost.botToken` + `channels.mattermost.baseUrl` ou `MATTERMOST_BOT_TOKEN` + `MATTERMOST_URL` para la conta padrão (a menos que `channels.mattermost.enabled` seja `false`).

Modos de chat:

- `oncall` (padrão): responde a mensagens de canal apenas quando @mencionado.
- `onmessage`: responde a todas as mensagens do canal.
- `onchar`: responde quando uma mensagem começa com um prefixo de gatilho (`channels.mattermost.oncharPrefixes`, padrão `[">", "!"]`).

Controle de acesso:

- DMs padrão: `channels.mattermost.dmPolicy="pairing"` (remetentes desconhecidos recebem um código de emparelhamento).
- DMs públicas: `channels.mattermost.dmPolicy="open"` mais `channels.mattermost.allowFrom=["*"]`.
- Grupos: `channels.mattermost.groupPolicy="allowlist"` por padrão (com restrição de menção). Use `channels.mattermost.groupAllowFrom` para restringir remetentes.

O suporte a múltiplas contas reside em `channels.mattermost.accounts` (veja a seção de múltiplas contas acima). Variáveis de ambiente aplicam-se apenas à conta padrão.
Use `channel:<id>` ou `user:<id>` (ou `@username`) ao especificar alvos de entrega; IDs puros são tratados como IDs de canal.

### `channels.signal` (signal-cli)

Reações do Signal podem emitir eventos do sistema (ferramental de reação compartilhado):

```json5
{
  channels: {
    signal: {
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50 // inclui as últimas N mensagens do grupo como contexto (0 desativa)
    }
  }
}
```

Modos de notificação de reação:

- `off`: sem eventos de reação.
- `own`: reações nas próprias mensagens do bot (padrão).
- `all`: todas as reações em todas as mensagens.
- `allowlist`: reações de `channels.signal.reactionAllowlist` em todas as mensagens (lista vazia desativa).

### `channels.imessage` (CLI imsg)

O ZERO inicia o `imsg rpc` (JSON-RPC sobre stdio). Nenhum daemon ou porta é necessário.

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
      remoteHost: "user@gateway-host", // SCP para anexos remotos ao usar wrapper SSH
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "user@exemplo.com", "chat_id:123"],
      historyLimit: 50,    // inclui as últimas N mensagens do grupo como contexto (0 desativa)
      includeAttachments: false,
      mediaMaxMb: 16,
      service: "auto",
      region: "US"
    }
  }
}
```

O suporte a múltiplas contas reside em `channels.imessage.accounts` (veja a seção de múltiplas contas acima).

Notas:

- Requer Acesso Total ao Disco para o banco de dados de Mensagens.
- O primeiro envio solicitará permissão de automação das Mensagens.
- Prefira alvos `chat_id:<id>`. Use `imsg chats --limit 20` para listar os chats.
- `channels.imessage.cliPath` pode apontar para um script wrapper (ex: `ssh` para outro Mac que roda `imsg rpc`); use chaves SSH para evitar solicitações de senha.
- Para wrappers SSH remotos, defina `channels.imessage.remoteHost` para buscar anexos via SCP quando `includeAttachments` estiver habilitado.

Exemplo de wrapper:

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

### `agents.defaults.workspace`

Define o **único diretório de espaço de trabalho global** usado pelo agente para operações de arquivo.

Padrão: `~/zero`.

```json5
{
  agents: { defaults: { workspace: "~/zero" } }
}
```

Se `agents.defaults.sandbox` estiver habilitado, as sessões não-principais podem sobrescrever isso com seus próprios espaços de trabalho por escopo em `agents.defaults.sandbox.workspaceRoot`.

### `agents.defaults.repoRoot`

Raiz opcional do repositório para mostrar na linha Runtime do prompt do sistema. Se não estiver definido, o ZERO tenta detectar um diretório `.git` subindo a partir do espaço de trabalho (e do diretório de trabalho atual). O caminho deve existir para ser usado.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/zero" } }
}
```

### `agents.defaults.skipBootstrap`

Desativa a criação automática dos arquivos de bootstrap do espaço de trabalho (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md` e `BOOTSTRAP.md`).

Use isso para implantações pré-configuradas onde seus arquivos de espaço de trabalho vêm de um repositório.

```json5
{
  agents: { defaults: { skipBootstrap: true } }
}
```

### `agents.defaults.bootstrapMaxChars`

Número máximo de caracteres de cada arquivo de bootstrap do espaço de trabalho injetado no prompt do sistema antes do truncamento. Padrão: `20000`.

Quando um arquivo excede esse limite, o ZERO registra um aviso e injeta um cabeçalho/rodapé truncado com um marcador.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } }
}
```

### `agents.defaults.userTimezone`

Define o fuso horário do usuário para o **contexto do prompt do sistema** (não para carimbos de data/hora em envelopes de mensagem). Se não definido, o ZERO usa o fuso horário do host em tempo de execução.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } }
}
```

### `agents.defaults.timeFormat`

Controla o **formato de hora** mostrado na seção Current Date & Time do prompt do sistema.
Padrão: `auto` (preferência do sistema operacional).

```json5
{
  agents: { defaults: { timeFormat: "auto" } } // auto | 12 | 24
}
```

### `messages`

Controla prefixos de entrada/saída e reações de ack opcionais.
Veja [Mensagens](/concepts/messages) para fila, sessões e contexto de streaming.

```json5
{
  messages: {
    responsePrefix: "∅", // ou "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions",
    removeAckAfterReply: false
  }
}
```

`responsePrefix` é aplicado a **todas as respostas de saída** (resumos de ferramentas, streaming de bloco, respostas finais) em todos os canais, a menos que já esteja presente.

Se `messages.responsePrefix` não estiver definido, nenhum prefixo será aplicado por padrão. As respostas de auto-chat do WhatsApp são a exceção: elas assumem o padrão `[{identity.name}]` quando definido, caso contrário `[zero]`, para que as conversas no mesmo telefone permaneçam legíveis.
Defina como `"auto"` para derivar `[{identity.name}]` para o agente roteado (quando definido).

#### Variáveis de modelo

A string `responsePrefix` pode incluir variáveis de modelo que resolvem dinamicamente:

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `{model}` | Nome curto do modelo | `claude-opus-4-5`, `gpt-4o` |
| `{modelFull}` | Identificador completo do modelo | `anthropic/claude-opus-4-5` |
| `{provider}` | Nome do provedor | `anthropic`, `openai` |
| `{thinkingLevel}` | Nível de pensamento atual | `high`, `low`, `off` |
| `{identity.name}` | Nome da identidade do agente | (mesmo que no modo `"auto"`) |

As variáveis não diferenciam maiúsculas de minúsculas (`{MODEL}` = `{model}`). `{think}` é um alias para `{thinkingLevel}`.
Variáveis não resolvidas permanecem como texto literal.

```json5
{
  messages: {
    responsePrefix: "[{model} | think:{thinkingLevel}]"
  }
}
```

Exemplo de saída: `[claude-opus-4-5 | think:high] Aqui está minha resposta...`

O prefixo de entrada do WhatsApp é configurado via `channels.whatsapp.messagePrefix` (obsoleto: `messages.messagePrefix`). O padrão permanece **inalterado**: `"[zero]"` quando `channels.whatsapp.allowFrom` está vazio, caso contrário `""` (sem prefixo). Ao usar `"[zero]"`, o ZERO usará em vez disso `[{identity.name}]` quando o agente roteado tiver `identity.name` definido.

`ackReaction` envia uma reação de emoji de melhor esforço para confirmar mensagens de entrada nos canais que suportam reações (Slack/Discord/Telegram/Google Chat). O padrão é o `identity.emoji` do agente ativo quando definido, caso contrário `"👀"`. Defina como `""` para desativar.

`ackReactionScope` controla quando as reações disparam:

- `group-mentions` (padrão): apenas quando um grupo/sala requer menções **e** o bot foi mencionado
- `group-all`: todas as mensagens de grupo/sala
- `direct`: apenas mensagens diretas
- `all`: todas as mensagens

`removeAckAfterReply` remove a reação de ack do bot após uma resposta ser enviada (apenas Slack/Discord/Telegram/Google Chat). Padrão: `false`.

#### `messages.tts`

Habilita conversão de texto em fala (TTS) para respostas de saída. Quando ativado, o ZERO gera áudio usando ElevenLabs ou OpenAI e o anexa às respostas. O Telegram usa notas de voz Opus; outros canais enviam áudio MP3.

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all (inclui respostas de ferramenta/bloco)
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true
      },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.zero/settings/tts.json",
      elevenlabs: {
        apiKey: "chave_api_elevenlabs",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "id_da_voz",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "pt",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0
        }
      },
      openai: {
        apiKey: "chave_api_openai",
        model: "gpt-4o-mini-tts",
        voice: "alloy"
      }
    }
  }
}
```

Notas:

- `messages.tts.auto` controla o auto‑TTS (`off`, `always`, `inbound`, `tagged`).
- `/tts off|always|inbound|tagged` define o modo automático por sessão (sobrescreve a configuração).
- `messages.tts.enabled` é legado; o doctor migra para `messages.tts.auto`.
- `prefsPath` armazena sobrescritas locais (provider/limit/summarize).
- `maxTextLength` é um limite rígido para a entrada de TTS; os resumos são truncados para caber.
- `summaryModel` sobrescreve `agents.defaults.model.primary` para o resumo automático.
  - Aceita referências `provedor/modelo` ou um alias de `agents.defaults.models`.
- `modelOverrides` habilita sobrescritas orientadas por modelo como as tags `[[tts:...]]` (ativado por padrão).
- `/tts limit` e `/tts summary` controlam as configurações de resumo por usuário.
- Os valores de `apiKey` buscam fallback em `ELEVENLABS_API_KEY`/`XI_API_KEY` e `OPENAI_API_KEY`.
- `elevenlabs.baseUrl` sobrescreve a URL base da API da ElevenLabs.
- `elevenlabs.voiceSettings` suporta `stability`/`similarityBoost`/`style` (0..1), `useSpeakerBoost` e `speed` (0.5..2.0).

### `talk`

Padrões para o modo Talk (macOS/iOS/Android). IDs de voz buscam fallback em `ELEVENLABS_VOICE_ID` ou `SAG_VOICE_ID` quando não definidos.
A `apiKey` busca fallback em `ELEVENLABS_API_KEY` (ou no perfil de shell do gateway) quando não definida.
`voiceAliases` permite que as diretivas do Talk usem nomes amigáveis (ex: `"voice":"Zero"`).

```json5
{
  talk: {
    voiceId: "id_da_voz_elevenlabs",
    voiceAliases: {
      Zero: "EXAVITQu4vr4xnSDxMaL",
      Roger: "CwhRBWXzGAHq8TQ4Fs17"
    },
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "chave_api_elevenlabs",
    interruptOnSpeech: true
  }
}
```

### `agents.defaults`

Controla o tempo de execução do agente embutido (modelo/pensamento/verborragia/timeouts).
`agents.defaults.models` define o catálogo de modelos configurado (e atua como a lista de permissão para `/model`).
`agents.defaults.model.primary` define o modelo padrão; `agents.defaults.model.fallbacks` são failovers globais.
`agents.defaults.imageModel` é opcional e é **usado apenas se o modelo primário não tiver entrada de imagem**.
Cada entrada de `agents.defaults.models` pode incluir:

- `alias` (atalho opcional para o modelo, ex: `/opus`).
- `params` (parâmetros de API opcionais específicos do provedor passados na solicitação ao modelo). `params` também é aplicado a execuções de streaming (agente embutido + compactação). Chaves suportadas hoje: `temperature`, `maxTokens`. Elas se mesclam com as opções de tempo de chamada; os valores fornecidos pelo chamador vencem. `temperature` é um ajuste avançado — deixe-o não definido, a menos que você conheça os padrões do modelo e precise de uma alteração.

Exemplo:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5-20250929": {
          params: { temperature: 0.6 }
        },
        "openai/gpt-5.2": {
          params: { maxTokens: 8192 }
        }
      }
    }
  }
}
```

Os modelos Z.AI GLM-4.x habilitam automaticamente o modo de pensamento, a menos que você:

- defina `--thinking off`, ou
- defina `agents.defaults.models["zai/<modelo>"].params.thinking` você mesmo.

O ZERO também traz alguns atalhos de alias integrados. Os padrões só se aplicam quando o modelo já está presente em `agents.defaults.models`:

- `opus` -> `anthropic/claude-opus-4-5`
- `sonnet` -> `anthropic/claude-sonnet-4-5`
- `gpt` -> `openai/gpt-5.2`
- `gpt-mini` -> `openai/gpt-5-mini`
- `gemini` -> `google/gemini-3-pro-preview`
- `gemini-flash` -> `google/gemini-3-flash-preview`

Se você mesmo configurar o mesmo nome de alias (sem diferenciar maiúsculas de minúsculas), o seu valor vencerá (os padrões nunca sobrescrevem).

Exemplo: Opus 4.5 primário com failover MiniMax M2.1 (MiniMax hospedado):

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "minimax/MiniMax-M2.1": { alias: "minimax" }
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: ["minimax/MiniMax-M2.1"]
      }
    }
  }
}
```

Autenticação MiniMax: defina `MINIMAX_API_KEY` (ambiente) ou configure `models.providers.minimax`.

#### `agents.defaults.cliBackends` (fallback de CLI)

Backends de CLI opcionais para execuções de fallback apenas de texto (sem chamadas de ferramentas). Estes são úteis como um caminho de reserva quando os provedores de API falham. O pass-through de imagem é suportado quando você configura um `imageArg` que aceita caminhos de arquivo.

Notas:

- Backends de CLI são **focados em texto**; as ferramentas estão sempre desativadas.
- Sessões são suportadas quando `sessionArg` é definido; os IDs de sessão são persistidos por backend.
- Para o `claude-cli`, os padrões já vêm configurados. Sobrescreva o caminho do comando se o PATH for mínimo (launchd/systemd).

Exemplo:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat"
        }
      }
    }
  }
}
```

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "anthropic/claude-sonnet-4-1": { alias: "Sonnet" },
        "openrouter/deepseek/deepseek-r1:free": {},
        "zai/glm-4.7": {
          alias: "GLM",
          params: {
            thinking: {
              type: "enabled",
              clear_thinking: false
            }
          }
        }
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: [
          "openrouter/deepseek/deepseek-r1:free",
          "openrouter/meta-llama/llama-3.3-70b-instruct:free"
        ]
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: [
          "openrouter/google/gemini-2.0-flash-vision:free"
        ]
      },
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      heartbeat: {
        every: "30m",
        target: "last"
      },
      maxConcurrent: 3,
      subagents: {
        model: "minimax/MiniMax-M2.1",
        maxConcurrent: 1,
        archiveAfterMinutes: 60
      },
      exec: {
        backgroundMs: 10000,
        timeoutSec: 1800,
        cleanupMs: 1800000
      },
      contextTokens: 200000
    }
  }
}
```

#### `agents.defaults.contextPruning` (poda do resultado da ferramenta)

`agents.defaults.contextPruning` poda os **resultados de ferramentas antigos** do contexto na memória logo antes de uma solicitação ser enviada ao LLM. Isso **não** modifica o histórico da sessão no disco (`*.jsonl` permanece completo).

O objetivo é reduzir o uso de tokens para agentes prolixos que acumulam grandes saídas de ferramentas ao longo do tempo.

Visão geral:

- Nunca toca em mensagens do usuário/assistente.
- Protege as últimas `keepLastAssistants` mensagens do assistente (nenhum resultado de ferramenta após esse ponto é podado).
- Protege o prefixo de bootstrap (nada antes da primeira mensagem do usuário é podado).
- Modos:
  - `adaptive`: corta levemente (soft-trim) os resultados de ferramentas excessivamente grandes (mantém o início/fim) quando a proporção estimada do contexto cruza o `softTrimRatio`. Em seguida, limpa completamente (hard-clear) os resultados de ferramentas elegíveis mais antigos quando a proporção estimada do contexto cruza o `hardClearRatio` **e** há volume suficiente de resultados de ferramentas podáveis (`minPrunableToolChars`).
  - `aggressive`: sempre substitui os resultados de ferramentas elegíveis antes do ponto de corte pelo `hardClear.placeholder` (sem verificações de proporção).

Poda leve (soft) vs. pesada (hard) (o que muda no contexto enviado ao LLM):

- **Soft-trim**: apenas para resultados de ferramentas *muito grandes*. Mantém o início + fim e insere `...` no meio.
  - Antes: `toolResult("…saída muito longa…")`
  - Depois: `toolResult("INÍCIO…\n...\n…FIM\n\n[Resultado da ferramenta cortado: …]")`
- **Hard-clear**: substitui todo o resultado da ferramenta pelo marcador de posição (placeholder).
  - Antes: `toolResult("…saída muito longa…")`
  - Depois: `toolResult("[Conteúdo do resultado da ferramenta antigo removido]")`

Notas / limitações atuais:

- Resultados de ferramentas contendo **blocos de imagem são ignorados** (nunca cortados/removidos) no momento.
- A "proporção de contexto" estimada é baseada em **caracteres** (aproximado), não em tokens exatos.
- Se a sessão ainda não contiver pelo menos `keepLastAssistants` mensagens do assistente, a poda é ignorada.
- No modo `aggressive`, o `hardClear.enabled` é ignorado (resultados de ferramentas elegíveis são sempre substituídos pelo `hardClear.placeholder`).

Padrão (adaptativo):

```json5
{
  agents: { defaults: { contextPruning: { mode: "adaptive" } } }
}
```

Para desativar:

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } }
}
```

Padrões (quando o `mode` é `"adaptive"` ou `"aggressive"`):

- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3` (apenas adaptativo)
- `hardClearRatio`: `0.5` (apenas adaptativo)
- `minPrunableToolChars`: `50000` (apenas adaptativo)
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }` (apenas adaptativo)
- `hardClear`: `{ enabled: true, placeholder: "[Conteúdo do resultado da ferramenta antigo removido]" }`

Exemplo (agressivo, mínimo):

```json5
{
  agents: { defaults: { contextPruning: { mode: "aggressive" } } }
}
```

Exemplo (adaptativo ajustado):

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "adaptive",
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Conteúdo do resultado da ferramenta antigo removido]" },
        // Opcional: restringir a poda a ferramentas específicas (a negação vence; suporta curingas "*")
        tools: { deny: ["browser", "canvas"] },
      }
    }
  }
}
```

Veja [/concepts/session-pruning](/concepts/session-pruning) para detalhes de comportamento.

#### `agents.defaults.compaction` (headroom de reserva + limpeza de memória)

`agents.defaults.compaction.mode` seleciona a estratégia de sumarização de compactação. O padrão é `default`; defina para `safeguard` para habilitar a sumarização por partes (chunked) para históricos muito longos. Veja [/concepts/compaction](/concepts/compaction).

`agents.defaults.compaction.reserveTokensFloor` impõe um valor mínimo de `reserveTokens` para a compactação do Pi (padrão: `20000`). Defina como `0` para desativar o mínimo.

`agents.defaults.compaction.memoryFlush` executa um turno agentic **silencioso** antes da auto-compactação, instruindo o modelo a armazenar memórias duráveis no disco (ex: `memory/AAAA-MM-DD.md`). Ele é disparado quando a estimativa de tokens da sessão cruza um limite suave abaixo do limite de compactação.

Padrões legados:

- `memoryFlush.enabled`: `true`
- `memoryFlush.softThresholdTokens`: `4000`
- `memoryFlush.prompt` / `memoryFlush.systemPrompt`: padrões integrados com `NO_REPLY`
- Nota: a limpeza de memória é ignorada quando o espaço de trabalho da sessão é apenas de leitura
  (`agents.defaults.sandbox.workspaceAccess: "ro"` ou `"none"`).

Exemplo (ajustado):

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard",
        reserveTokensFloor: 24000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Sessão próxima da compactação. Armazene memórias duráveis agora.",
          prompt: "Escreva quaisquer notas duradouras em memory/AAAA-MM-DD.md; responda com NO_REPLY se não houver nada para armazenar."
        }
      }
    }
  }
}
```

Streaming de blocos:

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (padrão off).
- Sobrescritas de canal: `*.blockStreaming` (e variantes por conta) para forçar o streaming de blocos como on/off.
  Canais que não são o Telegram requerem um `*.blockStreaming: true` explícito para habilitar respostas de blocos.
- `agents.defaults.blockStreamingBreak`: `"text_end"` ou `"message_end"` (padrão: text_end).
- `agents.defaults.blockStreamingChunk`: divisão suave de blocos transmitidos. O padrão é de 800 a 1200 caracteres, preferindo quebras de parágrafo (`\n\n`), depois quebras de linha e, em seguida, sentenças.
  Exemplo:

  ```json5
  {
    agents: { defaults: { blockStreamingChunk: { minChars: 800, maxChars: 1200 } } }
  }
  ```

- `agents.defaults.blockStreamingCoalesce`: mescla blocos transmitidos antes de enviar.
  O padrão é `{ idleMs: 1000 }` e herda `minChars` de `blockStreamingChunk` com `maxChars` limitado ao limite de texto do canal. Signal/Slack/Discord/Google Chat assumem o padrão `minChars: 1500`, a menos que sejam sobrescritos.
  Sobrescritas de canal: `channels.whatsapp.blockStreamingCoalesce`, `channels.telegram.blockStreamingCoalesce`,
  `channels.discord.blockStreamingCoalesce`, `channels.slack.blockStreamingCoalesce`, `channels.mattermost.blockStreamingCoalesce`,
  `channels.signal.blockStreamingCoalesce`, `channels.imessage.blockStreamingCoalesce`, `channels.msteams.blockStreamingCoalesce`,
  `channels.googlechat.blockStreamingCoalesce`
  (e variantes por conta).
- `agents.defaults.humanDelay`: pausa aleatória entre as **respostas de blocos** após a primeira.
  Modos: `off` (padrão), `natural` (800–2500ms), `custom` (use `minMs`/`maxMs`).
  Sobrescrita por agente: `agents.list[].humanDelay`.
  Exemplo:

  ```json5
  {
    agents: { defaults: { humanDelay: { mode: "natural" } } }
  }
  ```

Veja [/concepts/streaming](/concepts/streaming) para detalhes de comportamento + divisão.

Indicadores de digitação:

- `agents.defaults.typingMode`: `"never" | "instant" | "thinking" | "message"`. O padrão é `instant` para chats diretos / menções e `message` para chats de grupo sem menção.
- `session.typingMode`: sobrescrita do modo por sessão.
- `agents.defaults.typingIntervalSeconds`: frequência com que o sinal de digitação é atualizado (padrão: 6s).
- `session.typingIntervalSeconds`: sobrescrita do intervalo de atualização por sessão.
Veja [/concepts/typing-indicators](/concepts/typing-indicators) para detalhes de comportamento.

`agents.defaults.model.primary` deve ser definido como `provedor/modelo` (ex: `anthropic/claude-opus-4-5`).
Os aliases vêm de `agents.defaults.models.*.alias` (ex: `Opus`).
Se você omitir o provedor, o ZERO atualmente assume `anthropic` como um fallback de depreciação temporário.
Os modelos Z.AI estão disponíveis como `zai/<modelo>` (ex: `zai/glm-4.7`) e requerem `ZAI_API_KEY` (ou o legado `Z_AI_API_KEY`) no ambiente.

`agents.defaults.heartbeat` configura execuções periódicas de batimento cardíaco (heartbeat):

- `every`: string de duração (`ms`, `s`, `m`, `h`); unidade padrão minutos. Padrão: `30m`. Defina como `0m` para desativar.
- `model`: modelo de sobrescrita opcional para execuções de heartbeat (`provedor/modelo`).
- `includeReasoning`: quando `true`, os heartbeats também entregarão a mensagem separada `Reasoning:` quando disponível (mesmo formato que `/reasoning on`). Padrão: `false`.
- `session`: chave de sessão opcional para controlar em qual sessão o heartbeat é executado. Padrão: `main`.
- `to`: destinatário de sobrescrita opcional (id específico do canal, ex: E.164 para WhatsApp, chat id para Telegram).
- `target`: canal de entrega opcional (`last`, `whatsapp`, `telegram`, `discord`, `slack`, `msteams`, `signal`, `imessage`, `none`). Padrão: `last`.
- `prompt`: sobrescrita opcional para o corpo do heartbeat (padrão: `Leia HEARTBEAT.md se ele existir (contexto do espaço de trabalho). Siga-o estritamente. Não infira ou repita tarefas antigas de conversas anteriores. Se nada precisar de atenção, responda HEARTBEAT_OK.`). As sobrescritas são enviadas literalmente; inclua uma linha `Leia HEARTBEAT.md` se você ainda quiser que o arquivo seja lido.
- `ackMaxChars`: máximo de caracteres permitidos após `HEARTBEAT_OK` antes da entrega (padrão: 300).

Heartbeats por agente:

- Defina `agents.list[].heartbeat` para habilitar ou sobrescrever as configurações de heartbeat para um agente específico.
- Se qualquer entrada de agente definir `heartbeat`, **apenas esses agentes** executarão heartbeats; os padrões tornam-se a base compartilhada para esses agentes.

Heartbeats executam turnos completos do agente. Intervalos mais curtos consomem mais tokens; fique atento ao `every`, mantenha o `HEARTBEAT.md` minúsculo e/ou escolha um `modelo` mais barato.

`tools.exec` configura os padrões de execução em background:

- `backgroundMs`: tempo antes do auto-background (ms, padrão 10000)
- `timeoutSec`: encerramento automático após esse tempo de execução (segundos, padrão 1800)
- `cleanupMs`: por quanto tempo manter sessões finalizadas na memória (ms, padrão 1800000)
- `notifyOnExit`: enfileira um evento do sistema + solicita heartbeat quando o exec em background encerra (padrão true)
- `applyPatch.enabled`: habilita o experimental `apply_patch` (apenas OpenAI/OpenAI Codex; padrão false)
- `applyPatch.allowModels`: lista de permissão opcional de IDs de modelo (ex: `gpt-5.2` ou `openai/gpt-5.2`)
Nota: `applyPatch` está apenas sob `tools.exec`.

`tools.web` configura as ferramentas de busca + captura web:

- `tools.web.search.enabled` (padrão: true quando a chave está presente)
- `tools.web.search.apiKey` (recomendado: definir via `zero configure --section web`, ou usar a variável de ambiente `BRAVE_API_KEY`)
- `tools.web.search.maxResults` (1–10, padrão 5)
- `tools.web.search.timeoutSeconds` (padrão 30)
- `tools.web.search.cacheTtlMinutes` (padrão 15)
- `tools.web.fetch.enabled` (padrão true)
- `tools.web.fetch.maxChars` (padrão 50000)
- `tools.web.fetch.timeoutSeconds` (padrão 30)
- `tools.web.fetch.cacheTtlMinutes` (padrão 15)
- `tools.web.fetch.userAgent` (sobrescrita opcional)
- `tools.web.fetch.readability` (padrão true; desative para usar apenas a limpeza básica de HTML)
- `tools.web.fetch.firecrawl.enabled` (padrão true quando uma chave de API está definida)
- `tools.web.fetch.firecrawl.apiKey` (opcional; padrão é `FIRECRAWL_API_KEY`)
- `tools.web.fetch.firecrawl.baseUrl` (padrão <https://api.firecrawl.dev>)
- `tools.web.fetch.firecrawl.onlyMainContent` (padrão true)
- `tools.web.fetch.firecrawl.maxAgeMs` (opcional)
- `tools.web.fetch.firecrawl.timeoutSeconds` (opcional)

`tools.media` configura a compreensão de mídias de entrada (imagem/áudio/vídeo):

- `tools.media.models`: lista de modelos compartilhada (com etiquetas de capacidade; usada após as listas por capacidade).
- `tools.media.concurrency`: máximo de execuções simultâneas de capacidade (padrão 2).
- `tools.media.image` / `tools.media.audio` / `tools.media.video`:
  - `enabled`: chave de desativação (padrão true quando os modelos estão configurados).
  - `prompt`: sobrescrita opcional do prompt (imagem/vídeo anexam uma dica de `maxChars` automaticamente).
  - `maxChars`: máximo de caracteres de saída (padrão 500 para imagem/vídeo; não definido para áudio).
  - `maxBytes`: tamanho máximo de mídia a ser enviado (padrões: imagem 10MB, áudio 20MB, vídeo 50MB).
  - `timeoutSeconds`: timeout da solicitação (padrões: imagem 60s, áudio 60s, vídeo 120s).
  - `language`: dica opcional de idioma do áudio.
  - `attachments`: política de anexos (`mode`, `maxAttachments`, `prefer`).
  - `scope`: controle opcional (o primeiro que corresponder vence) com `match.channel`, `match.chatType` ou `match.keyPrefix`.
  - `models`: lista ordenada de entradas de modelo; falhas ou mídias acima do tamanho tentam a próxima entrada da lista.
- Cada entrada em `models[]`:
  - Entrada de provedor (`type: "provider"` ou omitido):
    - `provider`: ID do provedor de API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc).
    - `model`: sobrescrita do ID do modelo (obrigatório para imagem; assume o padrão `gpt-4o-mini-transcribe`/`whisper-large-v3-turbo` para provedores de áudio e `gemini-3-flash-preview` for video).
    - `profile` / `preferredProfile`: seleção de perfil de autenticação.
  - Entrada de CLI (`type: "cli"`):
    - `command`: executável para rodar.
    - `args`: argumentos com modelo (suporta `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc).
  - `capabilities`: lista opcional (`image`, `audio`, `video`) para controlar uma entrada compartilhada. Padrões quando omitido: `openai`/`anthropic`/`minimax` → image, `google` → image+audio+video, `groq` → audio.
  - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language` podem ser sobrescritas por entrada.

Se nenhum modelo estiver configurado (ou `enabled: false`), a compreensão é pulada; o modelo ainda recebe os anexos originais.

A autenticação do provedor segue a ordem padrão de autenticação do modelo (perfis de autenticação, variáveis de ambiente como `OPENAI_API_KEY`/`GROQ_API_KEY`/`GEMINI_API_KEY` ou `models.providers.*.apiKey`).

Exemplo:

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }]
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] }
        ]
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }]
      }
    }
  }
}
```

`agents.defaults.subagents` configura os padrões dos subagentes:

- `model`: modelo padrão para subagentes gerados (string or `{ primary, fallbacks }`). Se omitido, os subagentes herdam o modelo do chamador, a menos que seja sobrescrito por agente ou por chamada.
- `maxConcurrent`: máximo de execuções simultâneas de subagentes (padrão 1).
- `archiveAfterMinutes`: arquiva automaticamente sessões de subagentes após N minutos (padrão 60; defina como `0` para desativar).
- Política de ferramentas por subagente: `tools.subagents.tools.allow` / `tools.subagents.tools.deny` (a negação vence).

`tools.profile` define uma **lista de permissão base de ferramentas** antes de `tools.allow`/`tools.deny`:

- `minimal`: apenas `session_status`.
- `coding`: `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`.
- `messaging`: `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`.
- `full`: sem restrições (o mesmo que não definido).

Sobrescrita por agente: `agents.list[].tools.profile`.

Exemplo (apenas mensagens por padrão, permite também as ferramentas do Slack + Discord):

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"]
  }
}
```

Exemplo (perfil coding, mas nega exec/process em todo lugar):

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"]
  }
}
```

`tools.byProvider` permite que você **restrinja ainda mais** as ferramentas para provedores específicos (ou um único `provedor/modelo`).
Sobrescrita por agente: `agents.list[].tools.byProvider`.

Ordem: perfil base → perfil do provedor → políticas allow/deny.
As chaves do provedor aceitam tanto o `provedor` (ex: `google-cloud-auth`) quanto o `provedor/modelo` (ex: `openai/gpt-5.2`).

Exemplo (mantém o perfil coding global, mas usa ferramentas mínimas para o Google Google Cloud Auth):

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-cloud-auth": { profile: "minimal" }
    }
  }
}
```

Exemplo (lista de permissão específica por provedor/modelo):

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] }
    }
  }
}
```

`tools.allow` / `tools.deny` configuram uma política global de permissão/negação de ferramentas (a negação vence).
A correspondência não diferencia maiúsculas de minúsculas e suporta curingas `*` (`"*"` significa todas as ferramentas).
Isso se aplica mesmo quando o sandbox Docker está **desligado**.

Exemplo (desativar browser/canvas em todos os lugares):

```json5
{
  tools: { deny: ["browser", "canvas"] }
}
```

Grupos de ferramentas (atalhos) funcionam em políticas de ferramentas **globais** e **por agente**:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:zero`: todas as ferramentas integradas do ZERO (exclui plugins de provedores)

`tools.elevated` controla o acesso elevado (host) ao `exec`:

- `enabled`: permite o modo elevado (padrão true).
- `allowFrom`: listas de permissão por canal (vazio = desativado).
  - `whatsapp`: números E.164.
  - `telegram`: chat ids ou nomes de usuário.
  - `discord`: ids de usuário ou nomes de usuário (busca fallback em `channels.discord.dm.allowFrom` se omitido).
  - `signal`: números E.164.
  - `imessage`: handles/chat ids.
  - `webchat`: session ids ou nomes de usuário.

Exemplo:

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["steipete", "1234567890123"]
      }
    }
  }
}
```

Sobrescrita por agente (restringir ainda mais):

```json5
{
  agents: {
    list: [
      {
        id: "família",
        tools: {
          elevated: { enabled: false }
        }
      }
    ]
  }
}
```

Notas:

- `tools.elevated` é a base global. `agents.list[].tools.elevated` só pode restringir ainda mais (ambos devem permitir).
- `/elevated on|off|ask|full` armazena o estado por chave de sessão; diretivas na linha de comando aplicam-se a uma única mensagem.
- O `exec` elevado roda no host e ignora o sandboxing.
- A política de ferramentas ainda se aplica; se o `exec` for negado, o modo elevado não poderá ser usado.

`agents.defaults.maxConcurrent` define o número máximo de execuções de agentes embutidos que podem rodar em paralelo entre as sessões. Cada sessão ainda é serializada (uma execução por chave de sessão de cada vez). Padrão: 1.

### `agents.defaults.sandbox`

**Sandboxing via Docker** opcional para o agente embutido. Destinado a sessões que não são a principal, para que não possam acessar o sistema host.

Detalhes: [Sandboxing](/gateway/sandboxing)

Padrões (se habilitado):

- escopo: `"agent"` (um contêiner + espaço de trabalho por agente)
- imagem baseada em Debian bookworm-slim
- acesso ao espaço de trabalho do agente: `workspaceAccess: "none"` (padrão)
  - `"none"`: usa um espaço de trabalho de sandbox por escopo em `~/.zero/sandboxes`
- `"ro"`: mantém o espaço de trabalho da sandbox em `/workspace` e monta o espaço de trabalho do agente como apenas leitura em `/agent` (desativa `write`/`edit`/`apply_patch`)
  - `"rw"`: monta o espaço de trabalho do agente como leitura/gravação em `/workspace`
- auto-poda: ocioso > 24h OU idade > 7d
- política de ferramentas: permite apenas `exec`, `process`, `read`, `write`, `edit`, `apply_patch`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status` (a negação vence)
  - configure via `tools.sandbox.tools`, sobrescreva por agente via `agents.list[].tools.sandbox.tools`
  - atalhos de grupo de ferramentas suportados na política do sandbox: `group:runtime`, `group:fs`, `group:sessions`, `group:memory` (veja [Sandbox vs Política de Ferramentas vs Elevado](/gateway/sandbox-vs-tool-policy-vs-elevated#atalhos-de-grupos-de-ferramentas))
- navegador em sandbox opcional (Chromium + CDP, observador noVNC)
- controles de segurança (hardening): `network`, `user`, `pidsLimit`, `memory`, `cpus`, `ulimits`, `seccompProfile`, `apparmorProfile`

Aviso: `scope: "shared"` significa um contêiner compartilhado e um espaço de trabalho compartilhado. Sem isolamento entre sessões. Use `scope: "session"` para isolamento por sessão.

Legado: `perSession` ainda é suportado (`true` → `scope: "session"`, `false` → `scope: "shared"`).

`setupCommand` roda **uma única vez** após o contêiner ser criado (dentro do contêiner via `sh -lc`).
Para instalações de pacotes, certifique-se de ter saída para a rede (egress), um sistema de arquivos raiz gravável e um usuário root.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent é o padrão)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.zero/sandboxes",
        docker: {
          image: "zero-sandbox:bookworm-slim",
          containerPrefix: "zero-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          // Sobrescrita por agente (multi-agente): agents.list[].sandbox.docker.*
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256
          },
          seccompProfile: "/caminho/para/seccomp.json",
          apparmorProfile: "zero-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/var/run/docker.sock:/var/run/docker.sock", "/home/user/source:/source:rw"]
        },
        browser: {
          enabled: false,
          image: "zero-sandbox-browser:bookworm-slim",
          containerPrefix: "zero-sbx-browser-",
          cdpPort: 9222,
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          allowedControlUrls: ["http://10.0.0.42:18791"],
          allowedControlHosts: ["browser.lab.local", "10.0.0.42"],
          allowedControlPorts: [18791],
          autoStart: true,
          autoStartTimeoutMs: 12000
        },
        prune: {
          idleHours: 24,  // 0 desativa a poda por inatividade
          maxAgeDays: 7   // 0 desativa a poda por idade máxima
        }
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
      }
    }
  }
}
```

Construa a imagem padrão da sandbox uma vez com:

```bash
scripts/sandbox-setup.sh
```

Nota: os contêineres de sandbox assumem por padrão `network: "none"`; defina `agents.defaults.sandbox.docker.network` como `"bridge"` (ou sua rede personalizada) se o agente precisar de acesso externo.

Nota: os anexos de entrada são preparados (staged) no espaço de trabalho ativo em `media/inbound/*`. Com `workspaceAccess: "rw"`, isso significa que os arquivos são gravados no espaço de trabalho do agente.

Nota: `docker.binds` monta diretórios de host adicionais; binds globais e por agente são mesclados.

Construa a imagem opcional do navegador com:

```bash
scripts/sandbox-browser-setup.sh
```

Quando `agents.defaults.sandbox.browser.enabled=true`, a ferramenta browser usa uma instância do Chromium em sandbox (CDP). Se o noVNC estiver habilitado (padrão quando headless=false), a URL do noVNC é injetada no prompt do sistema para que o agente possa referenciá-la. Isso não requer `browser.enabled` na configuração principal; a URL de controle do sandbox é injetada por sessão.

`agents.defaults.sandbox.browser.allowHostControl` (padrão: false) permite que as sessões em sandbox mirem explicitamente o servidor de controle do navegador do **host** via ferramenta browser (`target: "host"`). Deixe isso desligado se desejar um isolamento estrito da sandbox.

Listas de permissão para controle remoto:

- `allowedControlUrls`: URLs de controle exatas permitidas para `target: "custom"`.
- `allowedControlHosts`: nomes de host permitidos (apenas o hostname, sem porta).
- `allowedControlPorts`: portas permitidas (padrões: http=80, https=443).
Padrões: todas as listas de permissão não estão definidas (sem restrição). `allowHostControl` assume o padrão false.

### `models` (provedores personalizados + URLs base)

O ZERO usa o catálogo de modelos **pi-coding-agent**. Você pode adicionar provedores personalizados (LiteLLM, servidores locais compatíveis com OpenAI, proxies Anthropic, etc.) escrevendo em `~/.zero/agents/<agentId>/agent/models.json` ou definindo o mesmo esquema dentro da sua configuração do ZERO em `models.providers`.
Visão geral por provedor + exemplos: [/concepts/model-providers](/concepts/model-providers).

Quando `models.providers` está presente, o ZERO grava/mescla um `models.json` em `~/.zero/agents/<agentId>/agent/` na inicialização:

- comportamento padrão: **mesclar** (merge) (mantém os provedores existentes, sobrescreve pelo nome)
- defina `models.mode: "replace"` para sobrescrever o conteúdo do arquivo

Selecione o modelo via `agents.defaults.model.primary` (provedor/modelo).

```json5
{
  agents: {
    defaults: {
      model: { primary: "custom-proxy/llama-3.1-8b" },
      models: {
        "custom-proxy/llama-3.1-8b": {}
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "CHAVE_LITELLM",
        api: "openai-completions",
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000
          }
        ]
      }
    }
  }
}
```

### OpenCode Zen (proxy de múltiplos modelos)

O OpenCode Zen é um gateway de múltiplos modelos com endpoints por modelo. O ZERO usa o provedor integrado `opencode` do pi-ai; defina `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`) em <https://opencode.ai/auth>.

Notas:

- As referências de modelo usam `opencode/<id_modelo>` (exemplo: `opencode/claude-opus-4-5`).
- Se você habilitar uma lista de permissão via `agents.defaults.models`, adicione cada modelo que planeja usar.
- Atalho: `zero onboard --auth-choice opencode-zen`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "opencode/claude-opus-4-5" },
      models: { "opencode/claude-opus-4-5": { alias: "Opus" } }
    }
  }
}
```

### Z.AI (GLM-4.7) — suporte a alias de provedor

Os modelos Z.AI estão disponíveis através do provedor integrado `zai`. Defina `ZAI_API_KEY` em seu ambiente e referencie o modelo por provedor/modelo.

Atalho: `zero onboard --auth-choice zai-api-key`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} }
    }
  }
}
```

Notas:

- `z.ai/*` e `z-ai/*` são aliases aceitos e normalizados para `zai/*`.
- Se a `ZAI_API_KEY` estiver ausente, as solicitações para `zai/*` falharão com um erro de autenticação em tempo de execução.
- Exemplo de erro: `Nenhuma chave de API encontrada para o provedor "zai".`
- O endpoint geral da API do Z.AI é `https://api.z.ai/api/paas/v4`. As solicitações de codificação (coding) GLM usam o endpoint de codificação dedicado `https://api.z.ai/api/coding/paas/v4`. O provedor integrado `zai` usa o endpoint de codificação. Se você precisar do endpoint geral, defina um provedor personalizado em `models.providers` com a sobrescrita da URL base (veja a seção de provedores personalizados acima).
- Use um marcador falso (fake placeholder) em documentações/configurações; nunca publique chaves de API reais.

Use o endpoint compatível com OpenAI da Moonshot:

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: { "moonshot/kimi-k2.5": { alias: "Kimi K2.5" } }
    }
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

Notas:

- Defina `MOONSHOT_API_KEY` no ambiente ou use `zero onboard --auth-choice moonshot-api-key`.
- Referência do modelo: `moonshot/kimi-k2.5`.
- Use `https://api.moonshot.cn/v1` se precisar do endpoint da China.

### Kimi Code

Use o endpoint dedicado compatível com OpenAI do Kimi Code (separado da Moonshot):

```json5
{
  env: { KIMICODE_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-code/kimi-for-coding" },
      models: { "kimi-code/kimi-for-coding": { alias: "Kimi Code" } }
    }
  },
  models: {
    mode: "merge",
    providers: {
      "kimi-code": {
        baseUrl: "https://api.kimi.com/coding/v1",
        apiKey: "${KIMICODE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-for-coding",
            name: "Kimi For Coding",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32768,
            headers: { "User-Agent": "KimiCLI/0.77" },
            compat: { supportsDeveloperRole: false }
          }
        ]
      }
    }
  }
}
```

Notas:

- Defina `KIMICODE_API_KEY` no ambiente ou use `zero onboard --auth-choice kimi-code-api-key`.
- Referência do modelo: `kimi-code/kimi-for-coding`.

### Synthetic (compatível com Anthropic)

Use o endpoint compatível com Anthropic da Synthetic:

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.1" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.1": { alias: "MiniMax M2.1" } }
    }
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536
          }
        ]
      }
    }
  }
}
```

Notas:

- Defina `SYNTHETIC_API_KEY` ou use `zero onboard --auth-choice synthetic-api-key`.
- Referência do modelo: `synthetic/hf:MiniMaxAI/MiniMax-M2.1`.
- A URL base deve omitir `/v1` porque o cliente Anthropic o anexa automaticamente.

### Modelos locais (LM Studio) — configuração recomendada

Veja [/gateway/local-models](/gateway/local-models) para a orientação atual sobre modelos locais. Resumo: execute o MiniMax M2.1 via API Responses do LM Studio em hardware potente; mantenha os modelos hospedados mesclados para fallback.

### MiniMax M2.1

Use o MiniMax M2.1 diretamente sem o LM Studio:

```json5
{
  agent: {
    model: { primary: "minimax/MiniMax-M2.1" },
    models: {
      "anthropic/claude-opus-4-5": { alias: "Opus" },
      "minimax/MiniMax-M2.1": { alias: "Minimax" }
    }
  },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: false,
            input: ["text"],
            // Preços: atualize em models.json se precisar de rastreamento de custo exato.
            cost: { input: 15, output: 60, cacheRead: 2, cacheWrite: 10 },
            contextWindow: 200000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

Notas:

- Defina a variável de ambiente `MINIMAX_API_KEY` ou use `zero onboard --auth-choice minimax-api`.
- Modelo disponível: `MiniMax-M2.1` (padrão).
- Atualize os preços em `models.json` se precisar de rastreamento de custo exato.

### Cerebras (GLM 4.6 / 4.7)

Use Cerebras através de seu endpoint compatível com OpenAI:

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: {
        primary: "cerebras/zai-glm-4.7",
        fallbacks: ["cerebras/zai-glm-4.6"]
      },
      models: {
        "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
        "cerebras/zai-glm-4.6": { alias: "GLM 4.6 (Cerebras)" }
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
          { id: "zai-glm-4.6", name: "GLM 4.6 (Cerebras)" }
        ]
      }
    }
  }
}
```

Notas:

- Use `cerebras/zai-glm-4.7` para Cerebras; use `zai/glm-4.7` para o Z.AI direto.
- Defina `CEREBRAS_API_KEY` no ambiente ou na configuração.

Notas:

- APIs suportadas: `openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`
- Use `authHeader: true` + `headers` para necessidades de autenticação personalizada.
- Sobrescreva a raiz da configuração do agente com `ZERO_AGENT_DIR` (ou `PI_CODING_AGENT_DIR`) se desejar que o `models.json` seja armazenado em outro lugar (padrão: `~/.zero/agents/main/agent`).

### `session`

Controla o escopo da sessão, política de reinicialização (reset), gatilhos de reinicialização e onde o armazenamento da sessão é gravado.

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main",
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"]
    },
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 60
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      dm: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 }
    },
    resetTriggers: ["/new", "/reset"],
    // O padrão já é por agente em ~/.zero/agents/<agentId>/sessions/sessions.json
    // Você pode sobrescrever com a substituição {agentId}:
    store: "~/.zero/agents/{agentId}/sessions/sessions.json",
    // Chats diretos colapsam para agent:<agentId>:<mainKey> (padrão: "main").
    mainKey: "main",
    agentToAgent: {
      // Máximo de turnos de resposta ping-pong entre solicitante/alvo (0–5).
      maxPingPongTurns: 5
    },
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } }
      ],
      default: "allow"
    }
  }
}
```

Campos:

- `mainKey`: chave do balde de chat direto (padrão: `"main"`). Útil quando se deseja "renomear" a thread principal de DM sem alterar o `agentId`.
  - Nota sobre Sandbox: `agents.defaults.sandbox.mode: "non-main"` usa esta chave para detectar a sessão principal. Qualquer chave de sessão que não corresponda a `mainKey` (grupos/canais) é colocada em sandbox.
- `dmScope`: como as sessões de DM são agrupadas (padrão: `"main"`).
  - `main`: todas as DMs compartilham a sessão principal para continuidade.
  - `per-peer`: isola as DMs pelo ID do remetente entre canais.
  - `per-channel-peer`: isola as DMs por canal + remetente (recomendado para caixas de entrada de múltiplos usuários).
  - `per-account-channel-peer`: isola as DMs por conta + canal + remetente (recomendado para caixas de entrada de múltiplas contas).
- `identityLinks`: mapeia IDs canônicos para contatos prefixados pelo provedor, para que a mesma pessoa compartilhe uma sessão de DM entre canais ao usar `per-peer`, `per-channel-peer` ou `per-account-channel-peer`.
  - Exemplo: `alice: ["telegram:123456789", "discord:987654321012345678"]`.
- `reset`: política de reinicialização primária. O padrão é a reinicialização diária às 4:00 AM (horário local) no host do gateway.
  - `mode`: `daily` ou `idle` (padrão: `daily` quando `reset` está presente).
  - `atHour`: hora local (0-23) para o limite de reinicialização diária.
  - `idleMinutes`: janela de inatividade deslizante em minutos. Quando `daily` + `idle` estão configurados, o que expirar primeiro vence.
- `resetByType`: sobrescritas por sessão para `dm`, `group` e `thread`.
  - Se você definir apenas o legado `session.idleMinutes` sem qualquer `reset`/`resetByType`, o ZERO permanece no modo apenas-inatividade para compatibilidade com versões anteriores.
- `heartbeatIdleMinutes`: sobrescrita de inatividade opcional para verificações de batimento cardíaco (heartbeat) (a reinicialização diária ainda se aplica quando habilitada).
- `agentToAgent.maxPingPongTurns`: turnos máximos de resposta entre solicitante/alvo (0–5, padrão 5).
- `sendPolicy.default`: fallback `allow` ou `deny` quando nenhuma regra corresponde.
- `sendPolicy.rules[]`: corresponde por `channel`, `chatType` (`direct|group|room`) ou `keyPrefix` (ex: `cron:`). A primeira negação vence; caso contrário, permite.

### `skills` (configuração de habilidades)

Controla a lista de permissão de pacotes, preferências de instalação, pastas extras de habilidades e sobrescritas por habilidade. Aplica-se às habilidades **integradas** e a `~/.zero/skills` (habilidades do espaço de trabalho ainda vencem em conflitos de nome).

Campos:

- `allowBundled`: lista de permissão opcional apenas para habilidades **integradas**. Se definido, apenas essas habilidades integradas serão elegíveis (habilidades gerenciadas/do espaço de trabalho não são afetadas).
- `load.extraDirs`: diretórios de habilidades adicionais para varrer (menor precedência).
- `install.preferBrew`: prefere instaladores via brew quando disponíveis (padrão: true).
- `install.nodeManager`: preferência do instalador de node (`npm` | `pnpm` | `yarn`, padrão: npm).
- `entries.<skillKey>`: sobrescritas de configuração por habilidade.

Campos por habilidade:

- `enabled`: defina como `false` para desativar uma habilidade, mesmo que ela esteja integrada/instalada.
- `env`: variáveis de ambiente injetadas para a execução do agente (apenas se ainda não estiverem definidas).
- `apiKey`: conveniência opcional para habilidades que declaram uma variável de ambiente primária (ex: `nano-banana-pro` → `GEMINI_API_KEY`).

Exemplo:

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: [
        "~/Projects/agent-scripts/skills",
        "~/Projects/oss/some-skill-pack/skills"
      ]
    },
    install: {
      preferBrew: true,
      nodeManager: "npm"
    },
    entries: {
      "nano-banana-pro": {
        apiKey: "CHAVE_GEMINI_AQUI",
        env: {
          GEMINI_API_KEY: "CHAVE_GEMINI_AQUI"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

### `plugins` (extensões)

Controla a descoberta de plugins, permitir/negar e configuração por plugin. Os plugins são carregados de `~/.zero/extensions`, `<workspace>/.zero/extensions`, além de quaisquer entradas em `plugins.load.paths`. **Alterações na configuração requerem a reinicialização do gateway.**
Consulte [/plugin](/plugin) para uso completo.

Campos:

- `enabled`: alternador principal para o carregamento de plugins (padrão: true).
- `allow`: lista de permissão opcional de IDs de plugins; quando definida, apenas os plugins listados são carregados.
- `deny`: lista de bloqueio opcional de IDs de plugins (negação vence).
- `load.paths`: caminhos ou diretórios de plugins extras para carregar (absolutos ou `~`).
- `entries.<pluginId>`: sobrescritas por plugin.
  - `enabled`: defina como `false` para desativar.
  - `config`: objeto de configuração específico do plugin (validado pelo plugin, se fornecido).

Exemplo:

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    load: {
      paths: ["~/Projects/oss/voice-call-extension"]
    },
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio"
        }
      }
    }
  }
}
```

### `browser` (navegador gerenciado pelo zero)

O ZERO pode iniciar uma instância do Chrome/Brave/Edge/Chromium **dedicada e isolada** para o zero e expor um pequeno serviço de controle de loopback.
Os perfis podem apontar para um navegador baseado em Chromium **remoto** via `profiles.<nome>.cdpUrl`. Os perfis remotos são apenas para anexação (iniciar/parar/reiniciar estão desativados).

`browser.cdpUrl` permanece para configurações legadas de perfil único e como esquema/host base para perfis que apenas definem `cdpPort`.

Padrões:

- habilitado: `true`
- evaluateEnabled: `true` (defina como `false` para desativar `act:evaluate` e `wait --fn`)
- serviço de controle: apenas loopback (porta derivada de `gateway.port`, padrão `18791`)
- URL CDP: `http://127.0.0.1:18792` (serviço de controle + 1, legado perfil único)
- cor do perfil: `#FF4500` (laranja-zero)
- Nota: o servidor de controle é iniciado pelo gateway em execução (barra de menus do ZERO.app ou `zero gateway`).
- Ordem de detecção automática: navegador padrão, se for baseado em Chromium; caso contrário, Chrome → Brave → Edge → Chromium → Chrome Canary.

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    // cdpUrl: "http://127.0.0.1:18792", // sobrescrita legada de perfil único
    defaultProfile: "chrome",
    profiles: {
      zero: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" }
    },
    color: "#FF4500",
    // Avançado:
    // headless: false,
    // noSandbox: false,
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false, // defina como true ao tunelar um CDP remoto para localhost
  }
}
```

### `ui` (Aparência)

Cor de destaque opcional usada pelos aplicativos nativos para a interface (ex: matiz da bolha do Modo Talk).

Se não for definida, os clientes retornam a um azul claro suave.

```json5
{
  ui: {
    seamColor: "#FF4500", // hexadecimal (RRGGBB ou #RRGGBB)
    // Opcional: Controle de sobrescrita da identidade do assistente na UI.
    // Se não definido, a UI de controle usa a identidade do agente ativo (configuração ou IDENTITY.md).
    assistant: {
      name: "ZERO",
      avatar: "CB" // emoji, texto curto ou URL de imagem/URI de dados
    }
  }
}
```

### `gateway` (Modo de servidor Gateway + vinculação)

Use `gateway.mode` para declarar explicitamente se esta máquina deve executar o Gateway.

Padrões:

- modo: **não definido** (tratado como “não iniciar automaticamente”)
- vinculação (bind): `loopback`
- porta: `18789` (porta única para WS + HTTP)

```json5
{
  gateway: {
    mode: "local", // ou "remote"
    port: 18789, // Multiplex de WS + HTTP
    bind: "loopback",
    // controlUi: { enabled: true, basePath: "/zero" }
    // auth: { mode: "token", token: "seu-token" } // o token controla o acesso ao WS + UI de controle
    // tailscale: { mode: "off" | "serve" | "funnel" }
  }
}
```

Caminho base da UI de Controle:

- `gateway.controlUi.basePath` define o prefixo da URL onde a UI de Controle é servida.
- Exemplos: `"/ui"`, `"/zero"`, `"/apps/zero"`.
- Padrão: raiz (`/`) (inalterado).
- `gateway.controlUi.allowInsecureAuth` permite autenticação apenas por token para a UI de Controle quando a identidade do dispositivo é omitida (geralmente sobre HTTP). Padrão: `false`. Prefira HTTPS (Tailscale Serve) ou `127.0.0.1`.
- `gateway.controlUi.dangerouslyDisableDeviceAuth` desativa as verificações de identidade do dispositivo para a UI de Controle (apenas token/senha). Padrão: `false`. Usar apenas em casos de emergência.

Documentos relacionados:

- [UI de Controle](/web/control-ui)
- [Visão geral da Web](/web)
- [Tailscale](/gateway/tailscale)
- [Acesso remoto](/gateway/remote)

Proxies confiáveis:

- `gateway.trustedProxies`: lista de IPs de proxies reversos que terminam o TLS à frente do Gateway.
- Quando uma conexão vem de um desses IPs, o ZERO usa `x-forwarded-for` (ou `x-real-ip`) para determinar o IP do cliente para verificações de emparelhamento local e verificações de autenticação HTTP/local.
- Liste apenas os proxies que você controla totalmente e certifique-se de que eles **sobrescrevam** o `x-forwarded-for` de entrada.

Notas:

- `zero gateway` se recusa a iniciar, a menos que `gateway.mode` esteja definido como `local` (ou que você passe a flag de sobrescrita).
- `gateway.port` controla a porta multiplexada usada para WebSocket + HTTP (UI de controle, hooks, A2UI).
- Endpoint OpenAI Chat Completions: **desativado por padrão**; habilite com `gateway.http.endpoints.chatCompletions.enabled: true`.
- Precedência: `--port` > `ZERO_GATEWAY_PORT` > `gateway.port` > padrão `18789`.
- A autenticação do gateway é obrigatória por padrão (token/senha ou identidade Tailscale Serve). Vinculações que não sejam loopback exigem um token/senha compartilhado.
- O assistente de integração (onboarding wizard) gera um token de gateway por padrão (mesmo em loopback).
- `gateway.remote.token` é **apenas** para chamadas CLI remotas; ele não habilita a autenticação do gateway local. `gateway.token` é ignorado.

Autenticação e Tailscale:

- `gateway.auth.mode` define os requisitos de aperto de mão (handshake) (`token` ou `password`). Quando não definido, assume-se a autenticação por token.
- `gateway.auth.token` armazena o token compartilhado para a autenticação por token (usado pela CLI na mesma máquina).
- Quando `gateway.auth.mode` é definido, apenas esse método é aceito (mais cabeçalhos opcionais do Tailscale).
- `gateway.auth.password` pode ser definido aqui, ou via `ZERO_GATEWAY_PASSWORD` (recomendado).
- `gateway.auth.allowTailscale` permite que os cabeçalhos de identidade do Tailscale Serve (`tailscale-user-login`) satisfaçam a autenticação quando a solicitação chega no loopback com `x-forwarded-for`, `x-forwarded-proto` e `x-forwarded-host`. O ZERO verifica a identidade resolvendo o endereço `x-forwarded-for` via `tailscale whois` antes de aceitá-la. Quando `true`, as solicitações do Serve não precisam de token/senha; defina como `false` para exigir credenciais explícitas. Assume o padrão `true` quando `tailscale.mode = "serve"` e o modo de autenticação não é `password`.
- `gateway.tailscale.mode: "serve"` usa Tailscale Serve (apenas tailnet, vinculação de loopback).
- `gateway.tailscale.mode: "funnel"` expõe o painel publicamente; requer autenticação.
- `gateway.tailscale.resetOnExit` redefine a configuração de Serve/Funnel ao encerrar.

Padrões do cliente remoto (CLI):

- `gateway.remote.url` define a URL do WebSocket do Gateway padrão para chamadas CLI quando `gateway.mode = "remote"`.
- `gateway.remote.transport` seleciona o transporte remoto do macOS (`ssh` é o padrão, `direct` para ws/wss). Quando `direct`, a `gateway.remote.url` deve ser `ws://` ou `wss://`. `ws://host` assume por padrão a porta `18789`.
- `gateway.remote.token` fornece o token para chamadas remotas (deixe em branco se não houver autenticação).
- `gateway.remote.password` fornece a senha para chamadas remotas (deixe em branco se não houver autenticação).

Comportamento do aplicativo para macOS:

- O ZERO.app monitora o `~/.zero/zero.json` e alterna os modos em tempo real quando `gateway.mode` ou `gateway.remote.url` mudam.
- Se `gateway.mode` não estiver definido, mas `gateway.remote.url` estiver, o aplicativo para macOS o tratará como modo remoto.
- Quando você altera o modo de conexão no aplicativo para macOS, ele grava o `gateway.mode` (e `gateway.remote.url` + `gateway.remote.transport` no modo remoto) de volta no arquivo de configuração.

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://gateway.tailnet:18789",
      token: "seu-token",
      password: "sua-senha"
    }
  }
}
```

Exemplo de transporte direto (aplicativo macOS):

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "wss://gateway.exemplo.ts.net",
      token: "seu-token"
    }
  }
}
```

### `gateway.reload` (Recarregamento a quente da configuração)

O Gateway monitora o `~/.zero/zero.json` (ou `ZERO_CONFIG_PATH`) e aplica as alterações automaticamente.

Modos:

- `hybrid` (padrão): aplica a quente as mudanças seguras; reinicia o Gateway para mudanças críticas.
- `hot`: aplica apenas as mudanças seguras a quente; registra quando uma reinicialização é necessária.
- `restart`: reinicia o Gateway em qualquer alteração de configuração.
- `off`: desativa o recarregamento a quente.

```json5
{
  gateway: {
    reload: {
      mode: "hybrid",
      debounceMs: 300
    }
  }
}
```

#### Matriz de recarregamento a quente (arquivos + impacto)

Arquivos monitorados:

- `~/.zero/zero.json` (ou `ZERO_CONFIG_PATH`)

Aplicado a quente (sem reinicialização completa do gateway):

- `hooks` (autenticação/caminho/mapeamentos de webhook) + `hooks.gmail` (watcher do Gmail reiniciado)
- `browser` (reinicialização do servidor de controle do navegador)
- `cron` (reinicialização do serviço de cron + atualização de concorrência)
- `agents.defaults.heartbeat` (reinicialização do executor de heartbeat)
- `web` (reinicialização do canal web do WhatsApp)
- `telegram`, `discord`, `signal`, `imessage` (reinicializações de canal)
- `agent`, `models`, `routing`, `messages`, `session`, `whatsapp`, `logging`, `skills`, `ui`, `talk`, `identity`, `wizard` (leituras dinâmicas)

Exige reinicialização completa do Gateway:

- `gateway` (porta/vinculação/autenticação/UI de controle/tailscale)
- `bridge` (legado)
- `discovery`
- `canvasHost`
- `plugins`
- Qualquer caminho de configuração desconhecido/não suportado (padrão é reiniciar por segurança)

### Isolamento de múltiplas instâncias

Para executar vários gateways em um único host (para redundância ou um bot de resgate), isole o estado + configuração por instância e use portas exclusivas:

- `ZERO_CONFIG_PATH` (configuração por instância)
- `ZERO_STATE_DIR` (sessões/credenciais)
- `agents.defaults.workspace` (memórias)
- `gateway.port` (exclusivo por instância)

Sinalizadores de conveniência (CLI):

- `zero --dev …` → usa `~/.zero-dev` + altera as portas a partir da base `19001`
- `zero --profile <nome> …` → usa `~/.zero-<nome>` (porta via configuração/ambiente/flags)

Consulte o [Runbook do Gateway](/gateway) para o mapeamento de portas derivado (gateway/navegador/canvas).
Consulte [Múltiplos gateways](/gateway/multiple-gateways) para detalhes de isolamento de porta browser/CDP.

Exemplo:

```bash
ZERO_CONFIG_PATH=~/.zero/a.json \
ZERO_STATE_DIR=~/.zero-a \
zero gateway --port 19001
```

### `hooks` (Webhooks do Gateway)

Habilita um endpoint de webhook HTTP simples no servidor HTTP do Gateway.

Padrões:

- habilitado: `false`
- caminho: `/hooks`
- maxBodyBytes: `262144` (256 KB)

```json5
{
  hooks: {
    enabled: true,
    token: "segredo-compartilhado",
    path: "/hooks",
    presets: ["gmail"],
    transformsDir: "~/.zero/hooks",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate:
          "De: {{messages[0].from}}\nAssunto: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.2-mini",
      },
    ],
  }
}
```

As solicitações devem incluir o token do hook:

- `Authorization: Bearer <token>` **ou**
- `x-zero-token: <token>` **ou**
- `?token=<token>`

Endpoints:

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
- `POST /hooks/<nome>` → resolvido via `hooks.mappings`

`/hooks/agent` sempre publica um resumo na sessão principal (e pode opcionalmente disparar um heartbeat imediato via `wakeMode: "now"`).

Notas de mapeamento:

- `match.path` corresponde ao subcaminho após `/hooks` (ex: `/hooks/gmail` → `gmail`).
- `match.source` corresponde a um campo do payload (ex: `{ source: "gmail" }`) para que você possa usar um caminho genérico `/hooks/ingest`.
- Modelos como `{{messages[0].subject}}` leem do payload.
- `transform` pode apontar para um módulo JS/TS que retorna uma ação de hook.
- `deliver: true` envia a resposta final para um canal; `channel` assume o padrão `last` (busca fallback para o WhatsApp).
- Se não houver uma rota de entrega anterior, defina `channel` + `to` explicitamente (necessário para Telegram/Discord/Google Chat/Slack/Signal/iMessage/MS Teams).
- `model` sobrescreve o LLM para esta execução do hook (`provedor/modelo` ou alias; deve ser permitido se `agents.defaults.models` estiver definido).

Configuração do assistente do Gmail (usado por `zero webhooks gmail setup` / `run`):

```json5
{
  hooks: {
    gmail: {
      account: "zero@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "token-push-compartilhado",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
+
+      // Opcional: usar um modelo mais barato para o processamento do hook do Gmail
+      // Fallback para agents.defaults.model.fallbacks, depois primary, em caso de erro de auth/limite/timeout
+      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
+      // Opcional: nível de pensamento padrão para os hooks do Gmail
+      thinking: "off",
+    }
+  }
+}
+```

Sobrescrita de modelo para hooks do Gmail:
- `hooks.gmail.model` especifica um modelo a ser usado para o processamento do hook do Gmail (assume o padrão da sessão principal).
- Aceita refs `provedor/modelo` ou aliases de `agents.defaults.models`.
- Faz fallback para `agents.defaults.model.fallbacks`, depois `agents.defaults.model.primary`, em caso de erros de autenticação, limite de taxa ou timeouts.
- Se `agents.defaults.models` estiver definido, inclua o modelo de hooks na lista de permissão.
- Na inicialização, avisa se o modelo configurado não estiver no catálogo de modelos ou na lista de permissão.
- `hooks.gmail.thinking` define o nível de pensamento padrão para os hooks do Gmail e é sobrescrito pelo `thinking` de cada hook.

Início automático do Gateway:
- Se `hooks.enabled=true` e `hooks.gmail.account` estiver definido, o Gateway inicia o
  `gog gmail watch serve` no boot e renova automaticamente a observação (watch).
- Defina `ZERO_SKIP_GMAIL_WATCHER=1` para desativar o início automático (para execuções manuais).
- Evite executar um `gog gmail watch serve` separado junto com o Gateway; ele falhará com `listen tcp 127.0.0.1:8788: bind: address already in use`.

Nota: quando `tailscale.mode` está ativado, o ZERO coloca `serve.path` como `/` por padrão para que o Tailscale possa proxificar o `/gmail-pubsub` corretamente (ele remove o prefixo set-path). Se você precisar que o backend receba o caminho prefixado, defina `hooks.gmail.tailscale.target` como uma URL completa (e alinhe o `serve.path`).

### `canvasHost` (LAN/tailnet Servidor de arquivos Canvas + recarga ao vivo)

O Gateway serve um diretório de HTML/CSS/JS sobre HTTP para que os nós iOS/Android possam simplesmente usar `canvas.navigate` para ele.

Raiz padrão: `~/zero/canvas`
Porta padrão: `18793` (escolhida para evitar a porta CDP do navegador zero `18792`)
O servidor escuta no **host de vinculação do gateway** (LAN ou Tailnet) para que os nós possam alcançá-lo.

O servidor:
- serve arquivos sob `canvasHost.root`
- injeta um pequeno cliente de recarga ao vivo no HTML servido
- monitora o diretório e transmite as recargas através de um endpoint WebSocket em `/__zero/ws`
- cria automaticamente um `index.html` inicial quando o diretório está vazio (para que você veja algo imediatamente)
- também serve A2UI em `/__zero__/a2ui/` e é anunciado aos nós como `canvasHostUrl` (sempre usado pelos nós para Canvas/A2UI)

Desative a recarga ao vivo (e o monitoramento de arquivos) se o diretório for grande ou se você atingir o `EMFILE`:
- configuração: `canvasHost: { liveReload: false }`

```json5
{
  canvasHost: {
    root: "~/zero/canvas",
    port: 18793,
    liveReload: true
  }
}
```

Alterações em `canvasHost.*` exigem uma reinicialização do gateway (o recarregamento da configuração reiniciará).

Desative com:

- configuração: `canvasHost: { enabled: false }`
- ambiente: `ZERO_SKIP_CANVAS_HOST=1`

### `bridge` (Ponte TCP legada, removida)

As builds atuais não incluem mais o ouvinte da ponte TCP; as chaves de configuração `bridge.*` são ignoradas. Os nós se conectam através do WebSocket do Gateway. Esta seção é mantida para referência histórica.

Comportamento legado:

- O Gateway podia expor uma ponte TCP simples para nós (iOS/Android), normalmente na porta `18790`.

Padrões:

- habilitado: `true`
- porta: `18790`
- vinculação (bind): `lan` (vincula-se a `0.0.0.0`)

Modos de vinculação:

- `lan`: `0.0.0.0` (alcançável em qualquer interface, incluindo LAN/Wi-Fi e Tailscale)
- `tailnet`: vincula-se apenas ao IP Tailscale da máquina (recomendado para conexões seguras)
- `loopback`: `127.0.0.1` (apenas local)
- `auto`: prefere o IP da tailnet se presente, senão `lan`

TLS:

- `bridge.tls.enabled`: habilita o TLS para as conexões da ponte (apenas TLS quando habilitado).
- `bridge.tls.autoGenerate`: gera um certificado autoassinado quando nenhum cert/chave está presente (padrão: true).
- `bridge.tls.certPath` / `bridge.tls.keyPath`: caminhos PEM para o certificado da ponte + chave privada.
- `bridge.tls.caPath`: pacote PEM CA opcional.

Quando o TLS está habilitado, o Gateway anuncia `bridgeTls=1` e `bridgeTlsSha256` nos registros TXT do discovery para que os nós possam fixar (pin) o certificado. As conexões manuais usam confiança-no-primeiro-uso (trust-on-first-use) se nenhum fingerprint estiver armazenado ainda.
Certificados gerados automaticamente exigem o `openssl` no PATH; se a geração falhar, a ponte não iniciará.

```json5
{
  bridge: {
    enabled: true,
    port: 18790,
    bind: "tailnet",
    tls: {
      enabled: true,
      // Usa ~/.zero/bridge/tls/bridge-{cert,key}.pem quando omitido.
      // certPath: "~/.zero/bridge/tls/bridge-cert.pem",
      // keyPath: "~/.zero/bridge/tls/bridge-key.pem"
    }
  }
}
```

### `discovery.mdns` (Modo de transmissão Bonjour / mDNS)

Controla as transmissões mDNS na LAN (`_zero-gw._tcp`).

- `minimal` (padrão): omite `cliPath` + `sshPort` dos registros TXT
- `full`: inclui `cliPath` + `sshPort` nos registros TXT
- `off`: desativa as transmissões mDNS inteiramente

### `discovery.wideArea` (Wide-Area Bonjour / DNS-SD unicast)

Quando habilitado, o Gateway grava uma zona DNS-SD unicast para `_zero-bridge._tcp` sob `~/.zero/dns/` usando o domínio de descoberta padrão `zero.internal.`

Para fazer com que iOS/Android descubram através de redes (Viena ⇄ Londres), combine isso com:

- um servidor DNS no host do gateway servindo `zero.internal.` (CoreDNS é recomendado)
- Tailscale **split DNS** para que os clientes resolvam `zero.internal` através desse servidor

Assistente de configuração única (host do gateway):

```bash
zero dns setup --apply
```

```json5
{
  discovery: { wideArea: { enabled: true } }
}
```

## Variáveis de modelo (Template)

Espaços reservados (placeholders) de modelo são expandidos em `tools.media.*.models[].args` e `tools.media.models[].args` (e quaisquer campos de argumentos com modelo futuros).

| Variável | Descrição |
| :--- | :--- |
| `{{Body}}` | Corpo completo da mensagem de entrada |
| `{{RawBody}}` | Corpo bruto da mensagem de entrada (sem histórico/invólucros de remetente; melhor para análise de comandos) |
| `{{BodyStripped}}` | Corpo com menções de grupo removidas (melhor padrão para agentes) |
| `{{From}}` | Identificador do remetente (E.164 para WhatsApp; pode diferir por canal) |
| `{{To}}` | Identificador de destino |
| `{{MessageSid}}` | ID da mensagem do canal (quando disponível) |
| `{{SessionId}}` | UUID da sessão atual |
| `{{IsNewSession}}` | `"true"` quando uma nova sessão foi criada |
| `{{MediaUrl}}` | Pseudo-URL da mídia de entrada (se presente) |
| `{{MediaPath}}` | Caminho da mídia local (se baixada) |
| `{{MediaType}}` | Tipo de mídia (imagem/áudio/documento/…) |
| `{{Transcript}}` | Transcrição de áudio (quando habilitado) |
| `{{Prompt}}` | Prompt de mídia resolvido para entradas de CLI |
| `{{MaxChars}}` | Máximo de caracteres de saída resolvido para entradas de CLI |
| `{{ChatType}}` | `"direct"` ou `"group"` |
| `{{GroupSubject}}` | Assunto do grupo (melhor esforço) |
| `{{GroupMembers}}` | Prévia dos membros do grupo (melhor esforço) |
| `{{SenderName}}` | Nome de exibição do remetente (melhor esforço) |
| `{{SenderE164}}` | Número de telefone do remetente (melhor esforço) |
| `{{Provider}}` | Sugestão de provedor (whatsapp\|telegram\|discord\|googlechat\|slack\|signal\|imessage\|msteams\|webchat\|…) |

## Cron (Agendador do Gateway)

O Cron é um agendador de propriedade do Gateway para despertar e realizar trabalhos agendados. Veja [Cron jobs](/automation/cron-jobs) para a visão geral do recurso e exemplos de CLI.

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2
  }
}
```

---

*Próximo: [Tempo de Execução do Agente](/concepts/agent)* ∅

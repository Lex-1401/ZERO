---
summary: "Exemplos de configuração precisos com o esquema para as configurações comuns do ZERO"
read_when:
  - Aprendendo a configurar o ZERO
  - Procurando exemplos de configuração
  - Configurando o ZERO pela primeira vez
---

# Exemplos de Configuração

Os exemplos abaixo estão alinhados com o esquema de configuração atual. Para a referência exaustiva e notas por campo, consulte [Configuração](/gateway/configuration).

## Início rápido

### Mínimo absoluto

```json5
{
  agent: { workspace: "~/zero" },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

Salve em `~/.zero/zero.json` e você poderá enviar DMs para o bot a partir desse número.

### Iniciante recomendado

```json5
{
  identity: {
    name: "Zero",
    theme: "assistente prestativo",
    emoji: "∅"
  },
  agent: {
    workspace: "~/zero",
    model: { primary: "anthropic/claude-sonnet-4-5" }
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## Exemplo expandido (principais opções)

> O JSON5 permite o uso de comentários e vírgulas finais. O JSON comum também funciona.

```json5
{
  // Ambiente + shell
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  },

  // Metadados do perfil de autenticação (segredos ficam em auth-profiles.json)
  auth: {
    profiles: {
      "anthropic:eu@exemplo.com": { provider: "anthropic", mode: "oauth", email: "eu@exemplo.com" },
      "anthropic:trabalho": { provider: "anthropic", mode: "api_key" },
      "openai:padrao": { provider: "openai", mode: "api_key" },
      "openai-codex:padrao": { provider: "openai-codex", mode: "oauth" }
    },
    order: {
      anthropic: ["anthropic:eu@exemplo.com", "anthropic:trabalho"],
      openai: ["openai:padrao"],
      "openai-codex": ["openai-codex:padrao"]
    }
  },

  // Identidade
  identity: {
    name: "Samantha",
    theme: "preguiça prestativa",
    emoji: "🦥"
  },

  // Registros (Logging)
  logging: {
    level: "info",
    file: "/tmp/zero/zero.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
    redactSensitive: "tools"
  },

  // Formatação de mensagens
  messages: {
    messagePrefix: "[zero]",
    responsePrefix: ">",
    ackReaction: "👀",
    ackReactionScope: "group-mentions"
  },

  // Roteamento + fila
  routing: {
    groupChat: {
      mentionPatterns: ["@zero", "zero"],
      historyLimit: 50
    },
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
        discord: "collect",
        slack: "collect",
        signal: "collect",
        imessage: "collect",
        webchat: "collect"
      }
    }
  },

  // Ferramentas
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          // Fallback opcional por CLI (binário do Whisper):
          // { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] }
        ],
        timeoutSeconds: 120
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }]
      }
    }
  },

  // Comportamento da sessão
  session: {
    scope: "per-sender",
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 60
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 }
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.zero/agents/default/sessions/sessions.json",
    typingIntervalSeconds: 5,
    sendPolicy: {
      default: "allow",
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } }
      ]
    }
  },

  // Canais
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15555550123"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    },

    telegram: {
      enabled: true,
      botToken: "SEU_TOKEN_DO_BOT_DO_TELEGRAM",
      allowFrom: ["123456789"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["123456789"],
      groups: { "*": { requireMention: true } }
    },

    discord: {
      enabled: true,
      token: "SEU_TOKEN_DO_BOT_DO_DISCORD",
      dm: { enabled: true, allowFrom: ["steipete"] },
      guilds: {
        "123456789012345678": {
          slug: "amigos-do-zero",
          requireMention: false,
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true }
          }
        }
      }
    },

    slack: {
      enabled: true,
      botToken: "xoxb-SUBSTITUA_ME",
      appToken: "xapp-SUBSTITUA_ME",
      channels: {
        "#general": { allow: true, requireMention: true }
      },
      dm: { enabled: true, allowFrom: ["U123"] },
      slashCommand: {
        enabled: true,
        name: "zero",
        sessionPrefix: "slack:slash",
        ephemeral: true
      }
    }
  },

  // Tempo de execução do agente
  agents: {
    defaults: {
      workspace: "~/zero",
      userTimezone: "America/Sao_Paulo",
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["anthropic/claude-opus-4-5", "openai/gpt-5.2"]
      },
      imageModel: {
        primary: "openrouter/anthropic/claude-sonnet-4-5"
      },
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "openai/gpt-5.2": { alias: "gpt" }
      },
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      blockStreamingDefault: "off",
      blockStreamingBreak: "text_end",
      blockStreamingChunk: {
        minChars: 800,
        maxChars: 1200,
        breakPreference: "paragraph"
      },
      blockStreamingCoalesce: {
        idleMs: 1000
      },
      humanDelay: {
        mode: "natural"
      },
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      typingIntervalSeconds: 5,
      maxConcurrent: 3,
      heartbeat: {
        every: "30m",
        model: "anthropic/claude-sonnet-4-5",
        target: "last",
        to: "+15555550123",
        prompt: "HEARTBEAT",
        ackMaxChars: 300
      },
      memorySearch: {
        provider: "gemini",
        model: "gemini-embedding-001",
        remote: {
          apiKey: "${GEMINI_API_KEY}"
        }
      },
      sandbox: {
        mode: "non-main",
        perSession: true,
        workspaceRoot: "~/.zero/sandboxes",
        docker: {
          image: "zero-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000"
        },
        browser: {
          enabled: false
        }
      }
    }
  },

  tools: {
    allow: ["exec", "process", "read", "write", "edit", "apply_patch"],
    deny: ["browser", "canvas"],
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000
    },
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        telegram: ["123456789"],
        discord: ["steipete"],
        slack: ["U123"],
        signal: ["+15555550123"],
        imessage: ["usuario@exemplo.com"],
        webchat: ["session:demo"]
      }
    }
  },

  // Provedores de modelos personalizados
  models: {
    mode: "merge",
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "CHAVE_LITELLM",
        api: "openai-responses",
        authHeader: true,
        headers: { "X-Proxy-Region": "us-west" },
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            api: "openai-responses",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000
          }
        ]
      }
    }
  },

  // Trabalhos cron (Cron jobs)
  cron: {
    enabled: true,
    store: "~/.zero/cron/cron.json",
    maxConcurrentRuns: 2
  },

  // Webhooks
  hooks: {
    enabled: true,
    path: "/hooks",
    token: "segredo-compartilhado",
    presets: ["gmail"],
    transformsDir: "~/.zero/hooks",
    mappings: [
      {
        id: "gmail-hook",
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "De: {{messages[0].from}}\nAssunto: {{messages[0].subject}}",
        textTemplate: "{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        to: "+15555550123",
        thinking: "low",
        timeoutSeconds: 300,
        transform: { module: "./transforms/gmail.js", export: "transformGmail" }
      }
    ],
    gmail: {
      account: "zero@gmail.com",
      label: "INBOX",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "token-push-compartilhado",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" }
    }
  },

  // Gateway + rede
  gateway: {
    mode: "local",
    port: 18789,
    bind: "loopback",
    controlUi: { enabled: true, basePath: "/zero" },
    auth: {
      mode: "token",
      token: "gateway-token",
      allowTailscale: true
    },
    tailscale: { mode: "serve", resetOnExit: false },
    remote: { url: "ws://gateway.tailnet:18789", token: "remote-token" },
    reload: { mode: "hybrid", debounceMs: 300 }
  },

  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"]
    },
    install: {
      preferBrew: true,
      nodeManager: "npm"
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "CHAVE_GEMINI_AQUI",
        env: { GEMINI_API_KEY: "CHAVE_GEMINI_AQUI" }
      },
      peekaboo: { enabled: true }
    }
  }
}
```

## Padrões comuns

### Configuração multiplataforma

```json5
{
  agent: { workspace: "~/zero" },
  channels: {
    whatsapp: { allowFrom: ["+15555550123"] },
    telegram: {
      enabled: true,
      botToken: "SEU_TOKEN",
      allowFrom: ["123456789"]
    },
    discord: {
      enabled: true,
      token: "SEU_TOKEN",
      dm: { allowFrom: ["seunome"] }
    }
  }
}
```

### OAuth com failover de chave de API

```json5
{
  auth: {
    profiles: {
      "anthropic:assinatura": {
        provider: "anthropic",
        mode: "oauth",
        email: "eu@exemplo.com"
      },
      "anthropic:api": {
        provider: "anthropic",
        mode: "api_key"
      }
    },
    order: {
      anthropic: ["anthropic:assinatura", "anthropic:api"]
    }
  },
  agent: {
    workspace: "~/zero",
    model: {
      primary: "anthropic/claude-sonnet-4-5",
      fallbacks: ["anthropic/claude-opus-4-5"]
    }
  }
}
```

### Assinatura Anthropic + chave de API, failover MiniMax

```json5
{
  auth: {
    profiles: {
      "anthropic:assinatura": {
        provider: "anthropic",
        mode: "oauth",
        email: "usuario@exemplo.com"
      },
      "anthropic:api": {
        provider: "anthropic",
        mode: "api_key"
      }
    },
    order: {
      anthropic: ["anthropic:assinatura", "anthropic:api"]
    }
  },
  models: {
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        api: "anthropic-messages",
        apiKey: "${MINIMAX_API_KEY}"
      }
    }
  },
  agent: {
    workspace: "~/zero",
    model: {
      primary: "anthropic/claude-opus-4-5",
      fallbacks: ["minimax/MiniMax-M2.1"]
    }
  }
}
```

### Bot de trabalho (acesso restrito)

```json5
{
  identity: {
    name: "BotTrabalho",
    theme: "assistente profissional"
  },
  agent: {
    workspace: "~/work-zero",
    elevated: { enabled: false }
  },
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      channels: {
        "#engineering": { allow: true, requireMention: true },
        "#general": { allow: true, requireMention: true }
      }
    }
  }
}
```

### Apenas modelos locais

```json5
{
  agent: {
    workspace: "~/zero",
    model: { primary: "lmstudio/minimax-m2.1-gs32" }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## Dicas

- Se você definir `dmPolicy: "open"`, a lista `allowFrom` correspondente deve incluir `"*"`.
- IDs de provedores variam (números de telefone, IDs de usuário, IDs de canal). Use os documentos do provedor para confirmar o formato.
- Seções opcionais para adicionar mais tarde: `web`, `browser`, `ui`, `discovery`, `canvasHost`, `talk`, `signal`, `imessage`.
- Consulte [Provedores](/channels/whatsapp) e [Solução de problemas](/gateway/troubleshooting) para notas de configuração mais detalhadas.

---
summary: "Esquema de configuração de habilidades e exemplos"
read_when:
  - Adicionando ou modificando configuração de habilidades
  - Ajustando lista de permissão empacotada ou comportamento de instalação
---

# Configuração de Habilidades (Skills Config)

Toda a configuração relacionada a habilidades reside em `skills` em `~/.zero/zero.json`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: [
        "~/Projects/agent-scripts/skills",
        "~/Projects/oss/some-skill-pack/skills"
      ],
      watch: true,
      watchDebounceMs: 250
    },
    install: {
      preferBrew: true,
      nodeManager: "npm" // npm | pnpm | yarn | bun (Gateway runtime ainda Node; bun não recomendado)
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

## Campos

- `allowBundled`: lista de permissão opcional apenas para habilidades **empacotadas**. Quando definida, apenas
  habilidades empacotadas na lista são elegíveis (habilidades gerenciadas/de espaço de trabalho não são afetadas).
- `load.extraDirs`: diretórios de habilidades adicionais para escanear (precedência mais baixa).
- `load.watch`: observar pastas de habilidades e atualizar o snapshot de habilidades (padrão: true).
- `load.watchDebounceMs`: debounce para eventos do observador de habilidades em milissegundos (padrão: 250).
- `install.preferBrew`: preferir instaladores brew quando disponíveis (padrão: true).
- `install.nodeManager`: preferência de instalador node (`npm` | `pnpm` | `yarn` | `bun`, padrão: npm).
  Isso afeta apenas **instalações de habilidades**; o runtime do Gateway ainda deve ser Node
  (Bun não recomendado para WhatsApp/Telegram).
- `entries.<skillKey>`: substituições por habilidade.

Campos por habilidade:

- `enabled`: defina `false` para desativar uma habilidade mesmo se estiver empacotada/instalada.
- `env`: variáveis de ambiente injetadas para a execução do agente (apenas se ainda não definidas).
- `apiKey`: conveniência opcional para habilidades que declaram uma variável de ambiente principal.

## Notas

- Chaves sob `entries` mapeiam para o nome da habilidade por padrão. Se uma habilidade definir
  `metadata.zero.skillKey`, use essa chave em vez disso.
- Alterações em habilidades são captadas na próxima vez do agente quando o observador está ativado.

### Habilidades em sandbox + variáveis de ambiente

Quando uma sessão está em **sandbox**, processos de habilidade rodam dentro do Docker. O sandbox
**não** herda o `process.env` do host.

Use um destes:

- `agents.defaults.sandbox.docker.env` (ou por agente `agents.list[].sandbox.docker.env`)
- incorpore o env na sua imagem sandbox personalizada

`env` global e `skills.entries.<skill>.env/apiKey` aplicam-se apenas a execuções no **host**.

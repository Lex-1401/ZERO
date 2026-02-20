---
summary: "Sandbox por agente + restrições de ferramentas, precedência e exemplos"
title: Ferramentas e Sandbox Multi-Agente
read_when: "Você deseja configurar janelas de isolamento (sandboxing) ou políticas de permissão/bloqueio de ferramentas por agente em um gateway multi-agente."
status: active
---

## Configuração de Ferramentas e Sandbox Multi-Agente

## Visão Geral

Cada agente em uma configuração multi-agente pode agora ter sua própria:

- **Configuração de Sandbox** (`agents.list[].sandbox` sobrescreve `agents.defaults.sandbox`)
- **Restrições de ferramentas** (`tools.allow` / `tools.deny`, além de `agents.list[].tools`)

Isso permite que você execute múltiplos agentes com diferentes perfis de segurança:

- Assistente pessoal com acesso total.
- Agentes de família/trabalho com ferramentas restritas.
- Agentes voltados ao público em sandboxes (caixas de areia).

O `setupCommand` pertence à seção `sandbox.docker` (global ou por agente) e é executado uma vez quando o container é criado.

A autenticação é por agente: cada agente lê de seu próprio armazenamento de autenticação `agentDir` em:

```text
~/.zero/agents/<agentId>/agent/auth-profiles.json
```

As credenciais **não** são compartilhadas entre agentes. Nunca reutilize o `agentDir` entre diferentes agentes. Se desejar compartilhar credenciais, copie o arquivo `auth-profiles.json` para o `agentDir` do outro agente.

Sobre o comportamento do sandboxing em tempo de execução, veja [Isolamento (Sandboxing)](/gateway/sandboxing). Para depurar o motivo de algo estar sendo bloqueado, consulte [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) e o comando `zero sandbox explain`.

---

## Exemplos de Configuração

### Exemplo 1: Agente Pessoal + Agente Familiar Restrito

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Assistente Pessoal",
        "workspace": "~/zero",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "familia",
        "name": "Bot da Família",
        "workspace": "~/zero-familia",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "familia",
      "match": {
        "provider": "whatsapp",
        "accountId": "*",
        "peer": {
          "kind": "group",
          "id": "120363424282127706@g.us"
        }
      }
    }
  ]
}
```

**Resultado:**

- Agente `main`: Roda no host, com acesso total às ferramentas.
- Agente `familia`: Roda no Docker (um container por agente), apenas com a ferramenta `read`.

---

### Exemplo 2: Agente de Trabalho com Sandbox Compartilhado

```json
{
  "agents": {
    "list": [
      {
        "id": "pessoal",
        "workspace": "~/zero-pessoal",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "trabalho",
        "workspace": "~/zero-trabalho",
        "sandbox": {
          "mode": "all",
          "scope": "shared",
          "workspaceRoot": "/tmp/trabalho-sandboxes"
        },
        "tools": {
          "allow": ["read", "write", "apply_patch", "exec"],
          "deny": ["browser", "gateway", "discord"]
        }
      }
    ]
  }
}
```

---

### Exemplo 2b: Perfil Global de Programação + Agente Apenas de Mensagens

```json
{
  "tools": { "profile": "coding" },
  "agents": {
    "list": [
      {
        "id": "suporte",
        "tools": { "profile": "messaging", "allow": ["slack"] }
      }
    ]
  }
}
```

**Resultado:**

- Os agentes padrão recebem ferramentas de programação (coding tools).
- O agente `suporte` é restrito apenas a mensagens (+ ferramenta Slack).

---

### Exemplo 3: Diferentes Modos de Sandbox por Agente

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",  // Padrão global
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/zero",
        "sandbox": {
          "mode": "off"  // Sobrescrita: main nunca isolado
        }
      },
      {
        "id": "public",
        "workspace": "~/zero-public",
        "sandbox": {
          "mode": "all",  // Sobrescrita: public sempre isolado
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

---

## Precedência da Configuração

Quando existem configurações globais (`agents.defaults.*`) e específicas por agente (`agents.list[].*`):

### Configuração de Sandbox

As configurações específicas do agente sobrescrevem as globais:

```text
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**Notas:**

- `agents.list[].sandbox.{docker,browser,prune}.*` sobrescreve `agents.defaults.sandbox.{docker,browser,prune}.*` para aquele agente (ignorado se o escopo da sandbox for `"shared"`).

### Restrições de Ferramentas

A ordem de filtragem é:

1. **Perfil de ferramenta** (`tools.profile` ou `agents.list[].tools.profile`)
2. **Perfil por provedor** (`tools.byProvider[provider].profile` ou `agents.list[].tools.byProvider[provider].profile`)
3. **Política global** (`tools.allow` / `tools.deny`)
4. **Política por provedor** (`tools.byProvider[provider].allow/deny`)
5. **Política específica do agente** (`agents.list[].tools.allow/deny`)
6. **Política do provedor para o agente** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **Política da sandbox** (`tools.sandbox.tools` ou `agents.list[].tools.sandbox.tools`)
8. **Política de sub-agentes** (`tools.subagents.tools`, se aplicável)

Cada nível pode restringir ferramentas ainda mais, porém não pode reativar ferramentas que foram negadas em níveis anteriores. Se `agents.list[].tools.sandbox.tools` estiver definido, ele substitui `tools.sandbox.tools` para aquele agente. O identificador de provedor aceita tanto o `provider` (ex: `google-cloud-auth`) quanto `provider/model` (ex: `openai/gpt-5.2`).

### Grupos de Ferramentas (Atalhos)

As políticas de ferramentas suportam entradas `group:*` que se expandem para múltiplas ferramentas concretas:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:zero`: todas as ferramentas integradas (built-in) do ZERO.

### Modo Elevado (Elevated)

`tools.elevated` é a base global (lista de permissões baseada no remetente). `agents.list[].tools.elevated` pode restringir o modo elevado ainda mais para agentes específicos (ambos devem permitir).

Padrões de mitigação:

- Negue `exec` para agentes não confiáveis (`agents.list[].tools.deny: ["exec"]`).
- Evite listar remetentes que roteiam para agentes restritos.
- Desative o modo elevado globalmente (`tools.elevated.enabled: false`) se quiser apenas execução em sandbox.
- Desative o modo elevado por agente (`agents.list[].tools.elevated.enabled: false`) para perfis sensíveis.

---

## Migração de Agente Único

**Antes (agente único):**

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/zero",
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "tools": {
    "sandbox": {
      "tools": {
        "allow": ["read", "write", "apply_patch", "exec"],
        "deny": []
      }
    }
  }
}
```

**Depois (multi-agente com diferentes perfis):**

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/zero",
        "sandbox": { "mode": "off" }
      }
    ]
  }
}
```

Configurações legadas `agent.*` são migradas pelo `zero doctor`; prefira usar `agents.defaults` + `agents.list` daqui para frente.

---

## Exemplos de Restrição de Ferramentas

### Agente Apenas-Leitura (Read-only)

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### Agente de Execução Segura (sem modificação de arquivos)

```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

---

## Armadilha Comum: "non-main"

`agents.defaults.sandbox.mode: "non-main"` baseia-se na `session.mainKey` (padrão `"main"`), não no ID do agente. Sessões de grupos ou canais sempre recebem suas próprias chaves, portanto são tratadas como "non-main" e serão isoladas (sandboxed). Se desejar que um agente nunca entre em sandbox, configure `agents.list[].sandbox.mode: "off"`.

---

## Testes

Após configurar ferramentas e sandboxes multi-agente:

1. **Verifique a resolução do agente:**

   ```bash
   zero agents list --bindings
   ```

2. **Verifique os containers de sandbox:**

   ```bash
   docker ps --filter "label=zero.sandbox=1"
   ```

3. **Verifique as restrições de ferramentas:**
   - Envie uma mensagem que exija ferramentas restritas.
   - Valide se o agente não consegue usar as ferramentas bloqueadas.

4. **Monitore os logs:**

   ```bash
   tail -f ~/.zero/logs/gateway.log | grep -E "routing|sandbox|tools"
   ```

---

## Veja Também

- [Roteamento Multi-Agente](/concepts/multi-agent)
- [Configuração de Sandbox](/gateway/configuration#agentsdefaults-sandbox)
- [Gestão de Sessão](/concepts/session)

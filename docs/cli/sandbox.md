---
title: CLI Sandbox
summary: "Gerencie containers de sandbox e inspecione política de sandbox efetiva"
read_when: "Você está gerenciando containers de sandbox ou depurando comportamento de política de sandbox/ferramenta."
status: active
---

# CLI Sandbox

Gerencie containers de sandbox baseados em Docker para execução isolada de agente.

## Visão geral

ZERO pode rodar agentes em containers Docker isolados para segurança. Os comandos `sandbox` ajudam você a gerenciar esses containers, especialmente após atualizações ou mudanças de configuração.

## Comandos

### `zero sandbox explain`

Inspecione o modo/escopo/acesso workspace de sandbox **efetivos**, política de ferramenta de sandbox, e portões elevados (com caminhos de chave config para correção).

```bash
zero sandbox explain
zero sandbox explain --session agent:main:main
zero sandbox explain --agent work
zero sandbox explain --json
```

### `zero sandbox list`

Liste todos os containers sandbox com seu status e configuração.

```bash
zero sandbox list
zero sandbox list --browser  # Listar apenas containers de browser
zero sandbox list --json     # Saída JSON
```

**Saída inclui:**

- Nome e status do container (rodando/parado)
- Imagem Docker e se ela corresponde à config
- Idade (tempo desde criação)
- Tempo ocioso (tempo desde último uso)
- Sessão/agente associado

### `zero sandbox recreate`

Remova containers sandbox para forçar recriação com imagens/config atualizadas.

```bash
zero sandbox recreate --all                # Recriar todos os containers
zero sandbox recreate --session main       # Sessão específica
zero sandbox recreate --agent mybot        # Agente específico
zero sandbox recreate --browser            # Apenas containers de browser
zero sandbox recreate --all --force        # Pular confirmação
```

**Opções:**

- `--all`: Recriar todos os containers sandbox
- `--session <key>`: Recriar container para sessão específica
- `--agent <id>`: Recriar containers para agente específico
- `--browser`: Apenas recriar containers de browser
- `--force`: Pular prompt de confirmação

**Importante:** Containers são recriados automaticamente quando o agente é usado novamente.

## Casos de Uso

### Após atualizar imagens Docker

```bash
# Pull nova imagem
docker pull zero-sandbox:latest
docker tag zero-sandbox:latest zero-sandbox:bookworm-slim

# Atualizar config para usar nova imagem
# Editar config: agents.defaults.sandbox.docker.image (ou agents.list[].sandbox.docker.image)

# Recriar containers
zero sandbox recreate --all
```

### Após mudar configuração de sandbox

```bash
# Editar config: agents.defaults.sandbox.* (ou agents.list[].sandbox.*)

# Recriar para aplicar nova config
zero sandbox recreate --all
```

### Após mudar setupCommand

```bash
zero sandbox recreate --all
# ou apenas um agente:
zero sandbox recreate --agent familia
```

### Apenas para um agente específico

```bash
# Atualizar apenas containers de um agente
zero sandbox recreate --agent alfred
```

## Por que isso é necessário?

**Problema:** Quando você atualiza imagens Docker de sandbox ou configuração:

- Containers existentes continuam rodando com configurações antigas
- Containers são podados apenas após 24h de inatividade
- Agentes usados regularmente mantêm containers antigos rodando indefinidamente

**Solução:** Use `zero sandbox recreate` para forçar remoção de containers antigos. Eles serão recriados automaticamente com configurações atuais quando forem necessários.

Dica: prefira `zero sandbox recreate` ao invés de `docker rm` manual. Ele usa a nomeação de container do Gateway e evita incompatibilidades quando chaves de escopo/sessão mudam.

## Configuração

Configurações de sandbox vivem em `~/.zero/zero.json` sob `agents.defaults.sandbox` (sobrescritas por agente vão em `agents.list[].sandbox`):

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all",                    // off, non-main, all
        "scope": "agent",                 // session, agent, shared
        "docker": {
          "image": "zero-sandbox:bookworm-slim",
          "containerPrefix": "zero-sbx-"
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24,               // Auto-prune after 24h idle
          "maxAgeDays": 7                // Auto-prune after 7 days
        }
      }
    }
  }
}
```

## Veja Também

- [Documentação de Sandbox](/gateway/sandboxing)
- [Configuração de Agente](/concepts/agent-workspace)
- [Comando Doctor](/gateway/doctor) - Checar configuração de sandbox

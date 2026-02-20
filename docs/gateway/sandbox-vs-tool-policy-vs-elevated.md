---
summary: "Por que uma ferramenta é bloqueada: tempo de execução da sandbox, política de permitir/negar ferramentas e portões de execução elevada (elevated)"
read_when: "Você atingiu o 'cárcere da sandbox' (sandbox jail) ou recebeu uma recusa de ferramenta/elevated e deseja saber qual chave de configuração alterar."
status: active
---

# Sandbox vs Política de Ferramentas vs Elevated

O ZERO possui três controles relacionados (mas diferentes):

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decide **onde as ferramentas rodam** (Docker vs host).
2. **Política de ferramentas** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decide **quais ferramentas estão disponíveis/permitidas**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) é uma **válvula de escape exclusiva para exec** para rodar no host quando você está em uma sandbox.

## Depuração rápida

Use o inspetor para ver o que o ZERO está *realmente* fazendo:

```bash
zero sandbox explain
zero sandbox explain --session agent:main:main
zero sandbox explain --agent work
zero sandbox explain --json
```

O comando imprime:

- modo de sandbox efetivo/escopo/acesso ao workspace
- se a sessão está atualmente em sandbox (main vs non-main)
- política de permitir/negar ferramentas da sandbox efetiva (e se veio do agente/global/padrão)
- portões de elevated e caminhos de chaves para correção

## Sandbox: onde as ferramentas são executadas

O sandboxing é controlado por `agents.defaults.sandbox.mode`:

- `"off"`: tudo roda no host.
- `"non-main"`: apenas sessões que não sejam a principal (non-main) entram em sandbox (uma "surpresa" comum para grupos/canais).
- `"all"`: tudo entra em sandbox.

Veja [Sandboxing](/gateway/sandboxing) para a matriz completa (escopo, montagens de workspace, imagens).

### Montagens de vínculo (Bind mounts - verificação rápida de segurança)

- `docker.binds` *atravessa* o sistema de arquivos da sandbox: o que você montar será visível dentro do contêiner com o modo definido (`:ro` ou `:rw`).
- O padrão é leitura e escrita (read-write) se você omitir o modo; prefira `:ro` para código-fonte/segredos.
- `scope: "shared"` ignora vínculos por agente (apenas vínculos globais se aplicam).
- Vincular `/var/run/docker.sock` efetivamente entrega o controle do host para a sandbox; faça isso apenas de forma intencional.
- O acesso ao workspace (`workspaceAccess: "ro"`/`"rw"`) é independente dos modos de vínculo (bind).

## Política de ferramentas: quais ferramentas existem/podem ser chamadas

Três camadas importam:

- **Perfil de ferramenta**: `tools.profile` e `agents.list[].tools.profile` (lista de permissão base)
- **Perfil de ferramenta por provedor**: `tools.byProvider[provider].profile` e `agents.list[].tools.byProvider[provider].profile`
- **Política de ferramentas Global/Por Agente**: `tools.allow`/`tools.deny` e `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Política de ferramentas por provedor**: `tools.byProvider[provider].allow/deny` e `agents.list[].tools.byProvider[provider].allow/deny`
- **Política de ferramentas da sandbox** (aplica-se apenas quando em sandbox): `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` e `agents.list[].tools.sandbox.tools.*`

Regras básicas:

- `deny` sempre vence.
- Se `allow` não estiver vazio, todo o resto é tratado como bloqueado.
As chaves de ferramentas por provedor aceitam tanto `provider` (ex: `google-cloud-auth`) quanto `provider/model` (ex: `openai/gpt-5.2`).

### Grupos de ferramentas (atalhos)

As políticas de ferramentas (global, agente, sandbox) suportam entradas `group:*` que se expandem para múltiplas ferramentas:

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"]
      }
    }
  }
}
```

Grupos disponíveis:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:zero`: todas as ferramentas nativas do ZERO (exclui plugins de provedores)

## Elevated: "exec" exclusivo para execução no host

O modo elevated **não** concede ferramentas extras; ele afeta apenas o `exec`.

- Se você estiver em uma sandbox, `/elevated on` (ou `exec` com `elevated: true`) roda no host (aprovações ainda podem ser aplicadas).
- Use `/elevated full` para pular aprovações de exec na sessão.
- Se você já estiver rodando diretamente (direct), o modo elevated é efetivamente uma operação nula (no-op), mas ainda passa pelos portões.
- O Elevated **não** tem escopo de habilidade (skill-scoped) e **não** sobrepõe a política de permitir/negar ferramentas.

Portões:

- Ativação: `tools.elevated.enabled` (e opcionalmente `agents.list[].tools.elevated.enabled`)
- Listas de permissão de remetente: `tools.elevated.allowFrom.<provider>` (e opcionalmente `agents.list[].tools.elevated.allowFrom.<provider>`)

Veja [Modo Elevated](/tools/elevated).

## Correções comuns para o 'cárcere da sandbox' (sandbox jail)

### "Tool X blocked by sandbox tool policy"

Chaves de correção (escolha uma):

- Desativar sandbox: `agents.defaults.sandbox.mode=off` (ou por agente `agents.list[].sandbox.mode=off`)
- Permitir a ferramenta dentro da sandbox:
  - remova-a de `tools.sandbox.tools.deny` (ou por agente `agents.list[].tools.sandbox.tools.deny`)
  - ou adicione-a em `tools.sandbox.tools.allow` (ou permissão por agente)

### "Achei que esta fosse a sessão principal, por que está em sandbox?"

No modo `"non-main"`, as chaves de grupo/canal *não* são consideradas principais (main). Use a chave de sessão principal (mostrada pelo comando `sandbox explain`) ou mude o modo para `"off"`.

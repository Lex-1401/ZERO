---
summary: "Referência CLI para `zero agents` (listar/adicionar/deletar/definir identidade)"
read_when:
  - Você quer múltiplos agentes isolados (workspaces + roteamento + auth)
---

# `zero agents`

Gerencie agentes isolados (workspaces + auth + roteamento).

Relacionado:

- Roteamento Multi-Agente: [Multi-Agent Routing](/concepts/multi-agent)
- Workspace de Agente: [Agent workspace](/concepts/agent-workspace)

## Exemplos

```bash
zero agents list
zero agents add work --workspace ~/zero-work
zero agents set-identity --workspace ~/zero --from-identity
zero agents set-identity --agent main --avatar avatars/zero.png
zero agents delete work
```

## Arquivos de Identidade

Cada workspace de agente pode incluir um `IDENTITY.md` na raiz do workspace:

- Caminho exemplo: `~/zero/IDENTITY.md`
- `set-identity --from-identity` lê da raiz do workspace (ou um `--identity-file` explícito)

Caminhos de avatar resolvem relativo à raiz do workspace.

## Definir identidade

`set-identity` grava campos em `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (caminho relativo ao workspace, URL http(s), ou data URI)

Carregar de `IDENTITY.md`:

```bash
zero agents set-identity --workspace ~/zero --from-identity
```

Sobrescrever campos explicitamente:

```bash
zero agents set-identity --agent main --name "Zero" --emoji "∅" --avatar avatars/zero.png
```

Exemplo de config:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Zero",
          theme: "space void",
          emoji: "∅",
          avatar: "avatars/zero.png"
        }
      }
    ]
  }
}
```

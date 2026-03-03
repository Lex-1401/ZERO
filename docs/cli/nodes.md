---
summary: "Referência CLI para `zero nodes` (list/status/approve/invoke, camera/canvas/screen)"
read_when:
  - Você está gerenciando nós emparelhados (câmeras, tela, canvas)
  - Você precisa aprovar requisições ou invocar comandos de nó
---

# `zero nodes`

Gerencie nós emparelhados (dispositivos) e invoque capacidades de nó.

Relacionado:

- Visão geral de nós: [Nodes](/nodes)
- Câmera: [Camera nodes](/nodes/camera)
- Imagens: [Image nodes](/nodes/images)

Opções comuns:

- `--url`, `--token`, `--timeout`, `--json`

## Comandos comuns

```bash
zero nodes list
zero nodes list --connected
zero nodes list --last-connected 24h
zero nodes pending
zero nodes approve <requestId>
zero nodes status
zero nodes status --connected
zero nodes status --last-connected 24h
```

`nodes list` imprime tabelas pendentes/emparelhadas. Linhas emparelhadas incluem a idade de conexão mais recente (Last Connect).
Use `--connected` para mostrar apenas nós conectados atualmente. Use `--last-connected <duração>` para
filtrar nós que conectaram dentro de uma duração (ex. `24h`, `7d`).

## Invoke / run

```bash
zero nodes invoke --node <id|name|ip> --command <comando> --params <json>
zero nodes run --node <id|name|ip> <comando...>
zero nodes run --raw "git status"
zero nodes run --agent main --node <id|name|ip> --raw "git status"
```

Flags de invoke:

- `--params <json>`: String de objeto JSON (padrão `{}`).
- `--invoke-timeout <ms>`: timeout de invoke de nó (padrão `15000`).
- `--idempotency-key <key>`: chave de idempotência opcional.

### Padrões estilo-Exec

`nodes run` espelha o comportamento de exec do modelo (padrões + aprovações):

- Lê `tools.exec.*` (mais sobrescritas `agents.list[].tools.exec.*`).
- Usa aprovações de exec (`exec.approval.request`) antes de invocar `system.run`.
- `--node` pode ser omitido quando `tools.exec.node` está definido.
- Requer um nó que anuncie `system.run` (app companion macOS ou host de nó headless).

Flags:

- `--cwd <caminho>`: diretório de trabalho.
- `--env <key=val>`: sobrescrita de env (repetível).
- `--command-timeout <ms>`: timeout de comando.
- `--invoke-timeout <ms>`: timeout de invoke de nó (padrão `30000`).
- `--needs-screen-recording`: exigir permissão de gravação de tela.
- `--raw <comando>`: rodar uma string shell (`/bin/sh -lc` ou `cmd.exe /c`).
- `--agent <id>`: aprovações/allowlists escopadas por agente (padroniza para agente configurado).
- `--ask <off|on-miss|always>`, `--security <deny|allowlist|full>`: sobrescritas.

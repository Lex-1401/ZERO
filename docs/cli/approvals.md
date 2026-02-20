---
summary: "Referência CLI para `zero approvals` (aprovações de exec para gateway ou hosts de nó)"
read_when:
  - Você quer editar aprovações de exec da CLI
  - Você precisa gerenciar allowlists no gateway ou hosts de nó
---

# `zero approvals`

Gerencie aprovações de exec para o **host local**, **host gateway**, ou um **host de nó**.
Por padrão, comandos miram o arquivo de aprovações local no disco. Use `--gateway` para mirar o gateway, ou `--node` para mirar um nó específico.

Relacionado:

- Aprovações de Exec: [Exec approvals](/tools/exec-approvals)
- Nós: [Nodes](/nodes)

## Comandos comuns

```bash
zero approvals get
zero approvals get --node <id|name|ip>
zero approvals get --gateway
```

## Substituir aprovações de um arquivo

```bash
zero approvals set --file ./exec-approvals.json
zero approvals set --node <id|name|ip> --file ./exec-approvals.json
zero approvals set --gateway --file ./exec-approvals.json
```

## Auxiliares de Allowlist

```bash
zero approvals allowlist add "~/Projects/**/bin/rg"
zero approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
zero approvals allowlist add --agent "*" "/usr/bin/uname"

zero approvals allowlist remove "~/Projects/**/bin/rg"
```

## Notas

- `--node` usa o mesmo resolvedor que `zero nodes` (id, name, ip, ou prefixo de id).
- `--agent` padroniza para `"*"`, que se aplica a todos os agentes.
- O host de nó deve anunciar `system.execApprovals.get/set` (app macOS ou host de nó headless).
- Arquivos de aprovações são armazenados por host em `~/.zero/exec-approvals.json`.

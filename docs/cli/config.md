---
summary: "Referência CLI para `zero config` (get/set/unset valores de config)"
read_when:
  - Você quer ler ou editar config não-interativamente
---

# `zero config`

Auxiliares de Config: get/set/unset valores por caminho. Execute sem um subcomando para abrir o assistente de configuração (mesmo que `zero configure`).

## Exemplos

```bash
zero config get browser.executablePath
zero config set browser.executablePath "/usr/bin/google-chrome"
zero config set agents.defaults.heartbeat.every "2h"
zero config set agents.list[0].tools.exec.node "node-id-or-name"
zero config unset tools.web.search.apiKey
```

## Caminhos

Caminhos usam notação de ponto ou colchete:

```bash
zero config get agents.defaults.workspace
zero config get agents.list[0].id
```

Use o índice da lista de agentes para mirar um agente específico:

```bash
zero config get agents.list
zero config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Valores

Valores são parseados como JSON5 quando possível; caso contrário são tratados como strings.
Use `--json` para exigir parsing JSON5.

```bash
zero config set agents.defaults.heartbeat.every "0m"
zero config set gateway.port 19001 --json
zero config set channels.whatsapp.groups '["*"]' --json
```

Reinicie o gateway após edições.

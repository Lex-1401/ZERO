---
summary: "Referência CLI para `zero memory` (status/index/search)"
read_when:
  - Você quer indexar ou buscar memória semântica
  - Você está depurando disponibilidade de memória ou indexação
---

# `zero memory`

Gerencie indexação e buscar de memória semântica.
Fornecido pelo plugin de memória ativo (padrão: `memory-core`; defina `plugins.slots.memory = "none"` para desativar).

Relacionado:

- Conceito de memória: [Memory](/concepts/memory)
- Plugins: [Plugins](/plugins)

## Exemplos

```bash
zero memory status
zero memory status --deep
zero memory status --deep --index
zero memory status --deep --index --verbose
zero memory index
zero memory index --verbose
zero memory search "release checklist"
zero memory status --agent main
zero memory index --agent main --verbose
```

## Opções

Comum:

- `--agent <id>`: escopo para um único agente (padrão: todos os agentes configurados).
- `--verbose`: emitir logs detalhados durante sondas e indexação.

Notas:

- `memory status --deep` sonda disponibilidade de vetor + embedding.
- `memory status --deep --index` roda uma reindexação se o armazenamento estiver sujo.
- `memory index --verbose` imprime detalhes por fase (provedor, modelo, fontes, atividade em lote).

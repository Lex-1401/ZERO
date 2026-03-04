---
summary: "Referência CLI para `zero health` (endpoint de saúde do gateway via RPC)"
read_when:
  - Você quer checar rapidamente a saúde do Gateway rodando
---

# `zero health`

Busque saúde do Gateway rodando.

```bash
zero health
zero health --json
zero health --verbose
```

Notas:

- `--verbose` roda sondas ao vivo e imprime tempos por conta quando múltiplas contas estão configuradas.
- Saída inclui armazenamentos de sessão por agente quando múltiplos agentes estão configurados.

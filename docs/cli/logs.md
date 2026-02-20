---
summary: "Referência CLI para `zero logs` (tail logs de gateway via RPC)"
read_when:
  - Você precisa fazer tail de logs do Gateway remotamente (sem SSH)
  - Você quer linhas de log JSON para ferramentas
---

# `zero logs`

Faça tail de logs de arquivo do Gateway sobre RPC (funciona em modo remoto).

Relacionado:

- Visão geral de logs: [Logging](/logging)

## Exemplos

```bash
zero logs
zero logs --follow
zero logs --json
zero logs --limit 500
```

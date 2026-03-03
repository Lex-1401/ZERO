---
summary: "Referência CLI para `zero agent` (envie um turno de agente via Gateway)"
read_when:
  - Você quer rodar um turno de agente de scripts (opcionalmente entregar resposta)
---

# `zero agent`

Execute um turno de agente via Gateway (use `--local` para embutido).
Use `--agent <id>` para mirar um agente configurado diretamente.

Relacionado:

- Ferramenta Agent send: [Agent send](/tools/agent-send)

## Exemplos

```bash
zero agent --to +15555550123 --message "status update" --deliver
zero agent --agent ops --message "Summarize logs"
zero agent --session-id 1234 --message "Summarize inbox" --thinking medium
zero agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

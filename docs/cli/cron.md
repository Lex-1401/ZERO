---
summary: "Referência CLI para `zero cron` (agendar e rodar trabalhos em segundo plano)"
read_when:
  - Você quer trabalhos agendados e despertares
  - Você está depurando execução de cron e logs
---

# `zero cron`

Gerencie trabalhos cron para o agendador do Gateway.

Relacionado:

- Trabalhos Cron: [Cron jobs](/automation/cron-jobs)

Dica: execute `zero cron --help` para a superfície de comando completa.

## Edições comuns

Atualize configurações de entrega sem mudar a mensagem:

```bash
zero cron edit <job-id> --deliver --channel telegram --to "123456789"
```

Desative entrega para um trabalho isolado:

```bash
zero cron edit <job-id> --no-deliver
```

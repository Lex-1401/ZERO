---
summary: "Referência CLI para `zero status` (diagnósticos, sondas, snapshots de uso)"
read_when:
  - Você quer um diagnóstico rápido de saúde de canal + recipientes de sessão recentes
  - Você quer um status "all" colável para depuração
---

# `zero status`

Diagnósticos para canais + sessões.

```bash
zero status
zero status --all
zero status --deep
zero status --usage
```

Notas:

- `--deep` roda sondas ao vivo (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- Saída inclui armazenamentos de sessão por agente quando múltiplos agentes estão configurados.
- Visão geral inclui status de install/runtime de serviço Gateway + host de nó quando disponível.
- Visão geral inclui canal de atualização + git SHA (para checkouts fonte).
- Info de atualização surge na Visão geral; se uma atualização está disponível, status imprime uma dica para rodar `zero update` (veja [Atualizando](/install/updating)).

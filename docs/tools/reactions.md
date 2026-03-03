---
summary: "Semântica de reação compartilhada entre canais"
read_when:
  - Trabalhando em reações em qualquer canal
---

# Ferramentas de reação (Reaction tooling)

Semântica de reação compartilhada entre canais:

- `emoji` é obrigatório ao adicionar uma reação.
- `emoji=""` remove a(s) reação(ões) do bot quando suportado.
- `remove: true` remove o emoji especificado quando suportado (requer `emoji`).

Notas de canal:

- **Discord/Slack**: `emoji` vazio remove todas as reações do bot na mensagem; `remove: true` remove apenas aquele emoji.
- **Google Chat**: `emoji` vazio remove as reações do app na mensagem; `remove: true` remove apenas aquele emoji.
- **Telegram**: `emoji` vazio remove as reações do bot; `remove: true` também remove reações, mas ainda requer um `emoji` não vazio para validação da ferramenta.
- **WhatsApp**: `emoji` vazio remove a reação do bot; `remove: true` mapeia para emoji vazio (ainda requer `emoji`).
- **Signal**: notificações de reação de entrada emitem eventos de sistema quando `channels.signal.reactionNotifications` está ativado.

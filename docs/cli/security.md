---
summary: "Referência CLI para `zero security` (auditoria e correção de falhas de segurança comuns)"
read_when:
  - Você quer rodar uma auditoria de segurança rápida em config/estado
  - Você quer aplicar sugestões de "correção" seguras (chmod, endurecer padrões)
---

# `zero security`

Ferramentas de segurança (auditoria + correções opcionais).

Relacionado:

- Guia de segurança: [Security](/gateway/security)

## Auditoria

```bash
zero security audit
zero security audit --deep
zero security audit --fix
```

A auditoria avisa quando múltiplos remetentes DM compartilham a sessão principal e recomenda `session.dmScope="per-channel-peer"` para caixas de entrada compartilhadas.
Também avisa quando modelos pequenos (`<=300B`) são usados sem sandboxing e com ferramentas web/browser ativadas.

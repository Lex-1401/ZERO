---
summary: "Referência CLI para `zero onboard` (assistente de onboarding interativo)"
read_when:
  - Você quer configuração guiada para gateway, workspace, auth, canais e habilidades
---

# `zero onboard`

Assistente de onboarding interativo (configuração de Gateway local ou remoto).

Relacionado:

- Guia do assistente: [Onboarding](/start/onboarding)

## Exemplos

```bash
zero onboard
zero onboard --flow quickstart
zero onboard --flow manual
zero onboard --mode remote --remote-url ws://gateway-host:18789
```

Notas de fluxo:

- `quickstart`: prompts mínimos, gera automaticamente um token de gateway.
- `manual`: prompts completos para porta/bind/auth (alias de `advanced`).

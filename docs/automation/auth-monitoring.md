---
summary: "Monitore a expiração de OAuth para provedores de modelos"
read_when:
  - Configurando o monitoramento de expiração de autenticação ou alertas
  - Automatizando verificações de renovação de OAuth do Claude Code / Codex
---

# Monitoramento de Autenticação

O ZERO expõe a saúde da expiração de OAuth via `zero models status`. Use isso para automação e alertas; os scripts são extras opcionais para fluxos de trabalho em dispositivos móveis.

## Preferencial: Verificação via CLI (portátil)

```bash
zero models status --check
```

Códigos de saída:

- `0`: OK
- `1`: credenciais expiradas ou ausentes
- `2`: expirando em breve (dentro de 24h)

Isso funciona em cron/systemd e não requer scripts extras.

## Scripts opcionais (operações / fluxos em celular)

Estes residem em `scripts/` e são **opcionais**. Eles assumem acesso SSH ao host do gateway e são ajustados para systemd + Termux.

- `scripts/claude-auth-status.sh` agora usa `zero models status --json` como a fonte da verdade (recorrendo à leitura direta de arquivos se a CLI estiver indisponível), portanto, mantenha o `zero` no `PATH` para os timers.
- `scripts/auth-monitor.sh`: alvo para timer de cron/systemd; envia alertas (ntfy ou celular).
- `scripts/systemd/zero-auth-monitor.{service,timer}`: timer de usuário do systemd.
- `scripts/claude-auth-status.sh`: verificador de autenticação do Claude Code + ZERO (cheio/json/simples).
- `scripts/mobile-reauth.sh`: fluxo de reautenticação guiado via SSH.
- `scripts/termux-quick-auth.sh`: status de widget de um toque + abre URL de autenticação.
- `scripts/termux-auth-widget.sh`: fluxo de widget guiado completo.
- `scripts/termux-sync-widget.sh`: sincroniza credenciais do Claude Code → ZERO.

Se você não precisa de automação para celular ou timers de systemd, ignore estes scripts.

---
summary: "Referência CLI para `zero doctor` (verificações de saúde + reparos guiados)"
read_when:
  - Você tem problemas de conectividade/auth e quer correções guiadas
  - Você atualizou e quer uma verificação de sanidade
---

# `zero doctor`

Verificações de saúde + correções rápidas para o gateway e canais.

Relacionado:

- Solução de problemas: [Troubleshooting](/gateway/troubleshooting)
- Auditoria de segurança: [Security](/gateway/security)

## Exemplos

```bash
zero doctor
zero doctor --repair
zero doctor --deep
```

Notas:

- Prompts interativos (como correções keychain/OAuth) só rodam quando stdin é um TTY e `--non-interactive` **não** está definido. Execuções headless (cron, Telegram, sem terminal) pularão prompts.
- `--fix` (alias para `--repair`) grava um backup em `~/.zero/zero.json.bak` e descarta chaves de config desconhecidas, listando cada remoção.

## macOS: sobrescritas de env `launchctl`

Se você executou anteriormente `launchctl setenv ZERO_GATEWAY_TOKEN ...` (ou `...PASSWORD`), esse valor sobrescreve seu arquivo de config e pode causar erros persistentes de "unauthorized".

```bash
launchctl getenv ZERO_GATEWAY_TOKEN
launchctl getenv ZERO_GATEWAY_PASSWORD

launchctl unsetenv ZERO_GATEWAY_TOKEN
launchctl unsetenv ZERO_GATEWAY_PASSWORD
```

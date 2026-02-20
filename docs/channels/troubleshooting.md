---
summary: "Atalhos para resolução de problemas específicos de canais (Discord/Telegram/WhatsApp)"
read_when:
  - Um canal conecta, mas as mensagens não fluem
  - Investigando má configuração de canal (intents, permissões, modo de privacidade)
---
# Resolução de Problemas de Canais

Comece com:

```bash
zero doctor
zero channels status --probe
```

`channels status --probe` imprime avisos quando detecta configurações incorretas comuns de canais e inclui pequenas verificações ao vivo (credenciais, algumas permissões/participação).

## Canais

- Discord: [/channels/discord#troubleshooting](/channels/discord#troubleshooting)
- Telegram: [/channels/telegram#troubleshooting](/channels/telegram#troubleshooting)
- WhatsApp: [/channels/whatsapp#troubleshooting-quick](/channels/whatsapp#troubleshooting-quick)

## Correções rápidas do Telegram

- Logs mostram `HttpError: Network request for 'sendMessage' failed` ou `sendChatAction` → verifique o DNS IPv6. Se o `api.telegram.org` for resolvido para IPv6 primeiro e o host não tiver saída IPv6, force o IPv4 ou habilite o IPv6. Veja [/channels/telegram#troubleshooting](/channels/telegram#troubleshooting).
- Logs mostram `setMyCommands failed` → verifique a saída HTTPS e a acessibilidade DNS para `api.telegram.org` (comum em VPS bloqueados ou proxies).

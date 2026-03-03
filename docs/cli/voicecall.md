---
summary: "Referência CLI para `zero voicecall` (superfície de comando do plugin voice-call)"
read_when:
  - Você usa o plugin voice-call e quer os pontos de entrada CLI
  - Você quer exemplos rápidos para `voicecall call|continue|status|tail|expose`
---

# `zero voicecall`

`voicecall` é um comando fornecido por plugin. Ele só aparece se o plugin voice-call estiver instalado e ativado.

Doc primária:

- Plugin Voice-call: [Voice Call](/plugins/voice-call)

## Comandos comuns

```bash
zero voicecall status --call-id <id>
zero voicecall call --to "+15555550123" --message "Ola" --mode notify
zero voicecall continue --call-id <id> --message "Alguma duvida?"
zero voicecall end --call-id <id>
```

## Expondo webhooks (Tailscale)

```bash
zero voicecall expose --mode serve
zero voicecall expose --mode funnel
zero voicecall unexpose
```

Nota de segurança: exponha o endpoint de webhook apenas para redes em que você confia. Prefira Tailscale Serve sobre Funnel quando possível.

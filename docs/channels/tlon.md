---
summary: "Status de suporte Tlon/Urbit, capacidades e configuração"
read_when:
  - Trabalhando em recursos do canal Tlon/Urbit
---

# Tlon (plugin)

Tlon é um mensageiro descentralizado construído sobre Urbit. ZERO se conecta ao seu ship Urbit e pode responder a DMs e mensagens de chat de grupo. Respostas em grupo requerem uma @ menção por padrão e podem ser ainda mais restritas via allowlists.

Status: suportado via plugin. DMs, menções em grupo, respostas em thread e fallback de mídia apenas texto (URL anexada à legenda). Reações, enquetes e uploads de mídia nativos não são suportados.

## Plugin necessário

Tlon é distribuído como um plugin e não é empacotado com a instalação principal.

Instale via CLI (registro npm):

```bash
zero plugins install @zero/tlon
```

Checkout local (ao rodar de um repositório git):

```bash
zero plugins install ./extensions/tlon
```

Detalhes: [Plugins](/plugin)

## Configuração

1) Instale o plugin Tlon.
2) Obtenha sua URL de ship e código de login.
3) Configure `channels.tlon`.
4) Reinicie o gateway.
5) Mande DM para o bot ou mencione-o em um canal de grupo.

Configuração mínima (conta única):

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://seu-host-ship",
      code: "lidlut-tabwed-pillex-ridrup"
    }
  }
}
```

## Canais de grupo

Auto-descoberta é ativada por padrão. Você também pode fixar canais manualmente:

```json5
{
  channels: {
    tlon: {
      groupChannels: [
        "chat/~host-ship/general",
        "chat/~host-ship/support"
      ]
    }
  }
}
```

Desativar auto-descoberta:

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false
    }
  }
}
```

## Controle de acesso

Allowlist de DM (vazia = permitir todos):

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"]
    }
  }
}
```

Autorização de grupo (restrita por padrão):

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"]
          },
          "chat/~host-ship/announcements": {
            mode: "open"
          }
        }
      }
    }
  }
}
```

## Alvos de entrega (CLI/cron)

Use estes com `zero message send` ou entrega de cron:

- DM: `~sampel-palnet` ou `dm/~sampel-palnet`
- Grupo: `chat/~host-ship/channel` ou `group:~host-ship/channel`

## Notas

- Respostas de grupo exigem uma menção (ex. `~seu-ship-bot`) para responder.
- Respostas de thread: se a mensagem de entrada está em uma thread, ZERO responde na thread.
- Mídia: `sendMedia` reverte para texto + URL (sem upload nativo).

---
summary: "Visão geral do pareamento: aprove quem pode enviar DMs para você + quais nós podem entrar"
read_when:
  - Configurando o controle de acesso de DM
  - Pareando um novo nó iOS/Android
  - Revisando a postura de segurança do ZERO
---

# Pareamento

O "Pareamento" (Pairing) é a etapa de **aprovação explícita do proprietário** no ZERO.
Ele é usado em dois lugares:

1) **Pareamento de DM** (quem tem permissão para falar com o bot)
2) **Pareamento de Nó** (quais dispositivos/nós têm permissão para entrar na rede do gateway)

Contexto de segurança: [Segurança](/gateway/security)

## 1) Pareamento de DM (acesso de chat recebido)

Quando um canal é configurado com a política de DM `pairing`, remetentes desconhecidos recebem um código curto e sua mensagem **não é processada** até que você a aprove.

As políticas de DM padrão estão documentadas em: [Segurança](/gateway/security)

Códigos de pareamento:

- 8 caracteres, maiúsculos, sem caracteres ambíguos (`0O1I`).
- **Expiram após 1 hora**. O bot só envia a mensagem de pareamento quando uma nova solicitação é criada (aproximadamente uma vez por hora, por remetente).
- As solicitações de pareamento de DM pendentes são limitadas a **3 por canal** por padrão; solicitações adicionais são ignoradas até que uma expire ou seja aprovada.

### Aprovar um remetente

```bash
zero pairing list telegram
zero pairing approve telegram <CÓDIGO>
```

Canais suportados: `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`.

### Onde o estado reside

Armazenado em `~/.zero/credentials/`:

- Solicitações pendentes: `<canal>-pairing.json`
- Repositório da lista de permissões aprovada: `<canal>-allowFrom.json`

Trate esses arquivos como sensíveis (eles controlam o acesso ao seu assistente).

## 2) Pareamento de dispositivo nó (nós iOS/Android/macOS/headless)

Os nós se conectam ao Gateway como **dispositivos** com `role: node`. O Gateway cria uma solicitação de pareamento de dispositivo que deve ser aprovada.

### Aprovar um dispositivo nó

```bash
zero devices list
zero devices approve <requestId>
zero devices reject <requestId>
```

### Armazenamento do estado do nó

Armazenado em `~/.zero/devices/`:

- `pending.json` (vida curta; solicitações pendentes expiram)
- `paired.json` (dispositivos pareados + tokens)

### Notas

- A API legada `node.pair.*` (CLI: `zero nodes pending/approve`) é um repositório de pareamento separado, de propriedade do gateway. Nós WS ainda exigem pareamento de dispositivo.

## Documentos relacionados

- Modelo de segurança + injeção de prompt: [Segurança](/gateway/security)
- Atualização segura (execute o doctor): [Atualização](/install/updating)
- Configurações de canais:
  - Telegram: [Telegram](/channels/telegram)
  - WhatsApp: [WhatsApp](/channels/whatsapp)
  - Signal: [Signal](/channels/signal)
  - iMessage: [iMessage](/channels/imessage)
  - Discord: [Discord](/channels/discord)
  - Slack: [Slack](/channels/slack)

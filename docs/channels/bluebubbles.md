---
summary: "iMessage via servidor BlueBubbles macOS (envio/recebimento REST, digitação, reações, emparelhamento, ações avançadas)."
read_when:
  - Configurando canal BlueBubbles
  - Solucionando problemas de emparelhamento de webhook
  - Configurando iMessage no macOS
---

# BlueBubbles (macOS REST)

Status: plugin integrado que conversa com o servidor BlueBubbles macOS via HTTP. **Recomendado para integração com iMessage** devido à sua API mais rica e configuração mais fácil comparada ao canal legado imsg.

## Visão Geral

- Roda no macOS via app auxiliar BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recomendado/testado: macOS Altair (15). macOS Tahoe (26) funciona; edição está atualmente quebrada no Tahoe, e atualizações de ícone de grupo podem reportar sucesso mas não sincronizar.
- O ZERO conversa com ele através de sua API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Mensagens de entrada chegam via webhooks; respostas de saída, indicadores de digitação, recibos de leitura e tapbacks são chamadas REST.
- Anexos e stickers são ingeridos como mídia de entrada (e exibidos ao agente quando possível).
- Emparelhamento/allowlist funciona da mesma maneira que outros canais (`/start/pairing` etc) com `channels.bluebubbles.allowFrom` + códigos de emparelhamento.
- Reações são exibidas como eventos de sistema assim como Slack/Telegram para que agentes possam "mencioná-las" antes de responder.
- Recursos avançados: editar, desfazer envio (unsend), encadeamento de resposta, efeitos de mensagem, gerenciamento de grupo.

## Início Rápido

1. Instale o servidor BlueBubbles no seu Mac (siga as instruções em [bluebubbles.app/install](https://bluebubbles.app/install)).
2. Na configuração do BlueBubbles, ative a API web e defina uma senha.
3. Execute `zero onboard` e selecione BlueBubbles, ou configure manualmente:

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "senha-exemplo",
         webhookPath: "/bluebubbles-webhook"
       }
     }
   }
   ```

4. Aponte os webhooks do BlueBubbles para o seu gateway (exemplo: `https://seu-gateway-host:3000/bluebubbles-webhook?password=<senha>`).
5. Inicie o gateway; ele registrará o manipulador de webhook e iniciará o emparelhamento.

## Onboarding

BlueBubbles está disponível no assistente de configuração interativo:

```bash
zero onboard
```

O assistente solicita:

- **Server URL** (obrigatório): Endereço do servidor BlueBubbles (ex., `http://192.168.1.100:1234`)
- **Password** (obrigatório): Senha da API das configurações do Servidor BlueBubbles
- **Webhook path** (opcional): Padrão para `/bluebubbles-webhook`
- **DM policy**: pairing, allowlist, open, ou disabled
- **Allow list**: Números de telefone, emails ou alvos de chat

Você também pode adicionar BlueBubbles via CLI:

```bash
zero channels add bluebubbles --http-url http://192.168.1.100:1234 --password <senha>
```

## Controle de acesso (DMs + grupos)

DMs:

- Padrão: `channels.bluebubbles.dmPolicy = "pairing"`.
- Remetentes desconhecidos recebem um código de emparelhamento; mensagens são ignoradas até serem aprovadas (códigos expiram após 1 hora).
- Aprove via:
  - `zero pairing list bluebubbles`
  - `zero pairing approve bluebubbles <CODIGO>`
- Emparelhamento é a troca de token padrão. Detalhes: [Emparelhamento](/start/pairing)

Grupos:

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (padrão: `allowlist`).
- `channels.bluebubbles.groupAllowFrom` controla quem pode acionar em grupos quando `allowlist` está definido.

### Bloqueio por menção (grupos)

BlueBubbles suporta bloqueio por menção para chats em grupo, combinando com o comportamento do iMessage/WhatsApp:

- Usa `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`) para detectar menções.
- Quando `requireMention` está ativado para um grupo, o agente só responde quando mencionado.
- Comandos de controle de remetentes autorizados ignoram o bloqueio por menção.

Configuração por grupo:

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true },  // padrão para todos os grupos
        "iMessage;-;chat123": { requireMention: false }  // sobrescreve para grupo específico
      }
    }
  }
}
```

### Bloqueio de comando

- Comandos de controle (ex., `/config`, `/model`) requerem autorização.
- Usa `allowFrom` e `groupAllowFrom` para determinar autorização de comando.
- Remetentes autorizados podem executar comandos de controle mesmo sem mencionar em grupos.

## Digitação + recibos de leitura

- **Indicadores de digitação**: Enviados automaticamente antes e durante a geração da resposta.
- **Recibos de leitura**: Controlados por `channels.bluebubbles.sendReadReceipts` (padrão: `true`).
- **Indicadores de digitação**: O ZERO envia eventos de início de digitação; o BlueBubbles limpa a digitação automaticamente no envio ou timeout (parada manual via DELETE não é confiável).

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false  // desativar recibos de leitura
    }
  }
}
```

## Ações avançadas

BlueBubbles suporta ações avançadas de mensagem quando habilitado na configuração:

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true,       // tapbacks (padrão: true)
        edit: true,            // editar mensagens enviadas (macOS 13+, quebrado no macOS 26 Tahoe)
        unsend: true,          // desfazer envio de mensagens (macOS 13+)
        reply: true,           // encadeamento de resposta por GUID de mensagem
        sendWithEffect: true,  // efeitos de mensagem (slam, loud, etc.)
        renameGroup: true,     // renomear chats de grupo
        setGroupIcon: true,    // definir ícone/foto de chat de grupo (instável no macOS 26 Tahoe)
        addParticipant: true,  // adicionar participantes a grupos
        removeParticipant: true, // remover participantes de grupos
        leaveGroup: true,      // sair de chats de grupo
        sendAttachment: true   // enviar anexos/mídia
      }
    }
  }
}
```

Ações disponíveis:

- **react**: Adicionar/remover reações tapback (`messageId`, `emoji`, `remove`)
- **edit**: Editar uma mensagem enviada (`messageId`, `text`)
- **unsend**: Desfazer o envio de uma mensagem (`messageId`)
- **reply**: Responder a uma mensagem específica (`messageId`, `text`, `to`)
- **sendWithEffect**: Enviar com efeito iMessage (`text`, `to`, `effectId`)
- **renameGroup**: Renomear um chat de grupo (`chatGuid`, `displayName`)
- **setGroupIcon**: Definir ícone/foto de um chat de grupo (`chatGuid`, `media`) — instável no macOS 26 Tahoe (API pode retornar sucesso mas o ícone não sincroniza).
- **addParticipant**: Adicionar alguém a um grupo (`chatGuid`, `address`)
- **removeParticipant**: Remover alguém de um grupo (`chatGuid`, `address`)
- **leaveGroup**: Sair de um chat de grupo (`chatGuid`)
- **sendAttachment**: Enviar mídia/arquivos (`to`, `buffer`, `filename`, `asVoice`)
  - Memorandos de voz: defina `asVoice: true` com áudio **MP3** ou **CAF** para enviar como mensagem de voz do iMessage. BlueBubbles converte MP3 → CAF ao enviar memorandos de voz.

### IDs de Mensagem (curto vs completo)

O ZERO pode exibir IDs de mensagem *curtos* (ex., `1`, `2`) para economizar tokens.

- `MessageSid` / `ReplyToId` podem ser IDs curtos.
- `MessageSidFull` / `ReplyToIdFull` contêm os IDs completos do provedor.
- IDs curtos ficam na memória; eles podem expirar ao reiniciar ou limpar cache.
- Ações aceitam `messageId` curto ou completo, mas IDs curtos darão erro se não estiverem mais disponíveis.

Use IDs completos para automações duráveis e armazenamento:

- Templates: `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexto: `MessageSidFull` / `ReplyToIdFull` em payloads de entrada

Veja [Configuração](/gateway/configuration) para variáveis de template.

## Streaming de bloco

Controle se as respostas são enviadas como uma única mensagem ou transmitidas em blocos:

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true  // habilitar streaming de bloco (comportamento padrão)
    }
  }
}
```

## Mídia + limites

- Anexos de entrada são baixados e armazenados no cache de mídia.
- Limite de mídia via `channels.bluebubbles.mediaMaxMb` (padrão: 8 MB).
- Texto de saída é fragmentado para `channels.bluebubbles.textChunkLimit` (padrão: 4000 caracteres).

## Referência de configuração

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.bluebubbles.enabled`: Ativar/desativar o canal.
- `channels.bluebubbles.serverUrl`: URL base da API REST do BlueBubbles.
- `channels.bluebubbles.password`: Senha da API.
- `channels.bluebubbles.webhookPath`: Caminho do endpoint webhook (padrão: `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (padrão: `pairing`).
- `channels.bluebubbles.allowFrom`: Allowlist de DM (alças, emails, números E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (padrão: `allowlist`).
- `channels.bluebubbles.groupAllowFrom`: Allowlist de remetente de grupo.
- `channels.bluebubbles.groups`: Configuração por grupo (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts`: Enviar recibos de leitura (padrão: `true`).
- `channels.bluebubbles.blockStreaming`: Habilitar streaming de bloco (padrão: `true`).
- `channels.bluebubbles.textChunkLimit`: Tamanho do fragmento de saída em caracteres (padrão: 4000).
- `channels.bluebubbles.chunkMode`: `length` (padrão) divide apenas ao exceder `textChunkLimit`; `newline` divide em linhas em branco (limites de parágrafo) antes da divisão por comprimento.
- `channels.bluebubbles.mediaMaxMb`: Limite de mídia de entrada em MB (padrão: 8).
- `channels.bluebubbles.historyLimit`: Máximo de mensagens de grupo para contexto (0 desativa).
- `channels.bluebubbles.dmHistoryLimit`: Limite de histórico de DM.
- `channels.bluebubbles.actions`: Habilitar/desabilitar ações específicas.
- `channels.bluebubbles.accounts`: Configuração multi-conta.

Opções globais relacionadas:

- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Endereçamento / alvos de entrega

Prefira `chat_guid` para roteamento estável:

- `chat_guid:iMessage;-;+15555550123` (preferido para grupos)
- `chat_id:123`
- `chat_identifier:...`
- Alças diretas: `+15555550123`, `user@example.com`
  - Se uma alça direta não tiver um chat DM existente, o ZERO criará um via `POST /api/v1/chat/new`. Isso requer que a API Privada do BlueBubbles esteja ativada.

## Segurança

- Requisições de webhook são autenticadas comparando parâmetros de consulta `guid`/`password` ou cabeçalhos contra `channels.bluebubbles.password`. Requisições do `localhost` também são aceitas.
- Mantenha a senha da API e endpoint webhook secretos (trate-os como credenciais).
- Habilite HTTPS + regras de firewall no servidor BlueBubbles se expô-lo fora da sua LAN.

## Solução de problemas

- Se eventos de digitação/leitura pararem de funcionar, verifique os logs de webhook do BlueBubbles e verifique se o caminho do gateway corresponde a `channels.bluebubbles.webhookPath`.
- Códigos de emparelhamento expiram após uma hora; use `zero pairing list bluebubbles` e `zero pairing approve bluebubbles <code>`.
- Reações requerem a API privada do BlueBubbles (`POST /api/v1/message/react`); garanta que a versão do servidor a exponha.
- Editar/desfazer envio requerem macOS 13+ e uma versão de servidor BlueBubbles compatível. No macOS 26 (Tahoe), edição está atualmente quebrada devido a mudanças na API privada.
- Atualizações de ícone de grupo podem ser instáveis no macOS 26 (Tahoe): a API pode retornar sucesso mas o novo ícone não sincroniza.
- O ZERO oculta automaticamente ações conhecidas como quebradas com base na versão macOS do servidor BlueBubbles. Se editar ainda aparecer no macOS 26 (Tahoe), desative manualmente com `channels.bluebubbles.actions.edit=false`.
- Para informações de status/saúde: `zero status --all` ou `zero status --deep`.

Para referência geral de fluxo de canal, veja [Canais](/channels) e o guia de [Plugins](/plugins).

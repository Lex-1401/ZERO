---
summary: "Integração Telegram Bot API via grammY com notas de configuração"
read_when:
  - Trabalhando em fluxos Telegram ou grammY
---

# Integração grammY (Telegram Bot API)

# Por que grammY

- Cliente Bot API TS-first com auxiliares integrados de long-poll + webhook, middleware, tratamento de erros e limitador de taxa.
- Auxiliares de mídia mais limpos do que fazer fetch + FormData manualmente; suporta todos os métodos da Bot API.
- Extensível: suporte a proxy via fetch personalizado, session middleware (opcional), contexto type-safe.

# O que entregamos

- **Caminho de cliente único:** implementação baseada em fetch removida; grammY agora é o único cliente Telegram (envio + gateway) com o throttler do grammY ativado por padrão.
- **Gateway:** `monitorTelegramProvider` constrói um `Bot` grammY, conecta bloqueio por menção/allowlist, download de mídia via `getFile`/`download`, e entrega respostas com `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument`. Suporta long-poll ou webhook via `webhookCallback`.
- **Proxy:** `channels.telegram.proxy` opcional usa `undici.ProxyAgent` através do `client.baseFetch` do grammY.
- **Suporte a Webhook:** `webhook-set.ts` envolve `setWebhook/deleteWebhook`; `webhook.ts` hospeda o callback com saúde + desligamento gracioso. O Gateway habilita o modo webhook quando `channels.telegram.webhookUrl` está definido (caso contrário, faz long-poll).
- **Sessões:** chats diretos colapsam na sessão principal do agente (`agent:<agentId>:<mainKey>`); grupos usam `agent:<agentId>:telegram:group:<chatId>`; respostas roteiam de volta para o mesmo canal.
- **Configuração:** `channels.telegram.botToken`, `channels.telegram.dmPolicy`, `channels.telegram.groups` (padrões de allowlist + menção), `channels.telegram.allowFrom`, `channels.telegram.groupAllowFrom`, `channels.telegram.groupPolicy`, `channels.telegram.mediaMaxMb`, `channels.telegram.linkPreview`, `channels.telegram.proxy`, `channels.telegram.webhookSecret`, `channels.telegram.webhookUrl`.
- **Streaming de rascunho (Draft streaming):** `channels.telegram.streamMode` opcional usa `sendMessageDraft` em chats de tópico privado (Bot API 9.3+). Isso é separado do streaming de bloco do canal.
- **Testes:** mocks do grammy cobrem DM + bloqueio por menção em grupo e envio de saída; mais fixtures de mídia/webhook ainda são bem-vindas.

Questões em aberto

- Plugins grammY opcionais (throttler) se atingirmos Bot API 429s.
- Adicionar mais testes de mídia estruturados (stickers, notas de voz).
- Tornar a porta de escuta do webhook configurável (atualmente fixa em 8787 a menos que conectada através do gateway).

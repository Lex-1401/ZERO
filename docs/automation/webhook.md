---
summary: "Ingresso de webhooks para despertar e execuções isoladas de agentes"
read_when:
  - Adicionando ou alterando endpoints de webhook
  - Conectando sistemas externos ao ZERO
---

# Webhooks

O Gateway pode expor um pequeno endpoint HTTP de webhook para gatilhos externos.

## Habilitar

```json5
{
  hooks: {
    enabled: true,
    token: "segredo-compartilhado",
    path: "/hooks"
  }
}
```

Notas:

- `hooks.token` é obrigatório quando `hooks.enabled=true`.
- `hooks.path` tem como padrão `/hooks`.

## Autenticação

Cada requisição deve incluir o token do hook:

- `Authorization: Bearer <token>`
- ou `x-zero-token: <token>`
- ou `?token=<token>`

## Endpoints

### `POST /hooks/wake`

Payload:

```json
{ "text": "Linha de sistema", "mode": "now" }
```

- `text` **obrigatório** (string): A descrição do evento (ex: "Novo e-mail recebido").
- `mode` opcional (`now` | `next-heartbeat`): Se deve disparar um heartbeat imediato (padrão `now`) ou aguardar a próxima verificação periódica.

Efeito:

- Enfileira um evento de sistema para a sessão **principal**
- Se `mode=now`, dispara um heartbeat imediato

### `POST /hooks/agent`

Payload:

```json
{
  "message": "Execute isso",
  "name": "Email",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **obrigatório** (string): O prompt ou mensagem para o agente processar.
- `name` opcional (string): Nome amigável para o hook (ex: "GitHub"), usado como prefixo nos resumos das sessões.
- `sessionKey` opcional (string): A chave usada para identificar a sessão do agente. O padrão é um `hook:<uuid>` aleatório. Usar uma chave consistente permite uma conversa de vários turnos dentro do contexto do hook.
- `wakeMode` opcional (`now` | `next-heartbeat`): Se deve disparar um heartbeat imediato (padrão `now`) ou aguardar a próxima verificação periódica.
- `deliver` opcional (boolean): Se `true`, a resposta do agente será enviada para o canal de mensagens. O padrão é `true`. Respostas que são apenas confirmações de heartbeat são omitidas automaticamente.
- `channel` opcional (string): O canal de mensagens para entrega. Um de: `last`, `whatsapp`, `telegram`, `discord`, `slack`, `mattermost` (plugin), `signal`, `imessage`, `msteams`. O padrão é `last`.
- `to` opcional (string): O identificador do destinatário para o canal (ex: número de telefone para WhatsApp/Signal, ID do chat para Telegram, ID do canal para Discord/Slack/Mattermost (plugin), ID da conversa para MS Teams). O padrão é o último destinatário na sessão principal.
- `model` opcional (string): Substituição de modelo (ex: `anthropic/claude-3-5-sonnet` ou um alias). Deve estar na lista de modelos permitidos se houver restrição.
- `thinking` opcional (string): Substituição do nível de pensamento (ex: `low`, `medium`, `high`).
- `timeoutSeconds` opcional (number): Duração máxima para a execução do agente em segundos.

Efeito:

- Executa um turno de agente **isolado** (chave de sessão própria)
- Sempre posta um resumo na sessão **principal**
- Se `wakeMode=now`, dispara um heartbeat imediato

### `POST /hooks/<name>` (mapeado)

Nomes de hooks personalizados são resolvidos via `hooks.mappings` (veja a configuração). Um mapeamento pode transformar payloads arbitrários em ações `wake` ou `agent`, com templates opcionais ou transformações de código.

Opções de mapeamento (resumo):

- `hooks.presets: ["gmail"]` habilita o mapeamento integrado do Gmail.
- `hooks.mappings` permite definir `match`, `action` e templates na configuração.
- `hooks.transformsDir` + `transform.module` carrega um módulo JS/TS para lógica personalizada.
- Use `match.source` para manter um endpoint de ingestão genérico (roteamento baseado em payload).
- Transformações TS exigem um carregador TS (ex: `bun` ou `tsx`) ou `.js` pré-compilado em tempo de execução.
- Defina `deliver: true` + `channel`/`to` em mapeamentos para rotear respostas para uma superfície de chat (`channel` padrão é `last` e volta para o WhatsApp).
- `zero webhooks gmail setup` escreve a configuração `hooks.gmail` para `zero webhooks gmail run`.
Veja [Gmail Pub/Sub](/automation/gmail-pubsub) para o fluxo completo do Gmail watch.

## Respostas

- `200` para `/hooks/wake`
- `202` para `/hooks/agent` (execução assíncrona iniciada)
- `401` em falha de autenticação
- `400` em payload inválido
- `413` em payloads excessivamente grandes

## Exemplos

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SEGREDO' \
  -H 'Content-Type: application/json' \
  -d '{"text":"Novo e-mail recebido","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-zero-token: SEGREDO' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Resumir caixa de entrada","name":"Email","wakeMode":"next-heartbeat"}'
```

### Usar um modelo diferente

Adicione `model` ao payload do agente (ou mapeamento) para substituir o modelo para essa execução:

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-zero-token: SEGREDO' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Resumir caixa de entrada","name":"Email","model":"openai/gpt-5.2-mini"}'
```

Se você impuser `agents.defaults.models`, certifique-se de que o modelo substituto esteja incluído lá.

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SEGREDO' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Olá","snippet":"Oi"}]}'
```

## Segurança

- Mantenha os endpoints de hook atrás de loopback, tailnet ou um proxy reverso confiável.
- Use um token de hook dedicado; não reutilize tokens de autenticação do gateway.
- Evite incluir payloads brutos sensíveis nos logs de webhook.

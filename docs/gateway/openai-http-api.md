---
summary: "Exponha um endpoint HTTP /v1/chat/completions compatível com OpenAI a partir do Gateway"
read_when:
  - Integrando ferramentas que esperam OpenAI Chat Completions
---

# OpenAI Chat Completions (HTTP)

O Gateway do ZERO pode servir um pequeno endpoint compatível com o OpenAI Chat Completions.

Este endpoint está **desabilitado por padrão**. Habilite-o na configuração primeiro.

- `POST /v1/chat/completions`
- Mesma porta do Gateway (multiplexação WS + HTTP): `http://<gateway-host>:<porta>/v1/chat/completions`

Nos bastidores, as requisições são executadas como uma execução normal de agente do Gateway (mesmo caminho de código que `zero agent`), portanto, o roteamento/permissões/configuração coincidem com os do seu Gateway.

## Autenticação

Usa a configuração de autenticação do Gateway. Envie um bearer token:

- `Authorization: Bearer <token>`

Notas:

- Quando `gateway.auth.mode="token"`, use `gateway.auth.token` (ou `ZERO_GATEWAY_TOKEN`).
- Quando `gateway.auth.mode="password"`, use `gateway.auth.password` (ou `ZERO_GATEWAY_PASSWORD`).

## Escolhendo um agente

Nenhum cabeçalho personalizado é obrigatório: codifique o ID do agente no campo `model` da OpenAI:

- `model: "zero:<agentId>"` (exemplo: `"zero:main"`, `"zero:beta"`)
- `model: "agent:<agentId>"` (alias)

Ou aponte para um agente específico do ZERO via cabeçalho:

- `x-zero-agent-id: <agentId>` (padrão: `main`)

Avançado:

- `x-zero-session-key: <sessionKey>` para controlar totalmente o roteamento da sessão.

## Habilitando o endpoint

Defina `gateway.http.endpoints.chatCompletions.enabled` como `true`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true }
      }
    }
  }
}
```

## Desabilitando o endpoint

Defina `gateway.http.endpoints.chatCompletions.enabled` como `false`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false }
      }
    }
  }
}
```

## Comportamento de sessão

Por padrão, o endpoint é **sem estado por requisição (stateless)** (uma nova chave de sessão é gerada a cada chamada).

Se a requisição incluir uma string `user` da OpenAI, o Gateway deriva uma chave de sessão estável a partir dela, de modo que chamadas repetidas possam compartilhar uma sessão de agente.

## Streaming (SSE)

Defina `stream: true` para receber Server-Sent Events (SSE):

- `Content-Type: text/event-stream`
- Cada linha de evento é `data: <json>`
- O fluxo termina com `data: [DONE]`

## Exemplos

Sem streaming:

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-zero-agent-id: main' \
  -d '{
    "model": "zero",
    "messages": [{"role":"user","content":"oi"}]
  }'
```

Com streaming:

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-zero-agent-id: main' \
  -d '{
    "model": "zero",
    "stream": true,
    "messages": [{"role":"user","content":"oi"}]
  }'
```

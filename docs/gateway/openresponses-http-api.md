---
summary: "Exponha um endpoint HTTP /v1/responses compatível com OpenResponses a partir do Gateway"
read_when:
  - Integrando clientes que utilizam a API OpenResponses
  - Quando você deseja entradas baseadas em itens, chamadas de ferramentas do cliente ou eventos SSE
---

# API OpenResponses (HTTP)

O Gateway do ZERO pode servir um endpoint `POST /v1/responses` compatível com OpenResponses.

Este endpoint está **desabilitado por padrão**. Habilite-o na configuração primeiro.

- `POST /v1/responses`
- Mesma porta do Gateway (multiplexação WS + HTTP): `http://<gateway-host>:<port>/v1/responses`

Nos bastidores, as requisições são executadas como uma execução normal de agente do Gateway (mesmo caminho de código que `zero agent`), portanto, o roteamento/permissões/configuração coincidem com os do seu Gateway.

## Autenticação

Usa a configuração de autenticação do Gateway. Envie um bearer token:

- `Authorization: Bearer <token>`

Notas:

- Quando `gateway.auth.mode="token"`, use `gateway.auth.token` (ou `ZERO_GATEWAY_TOKEN`).
- Quando `gateway.auth.mode="password"`, use `gateway.auth.password` (ou `ZERO_GATEWAY_PASSWORD`).

## Escolhendo um agente

Nenhum cabeçalho personalizado é obrigatório: codifique o ID do agente no campo `model` da OpenResponses:

- `model: "zero:<agentId>"` (exemplo: `"zero:main"`, `"zero:beta"`)
- `model: "agent:<agentId>"` (alias)

Ou aponte para um agente específico do ZERO via cabeçalho:

- `x-zero-agent-id: <agentId>` (padrão: `main`)

Avançado:

- `x-zero-session-key: <sessionKey>` para controlar totalmente o roteamento da sessão.

## Habilitando o endpoint

Defina `gateway.http.endpoints.responses.enabled` como `true`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: true }
      }
    }
  }
}
```

## Desabilitando o endpoint

Defina `gateway.http.endpoints.responses.enabled` como `false`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: false }
      }
    }
  }
}
```

## Comportamento de sessão

Por padrão, o endpoint é **sem estado por requisição (stateless)** (uma nova chave de sessão é gerada a cada chamada).

Se a requisição incluir uma string `user` da OpenResponses, o Gateway deriva uma chave de sessão estável a partir dela, de modo que chamadas repetidas possam compartilhar uma sessão de agente.

## Formato da requisição (suportado)

A requisição segue a API OpenResponses com entrada baseada em itens. Suporte atual:

- `input`: string ou array de objetos de item.
- `instructions`: mescladas ao prompt do sistema.
- `tools`: definições de ferramentas do cliente (ferramentas de função).
- `tool_choice`: filtra ou exige ferramentas do cliente.
- `stream`: habilita o streaming SSE.
- `max_output_tokens`: limite de saída de melhor esforço (dependente do provedor).
- `user`: roteamento de sessão estável.

Aceito, mas **atualmente ignorado**:

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `previous_response_id`
- `truncation`

## Itens (entrada)

### `message`

Papéis (Roles): `system`, `developer`, `user`, `assistant`.

- `system` e `developer` são adicionados ao prompt do sistema.
- O item mais recente de `user` ou `function_call_output` torna-se a "mensagem atual".
- Mensagens anteriores de usuário/assistente são incluídas como histórico para contexto.

### `function_call_output` (ferramentas baseadas em turnos)

Envie os resultados da ferramenta de volta ao modelo:

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` e `item_reference`

Aceitos para compatibilidade de esquema, mas ignorados ao construir o prompt.

## Ferramentas (ferramentas de função do lado do cliente)

Forneça ferramentas com `tools: [{ type: "function", function: { name, description?, parameters? } }]`.

Se o agente decidir chamar uma ferramenta, a resposta retornará um item de saída `function_call`. Você então envia uma requisição de acompanhamento com `function_call_output` para continuar o turno.

## Imagens (`input_image`)

Suporta fontes em base64 ou URL:

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://exemplo.com/imagem.png" }
}
```

Tipos MIME permitidos (atuais): `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
Tamanho máximo (atual): 10MB.

## Arquivos (`input_file`)

Suporta fontes em base64 ou URL:

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "ola.txt"
  }
}
```

Tipos MIME permitidos (atuais): `text/plain`, `text/markdown`, `text/html`, `text/csv`, `application/json`, `application/pdf`.

Tamanho máximo (atual): 5MB.

Comportamento atual:

- O conteúdo do arquivo é decodificado e adicionado ao **prompt do sistema**, não à mensagem do usuário, para que permaneça efêmero (não persistido no histórico da sessão).
- PDFs são processados para extração de texto. Se pouco texto for encontrado, as primeiras páginas são rasterizadas em imagens e passadas ao modelo.

O processamento de PDF usa a versão legada do `pdfjs-dist` compatível com Node (sem worker). A versão moderna do PDF.js espera workers de navegador/globals de DOM, portanto não é usada no Gateway.

Padrões de busca por URL:

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- As requisições são protegidas (resolução de DNS, bloqueio de IP privado, limite de redirecionamentos, timeouts).

## Limites de arquivos + imagens (configuração)

Os padrões podem ser ajustados em `gateway.http.endpoints.responses`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          files: {
            allowUrl: true,
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200
            }
          },
          images: {
            allowUrl: true,
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000
          }
        }
      }
    }
  }
}
```

Padrões quando omitidos:

- `maxBodyBytes`: 20MB
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10s
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 4.000.000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s

## Streaming (SSE)

Defina `stream: true` para receber Server-Sent Events (SSE):

- `Content-Type: text/event-stream`
- Cada linha de evento tem `event: <type>` e `data: <json>`
- O fluxo termina com `data: [DONE]`

Tipos de eventos emitidos atualmente:

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed` (em caso de erro)

## Uso (usage)

O campo `usage` é preenchido quando o provedor subjacente relata a contagem de tokens.

## Erros

Os erros utilizam um objeto JSON como:

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

Casos comuns:

- `401` autenticação ausente/inválida
- `400` corpo da requisição inválido
- `405` método incorreto

## Exemplos

Sem streaming:

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-zero-agent-id: main' \
  -d '{
    "model": "zero",
    "input": "oi"
  }'
```

Com streaming:

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-zero-agent-id: main' \
  -d '{
    "model": "zero",
    "stream": true,
    "input": "oi"
  }'
```

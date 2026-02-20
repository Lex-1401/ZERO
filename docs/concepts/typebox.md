---
summary: "Esquemas TypeBox como a única fonte da verdade para o protocolo do gateway"
read_when:
  - Atualizando esquemas de protocolo ou geração de código (codegen)
---
# TypeBox como fonte da verdade do protocolo

Última atualização: 10-01-2026

O TypeBox é uma biblioteca de esquemas com foco em TypeScript. Nós o utilizamos para definir o **protocolo WebSocket do Gateway** (handshake, requisição/resposta, eventos do servidor). Esses esquemas impulsionam a **validação em tempo de execução**, a **exportação de JSON Schema** e a **geração de código Swift** para o aplicativo macOS. Uma única fonte da verdade; todo o resto é gerado.

Se você deseja o contexto do protocolo em um nível mais alto, comece pela [Arquitetura do Gateway](/concepts/architecture).

## Modelo mental (30 segundos)

Cada mensagem WS do Gateway é um de três quadros (frames):

- **Request (Requisição)**: `{ type: "req", id, method, params }`
- **Response (Resposta)**: `{ type: "res", id, ok, payload | error }`
- **Event (Evento)**: `{ type: "event", event, payload, seq?, stateVersion? }`

O primeiro quadro **deve** ser uma requisição `connect`. Depois disso, os clientes podem chamar métodos (ex: `health`, `send`, `chat.send`) e se inscrever em eventos (ex: `presence`, `tick`, `agent`).

Fluxo de conexão (mínimo):

```text
Cliente                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

Métodos e eventos comuns:

| Categoria | Exemplos | Notas |
| --- | --- | --- |
| Core | `connect`, `health`, `status` | `connect` deve ser o primeiro |
| Mensagens | `send`, `poll`, `agent`, `agent.wait` | efeitos colaterais precisam de `idempotencyKey` |
| Chat | `chat.history`, `chat.send`, `chat.abort`, `chat.inject` | O WebChat usa estes |
| Sessões | `sessions.list`, `sessions.patch`, `sessions.delete` | administração de sessão |
| Nós (Nodes) | `node.list`, `node.invoke`, `node.pair.*` | Ações de WS do Gateway + nó |
| Eventos | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown` | push do servidor |

A lista oficial reside em `src/gateway/server.ts` (`METHODS`, `EVENTS`).

## Onde os esquemas residem

- Fonte: `src/gateway/protocol/schema.ts`
- Validadores em tempo de execução (AJV): `src/gateway/protocol/index.ts`
- Handshake do servidor + despacho de métodos: `src/gateway/server.ts`
- Cliente do nó: `src/gateway/client.ts`
- JSON Schema gerado: `dist/protocol.schema.json`
- Modelos Swift gerados: `apps/macos/Sources/ZEROProtocol/GatewayModels.swift`

## Pipeline atual

- `pnpm protocol:gen`
  - grava o JSON Schema (draft‑07) em `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - gera os modelos do gateway em Swift
- `pnpm protocol:check`
  - executa ambos os geradores e verifica se a saída foi enviada (committed)

## Como os esquemas são usados em tempo de execução

- **Lado do servidor**: cada quadro de entrada é validado com AJV. O handshake só aceita uma requisição `connect` cujos parâmetros correspondam a `ConnectParams`.
- **Lado do cliente**: o cliente JS valida os quadros de evento e resposta antes de usá-los.
- **Superfície do método**: o Gateway anuncia os `methods` e `events` suportados em `hello-ok`.

## Exemplos de quadros (frames)

Conectar (primeira mensagem):

```json
{
  "type": "req",
  "id": "c1",
  "method": "connect",
  "params": {
    "minProtocol": 2,
    "maxProtocol": 2,
    "client": {
      "id": "zero-macos",
      "displayName": "macos",
      "version": "1.0.0",
      "platform": "macos 15.1",
      "mode": "ui",
      "instanceId": "A1B2"
    }
  }
}
```

Resposta hello-ok:

```json
{
  "type": "res",
  "id": "c1",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 2,
    "server": { "version": "dev", "connId": "ws-1" },
    "features": { "methods": ["health"], "events": ["tick"] },
    "snapshot": { "presence": [], "health": {}, "stateVersion": { "presence": 0, "health": 0 }, "uptimeMs": 0 },
    "policy": { "maxPayload": 1048576, "maxBufferedBytes": 1048576, "tickIntervalMs": 30000 }
  }
}
```

Requisição + resposta:

```json
{ "type": "req", "id": "r1", "method": "health" }
```

```json
{ "type": "res", "id": "r1", "ok": true, "payload": { "ok": true } }
```

Evento:

```json
{ "type": "event", "event": "tick", "payload": { "ts": 1730000000 }, "seq": 12 }
```

## Cliente mínimo (Node.js)

O fluxo útil mais simples: conectar + saúde (health).

```ts
import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:18789");

ws.on("open", () => {
  ws.send(JSON.stringify({
    type: "req",
    id: "c1",
    method: "connect",
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "cli",
        displayName: "exemplo",
        version: "dev",
        platform: "node",
        mode: "cli"
      }
    }
  }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(String(data));
  if (msg.type === "res" && msg.id === "c1" && msg.ok) {
    ws.send(JSON.stringify({ type: "req", id: "h1", method: "health" }));
  }
  if (msg.type === "res" && msg.id === "h1") {
    console.log("health:", msg.payload);
    ws.close();
  }
});
```

## Exemplo prático: adicionar um método de ponta a ponta

Exemplo: adicionar uma nova requisição `system.echo` que retorna `{ ok: true, text }`.

1) **Esquema (fonte da verdade)**

Adicione ao arquivo `src/gateway/protocol/schema.ts`:

```ts
export const SystemEchoParamsSchema = Type.Object(
  { text: NonEmptyString },
  { additionalProperties: false },
);

export const SystemEchoResultSchema = Type.Object(
  { ok: Type.Boolean(), text: NonEmptyString },
  { additionalProperties: false },
);
```

Adicione ambos ao `ProtocolSchemas` e exporte as tipagens:

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

1) **Validação**

No arquivo `src/gateway/protocol/index.ts`, exporte um validador AJV:

```ts
export const validateSystemEchoParams =
  ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

1) **Comportamento do servidor**

Adicione um manipulador (handler) em `src/gateway/server-methods/system.ts`:

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

Registre-o em `src/gateway/server-methods.ts` (já mescla o `systemHandlers`) e, em seguida, adicione `"system.echo"` aos `METHODS` em `src/gateway/server.ts`.

1) **Regerar**

```bash
pnpm protocol:check
```

1) **Testes + documentação**

Adicione um teste de servidor em `src/gateway/server.*.test.ts` e anote o método na documentação.

## Comportamento do codegen Swift

O gerador Swift emite:

- Enum `GatewayFrame` com os casos `req`, `res`, `event` e `unknown`
- Estruturas/enums de payload fortemente tipados
- Valores de `ErrorCode` e `GATEWAY_PROTOCOL_VERSION`

Tipos de quadros desconhecidos são preservados como payloads brutos para compatibilidade futura.

## Versionamento + compatibilidade

- `PROTOCOL_VERSION` reside em `src/gateway/protocol/schema.ts`.
- Os clientes enviam `minProtocol` + `maxProtocol`; o servidor rejeita incompatibilidades.
- Os modelos Swift mantêm tipos de quadros desconhecidos para evitar a quebra de clientes legados.

## Padrões e convenções de esquema

- A maioria dos objetos usa `additionalProperties: false` para payloads estritos.
- `NonEmptyString` é o padrão para IDs e nomes de métodos/eventos.
- O `GatewayFrame` de nível superior usa um **discriminador** no campo `type`.
- Métodos com efeitos colaterais geralmente exigem uma `idempotencyKey` nos parâmetros (exemplo: `send`, `poll`, `agent`, `chat.send`).

## JSON de esquema vivo

O JSON Schema gerado está no repositório em `dist/protocol.schema.json`. O arquivo bruto publicado geralmente está disponível em:

- <https://raw.githubusercontent.com/zero/zero/main/dist/protocol.schema.json>

## Quando você altera esquemas

1) Atualize os esquemas TypeBox.
2) Execute `pnpm protocol:check`.
3) Envie o esquema regenerado + os modelos Swift.

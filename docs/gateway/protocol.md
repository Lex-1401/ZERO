---
summary: "Protocolo WebSocket do Gateway: handshake, quadros, versionamento"
read_when:
  - Implementando ou atualizando clientes WS do gateway
  - Depurando incompatibilidades de protocolo ou falhas de conexão
  - Regenerando esquemas/modelos de protocolo
---

# Protocolo do Gateway (WebSocket)

O protocolo WS do Gateway é o **único plano de controle + transporte de nó** para o ZERO. Todos os clientes (CLI, interface web, app macOS, nós iOS/Android, nós headless) conectam-se via WebSocket e declaram seu **papel (role)** + **escopo (scope)** no momento do handshake.

## Transporte

- WebSocket, quadros de texto com payloads JSON.
- O primeiro quadro **deve** ser uma requisição `connect`.

## Handshake (connect)

Gateway → Cliente (desafio pré-conexão):

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Cliente → Gateway:

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "zero-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → Cliente:

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

Quando um token de dispositivo é emitido, o `hello-ok` também inclui:

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### Exemplo de Nó (Node)

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "zero-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## Enquadramento (Framing)

- **Requisição**: `{type:"req", id, method, params}`
- **Resposta**: `{type:"res", id, ok, payload|error}`
- **Evento**: `{type:"event", event, payload, seq?, stateVersion?}`

Métodos que causam efeitos colaterais exigem **chaves de idempotência (idempotency keys)** (veja o esquema).

## Papéis (Roles) + escopos (scopes)

### Papéis (Roles)

- `operator` = cliente do plano de controle (CLI/UI/automação).
- `node` = hospedeiro de capacidades (camera/screen/canvas/system.run).

### Escopos (operator)

Escopos comuns:

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

### Caps/commands/permissions (node)

Os nós declaram reivindicações de capacidade no momento da conexão:

- `caps`: categorias de capacidade de alto nível.
- `commands`: lista de permissão de comandos para invocação (invoke).
- `permissions`: chaves granulares (ex: `screen.record`, `camera.capture`).

O Gateway trata estas como **reivindicações (claims)** e impõe listas de permissão no lado do servidor.

## Presença

- `system-presence` retorna entradas indexadas pela identidade do dispositivo.
- As entradas de presença incluem `deviceId`, `roles` e `scopes` para que as UIs possam mostrar uma única linha por dispositivo, mesmo quando ele se conecta tanto como **operator** quanto como **node**.

### Métodos auxiliares de nó (node)

- Os nós podem chamar `skills.bins` para buscar a lista atual de executáveis de habilidades para verificações de permissão automática.

## Aprovações de execução (exec)

- Quando uma requisição de `exec` precisa de aprovação, o gateway transmite `exec.approval.requested`.
- Clientes operadores resolvem chamando `exec.approval.resolve` (exige escopo `operator.approvals`).

## Versionamento

- `PROTOCOL_VERSION` reside em `src/gateway/protocol/schema.ts`.
- Os clientes enviam `minProtocol` + `maxProtocol`; o servidor rejeita incompatibilidades.
- Esquemas + modelos são gerados a partir de definições TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Autenticação (Auth)

- Se `ZERO_GATEWAY_TOKEN` (ou `--token`) estiver definido, o `connect.params.auth.token` deve coincidir ou o soquete será fechado.
- Após o emparelhamento, o Gateway emite um **token de dispositivo** com escopo limitado ao papel e escopos da conexão. Ele é retornado em `hello-ok.auth.deviceToken` e deve ser persistido pelo cliente para conexões futuras.
- Os tokens de dispositivo podem ser rotacionados/revogados via `device.token.rotate` e `device.token.revoke` (exige o escopo `operator.pairing`).

## Identidade do dispositivo + emparelhamento (pairing)

- Os nós devem incluir uma identidade de dispositivo estável (`device.id`) derivada de uma impressão digital (fingerprint) de par de chaves.
- Gateways emitem tokens por dispositivo + papel.
- Aprovações de emparelhamento são exigidas para novos IDs de dispositivo, a menos que a auto-aprovação local esteja habilitada.
- Conexões **locais** incluem loopback e o endereço tailnet do próprio host do gateway (assim, vínculos tailnet no mesmo host ainda podem ser auto-aprovados).
- Todos os clientes WS devem incluir a identidade do `device` durante o `connect` (operator + node). A UI de controle pode omiti-la **apenas** quando `gateway.controlUi.allowInsecureAuth` estiver habilitado.
- Conexões não locais devem assinar o nonce `connect.challenge` fornecido pelo servidor.

## TLS + pinning

- TLS é suportado para conexões WS.
- Os clientes podem, opcionalmente, realizar o "pinning" da impressão digital do certificado do gateway (veja a configuração `gateway.tls` e `gateway.remote.tlsFingerprint` ou CLI `--tls-fingerprint`).

## Escopo

Este protocolo expõe a **API completa do gateway** (status, canais, modelos, chat, agente, sessões, nós, aprovações, etc.). A superfície exata é definida pelos esquemas TypeBox em `src/gateway/protocol/schema.ts`.

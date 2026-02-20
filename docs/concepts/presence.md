---
summary: "Como as entradas de presença do ZERO são produzidas, mescladas e exibidas"
read_when:
  - Depurando a aba de Instâncias (Instances)
  - Investigando linhas de instância duplicadas ou obsoletas
  - Alterando o beacon de conexão WS do gateway ou de eventos do sistema
---
# Presença

A “presença” do ZERO é uma visão leve e de melhor esforço de:

- o próprio **Gateway**, e
- **clientes conectados ao Gateway** (app mac, WebChat, CLI, etc.)

A presença é usada principalmente para renderizar a aba **Instâncias (Instances)** do aplicativo macOS e para fornecer visibilidade rápida ao operador.

## Campos de presença (o que aparece)

As entradas de presença são objetos estruturados com campos como:

- `instanceId` (opcional, mas fortemente recomendado): identidade estável do cliente (geralmente `connect.client.instanceId`).
- `host`: nome do host amigável para humanos.
- `ip`: endereço IP (melhor esforço).
- `version`: string da versão do cliente.
- `deviceFamily` / `modelIdentifier`: dicas de hardware.
- `mode`: `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds`: “segundos desde a última entrada do usuário” (se conhecido).
- `reason`: `self` (próprio), `connect` (conexão), `node-connected` (nó conectado), `periodic` (periódico), ...
- `ts`: carimbo de data/hora da última atualização (ms desde a época/epoch).

## Produtores (de onde vem a presença)

As entradas de presença são produzidas por múltiplas fontes e **mescladas**.

### 1) Entrada própria do Gateway (self)

O Gateway sempre gera uma entrada “self” na inicialização para que as interfaces mostrem o host do gateway mesmo antes da conexão de qualquer cliente.

### 2) Conexão WebSocket (connect)

Cada cliente WS começa com uma requisição `connect`. No handshake bem-sucedido, o Gateway insere/atualiza (upsert) uma entrada de presença para aquela conexão.

#### Por que comandos únicos da CLI não aparecem

A CLI muitas vezes se conecta para comandos curtos e únicos. Para evitar poluir a lista de instâncias, o `client.mode === "cli"` **não** é transformado em uma entrada de presença.

### 3) Beacons de `system-event`

Os clientes podem enviar beacons periódicos mais ricos através do método `system-event`. O app mac usa isso para reportar nome do host, IP e `lastInputSeconds`.

### 4) Conexões de Nós (papel: node)

Quando um nó se conecta através do WebSocket do Gateway com `role: node`, o Gateway insere/atualiza uma entrada de presença para esse nó (mesmo fluxo de outros clientes WS).

## Regras de mesclagem e deduplicação (por que o `instanceId` importa)

As entradas de presença são armazenadas em um único mapa em memória:

- As entradas são indexadas por uma **chave de presença**.
- A melhor chave é um `instanceId` estável (de `connect.client.instanceId`) que sobrevive a reinicializações.
- As chaves não diferenciam maiúsculas de minúsculas (case-insensitive).

Se um cliente se reconectar sem um `instanceId` estável, ele poderá aparecer como uma linha **duplicada**.

## TTL e tamanho limitado

A presença é intencionalmente efêmera:

- **TTL:** entradas com mais de 5 minutos são removidas.
- **Máximo de entradas:** 200 (as mais antigas são descartadas primeiro).

Isso mantém a lista atualizada e evita o crescimento ilimitado da memória.

## Ressalva sobre acesso remoto/túnel (IPs de loopback)

Quando um cliente se conecta por meio de um túnel SSH / redirecionamento de porta local, o Gateway pode ver o endereço remoto como `127.0.0.1`. Para evitar sobrescrever um IP válido reportado pelo cliente, os endereços remotos de loopback são ignorados.

## Consumidores

### Aba de Instâncias do macOS

O aplicativo macOS renderiza a saída de `system-presence` e aplica um pequeno indicador de status (Ativo/Inativo/Obsoleto) baseado na idade da última atualização.

## Dicas de depuração

- Para ver a lista bruta, chame `system-presence` no Gateway.
- Se você vir duplicatas:
  - confirme se os clientes enviam um `client.instanceId` estável no handshake.
  - confirme se os beacons periódicos usam o mesmo `instanceId`.
  - verifique se a entrada derivada da conexão está sem o `instanceId` (duplicatas são esperadas nesse caso).

---
summary: "Arquitetura do gateway WebSocket, componentes e fluxos de clientes"
read_when:
  - Trabalhando no protocolo do gateway, clientes ou transportes
---
# Arquitetura do Gateway

Última atualização: 22-01-2026

## Visão Geral

- Um único **Gateway** de longa duração gerencia todas as superfícies de mensageria (WhatsApp via Baileys, Telegram via grammY, Slack, Discord, Signal, iMessage, WebChat).
- Clientes do plano de controle (app macOS, CLI, UI web, automações) conectam-se ao Gateway via **WebSocket** no host de vínculo configurado (padrão `127.0.0.1:18789`).
- **Nós** (macOS/iOS/Android/headless) também conectam-se via **WebSocket**, mas declaram `role: node` com capacidades/comandos explícitos.
- Um Gateway por host; é o único lugar que abre uma sessão do WhatsApp.
- Um **canvas host** (padrão `18793`) serve HTML editável pelo agente e A2UI.

## Componentes e fluxos

### Gateway (daemon)

- Mantém as conexões dos provedores.
- Expõe uma API WS tipada (requisições, respostas, eventos server-push).
- Valida frames de entrada contra o JSON Schema.
- Emite eventos como `agent`, `chat`, `presence`, `health`, `heartbeat`, `cron`.

### Clientes (app mac / CLI / admin web)

- Uma conexão WS por cliente.
- Envia requisições (`health`, `status`, `send`, `agent`, `system-presence`).
- Subscreve a eventos (`tick`, `agent`, `presence`, `shutdown`).

### Nós (macOS / iOS / Android / headless)

- Conectam-se ao **mesmo servidor WS** com `role: node`.
- Fornecem uma identidade de dispositivo no `connect`; o emparelhamento é **baseado no dispositivo** (papel `node`) e a aprovação reside no repositório de emparelhamento de dispositivos.
- Expõem comandos como `canvas.*`, `camera.*`, `screen.record`, `location.get`.

Detalhes do protocolo:

- [Protocolo do Gateway](/gateway/protocol)

### WebChat

- UI estática que usa a API WS do Gateway para histórico de chat e envios.
- Em configurações remotas, conecta-se através do mesmo túnel SSH/Tailscale que outros clientes.

## Ciclo de vida da conexão (único cliente)

```text
Cliente                   Gateway
  |                          |
  |---- req:connect -------->|
  |<------ res (ok) ---------|   (ou res error + close)
  |   (payload=hello-ok carrega snapshot: presença + saúde)
  |                          |
  |<------ event:presence ---|
  |<------ event:tick -------|
  |                          |
  |------- req:agent ------->|
  |<------ res:agent --------|   (ack: {runId,status:"accepted"})
  |<------ event:agent ------|   (streaming)
  |<------ res:agent --------|   (final: {runId,status,summary})
  |                          |
```

## Protocolo de fio (resumo)

- Transporte: WebSocket, frames de texto com payloads JSON.
- O primeiro frame **deve** ser `connect`.
- Após o handshake:
  - Requisições: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Eventos: `{type:"event", event, payload, seq?, stateVersion?}`
- Se `ZERO_GATEWAY_TOKEN` (ou `--token`) estiver configurado, `connect.params.auth.token` deve coincidir ou o socket fecha.
- Chaves de idempotência são exigidas para métodos com efeitos colaterais (`send`, `agent`) para tentar novamente com segurança; o servidor mantém um cache curto de deduplicação.
- Nós devem incluir `role: "node"` além de caps/comandos/permissões no `connect`.

## Emparelhamento + confiança local

- Todos os clientes WS (operadores + nós) incluem uma **identidade de dispositivo** no `connect`.
- Novos IDs de dispositivos exigem aprovação de emparelhamento; o Gateway emite um **token de dispositivo** para conexões subsequentes.
- Conexões **locais** (loopback ou o próprio endereço tailnet do host do gateway) podem ser aprovadas automaticamente para manter a fluidez do UX no mesmo host.
- Conexões **não locais** devem assinar o nonce `connect.challenge` e exigir aprovação explícita.
- A autenticação do Gateway (`gateway.auth.*`) ainda se aplica a **todas** as conexões, locais ou remotas.

Detalhes: [Protocolo do Gateway](/gateway/protocol), [Emparelhamento](/start/pairing), [Segurança](/gateway/security).

## Tipagem do protocolo e codegen

- Esquemas TypeBox definem o protocolo.
- JSON Schema é gerado a partir desses esquemas.
- Modelos Swift são gerados a partir do JSON Schema.

## Acesso remoto

- Preferencial: Tailscale ou VPN.
- Alternativa: Túnel SSH

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

- O mesmo handshake + token de autenticação se aplicam sobre o túnel.
- TLS + pinning opcional podem ser habilitados para WS em configurações remotas.

## Snapshot de operações

- Iniciar: `zero gateway` (primeiro plano, logs para stdout).
- Saúde: `health` via WS (também incluído em `hello-ok`).
- Supervisão: launchd/systemd para auto-reinício.

## Invariantes

- Exatamente um Gateway controla uma única sessão do Baileys por host.
- Handshake é obrigatório; qualquer frame inicial que não seja JSON ou connect resulta em um fechamento forçado.
- Eventos não são reproduzidos; os clientes devem atualizar em caso de lacunas.

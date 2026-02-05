---
summary: "Como o app mac incorpora o WebChat do gateway e como depurá-lo"
read_when:
  - Depurando a view do WebChat no mac ou porta loopback
---
# WebChat (app macOS)

O app da barra de menus do macOS incorpora a UI do WebChat como uma view nativa em SwiftUI. Ele se conecta ao Gateway e usa como padrão a **sessão principal** (main session) para o agente selecionado (com um alternador de sessões para outras sessões).

- **Modo Local**: conecta-se diretamente ao WebSocket do Gateway local.
- **Modo Remoto**: encaminha a porta de controle do Gateway via SSH e usa esse túnel como plano de dados.

## Inicialização e depuração

- Manual: Menu VOID → “Open Chat”.
- Abertura automática para testes:

  ```bash
  dist/ZERO.app/Contents/MacOS/ZERO --webchat
  ```

- Logs: `./scripts/clawlog.sh` (subsistema `com.zero`, categoria `WebChatSwiftUI`).

## Como está conectado

- Plano de dados: Métodos WS do Gateway `chat.history`, `chat.send`, `chat.abort`, `chat.inject` e eventos `chat`, `agent`, `presence`, `tick`, `health`.
- Sessão: o padrão é a sessão primária (`main`, ou `global` quando o escopo é global). A UI pode alternar entre sessões.
- O onboarding usa uma sessão dedicada para manter a configuração de primeira execução separada.

## Superfície de segurança

- O modo remoto encaminha apenas a porta de controle do WebSocket do Gateway via SSH.

## Limitações conhecidas

- A UI é otimizada para sessões de chat (não é uma sandbox completa de navegador).

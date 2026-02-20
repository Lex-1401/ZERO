---
summary: "Arquitetura de IPC (Comunicação Entre Processos) do macOS para o app ZERO, transporte do nó gateway e PeekabooBridge"
read_when:
  - Editando contratos de IPC ou IPC do app da barra de menus
---
# Arquitetura de IPC do ZERO no macOS

**Modelo atual:** um socket Unix local conecta o **serviço host do nó** ao **app macOS** para aprovações de execução (exec approvals) + `system.run`. Existe uma CLI de depuração `zero-mac` para verificações de descoberta/conexão; as ações do agente ainda fluem através do WebSocket do Gateway e `node.invoke`. A automação de interface (UI) usa o PeekabooBridge.

## Objetivos

- Instância única de app GUI que detém todo o trabalho voltado ao TCC (notificações, gravação de tela, microfone, fala, AppleScript).
- Uma superfície pequena para automação: comandos do Gateway + nó, além do PeekabooBridge para automação de interface.
- Permissões previsíveis: sempre o mesmo bundle ID assinado, iniciado via launchd, para que as concessões de TCC sejam mantidas.

## Como funciona

### Transporte Gateway + nó

- O app executa o Gateway (modo local) e se conecta a ele como um nó.
- As ações do agente são realizadas via `node.invoke` (ex: `system.run`, `system.notify`, `canvas.*`).

### Serviço do nó + IPC do app

- Um serviço de host de nó sem interface (headless) se conecta ao WebSocket do Gateway.
- Requisições de `system.run` são encaminhadas para o app macOS através de um socket Unix local.
- O app executa o comando no contexto da interface, solicita permissão se necessário e retorna a saída.

Diagrama (SCI):

```
Agente -> Gateway -> Serviço do Nó (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  App Mac (UI + TCC + system.run)
```

### PeekabooBridge (automação de interface)

- A automação de interface usa um socket UNIX separado chamado `bridge.sock` e o protocolo JSON do PeekabooBridge.
- Ordem de preferência do host (lado do cliente): Peekaboo.app → Claude.app → ZERO.app → execução local.
- Segurança: os hosts do bridge exigem um TeamID permitido; o escape para o mesmo UID apenas em DEBUG é protegido por `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` (convenção do Peekaboo).
- Veja: [Uso do PeekabooBridge](/platforms/mac/peekaboo) para detalhes.

## Fluxos operacionais

- Reiniciar/recompilar: `SIGN_IDENTITY="Apple Development: <Nome do Desenvolvedor> (<TEAMID>)" scripts/restart-mac.sh`
  - Encerra instâncias existentes
  - Build Swift + empacotamento
  - Grava/inicializa/ativa o LaunchAgent
- Instância única: o app encerra precocemente se outra instância com o mesmo bundle ID estiver em execução.

## Notas de reforço

- Prefira exigir a correspondência de TeamID para todas as superfícies privilegiadas.
- PeekabooBridge: `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` (apenas DEBUG) pode permitir chamadores com o mesmo UID para desenvolvimento local.
- Toda a comunicação permanece apenas local; nenhum socket de rede é exposto.
- Solicitações de TCC originam-se apenas do pacote do app GUI; mantenha o bundle ID assinado estável entre as recompilações.
- Reforço do IPC: modo de socket `0600`, token, verificações de UID do par, desafio/resposta HMAC, TTL curto.

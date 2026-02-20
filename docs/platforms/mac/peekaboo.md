---
summary: "Integração do PeekabooBridge para automação de interface no macOS"
read_when:
  - Hospedando o PeekabooBridge no ZERO.app
  - Integrando o Peekaboo via Swift Package Manager
  - Alterando o protocolo/caminhos do PeekabooBridge
---
# Peekaboo Bridge (automação de interface no macOS)

O ZERO pode hospedar o **PeekabooBridge** como um broker de automação de interface local e ciente de permissões. Isso permite que a CLI `peekaboo` execute automações de interface reutilizando as permissões de TCC do app macOS.

## O que isso é (e o que não é)

- **Host (Hospedeiro)**: O ZERO.app pode atuar como um hospedeiro do PeekabooBridge.
- **Client (Cliente)**: use a CLI `peekaboo` (não há uma superfície separada de `zero ui ...`).
- **UI (Interface)**: as sobreposições visuais permanecem no Peekaboo.app; o ZERO é um hospedeiro broker leve.

## Habilitar o bridge (ponte)

No app macOS:

- Ajustes → **Enable Peekaboo Bridge**

Quando habilitado, o ZERO inicia um servidor de socket UNIX local. Se desabilitado, o hospedeiro é interrompido e o `peekaboo` voltará a usar outros hospedeiros disponíveis.

## Ordem de descoberta do cliente

Os clientes do Peekaboo normalmente tentam os hospedeiros nesta ordem:

1. Peekaboo.app (UX completa)
2. Claude.app (se instalado)
3. ZERO.app (broker leve)

Use `peekaboo bridge status --verbose` para ver qual hospedeiro está ativo e qual caminho de socket está em uso. Você pode substituir com:

```bash
export PEEKABOO_BRIDGE_SOCKET=/caminho/para/bridge.sock
```

## Segurança e permissões

- O bridge valida as **assinaturas de código do chamador**; uma lista de permissões (allowlist) de TeamIDs é imposta (TeamID do hospedeiro Peekaboo + TeamID do app ZERO).
- As requisições expiram após cerca de 10 segundos.
- Se as permissões necessárias estiverem ausentes, o bridge retorna uma mensagem de erro clara em vez de abrir os Ajustes do Sistema.

## Comportamento do snapshot (automação)

Os snapshots são armazenados em memória e expiram automaticamente após uma janela curta. Se você precisar de uma retenção mais longa, capture novamente a partir do cliente.

## Solução de problemas

- Se o `peekaboo` relatar “bridge client is not authorized”, certifique-se de que o cliente esteja devidamente assinado ou execute o hospedeiro com `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` apenas no modo de **depuração**.
- Se nenhum hospedeiro for encontrado, abra um dos apps hospedeiros (Peekaboo.app ou ZERO.app) e confirme se as permissões foram concedidas.

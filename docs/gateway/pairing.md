---
summary: "Emparelhamento de nós (pairing) do Gateway (Opção B) para iOS e outros nós remotos"
read_when:
  - Implementando aprovações de emparelhamento de nós sem a UI do macOS
  - Adicionando fluxos de CLI para aprovar nós remotos
  - Estendendo o protocolo do gateway com gerenciamento de nós
---

# Emparelhamento de nós (pairing) do Gateway (Opção B)

No emparelhamento de nós do Gateway, o **Gateway** é a fonte da verdade para definir quais nós têm permissão para ingressar. As interfaces de usuário (app macOS, futuros clientes) são apenas frontends que aprovam ou rejeitam as solicitações pendentes.

**Importante:** Nós WS utilizam o **emparelhamento de dispositivos (device pairing)** (papel `node`) durante o `connect`. O `node.pair.*` é um armazenamento de emparelhamento separado e **não** bloqueia o handshake WS. Apenas clientes que chamam explicitamente `node.pair.*` utilizam este fluxo.

## Conceitos

- **Solicitação pendente (pending request)**: um nó solicitou ingresso; requer aprovação.
- **Nó emparelhado (paired node)**: nó aprovado com um token de autenticação emitido.
- **Transporte (transport)**: o endpoint WS do Gateway encaminha as solicitações, mas não decide a adesão. (O suporte legado ao bridge TCP foi depreciado/removido).

## Como funciona o emparelhamento

1. Um nó se conecta ao WS do Gateway e solicita o emparelhamento.
2. O Gateway armazena uma **solicitação pendente** e emite `node.pair.requested`.
3. Você aprova ou rejeita a solicitação (CLI ou UI).
4. Após a aprovação, o Gateway emite um **novo token** (os tokens são rotacionados ao re-emparelhar).
5. O nó se reconecta usando o token e agora está "emparelhado".

Solicitações pendentes expiram automaticamente após **5 minutos**.

## Fluxo da CLI (compatível com modo headless)

```bash
zero nodes pending
zero nodes approve <requestId>
zero nodes reject <requestId>
zero nodes status
zero nodes rename --node <id|name|ip> --name "Living Room iPad"
```

O comando `nodes status` mostra os nós emparelhados/conectados e suas capacidades.

## Superfície da API (protocolo do gateway)

Eventos:

- `node.pair.requested` — emitido quando uma nova solicitação pendente é criada.
- `node.pair.resolved` — emitido quando uma solicitação é aprovada/rejeitada/expirada.

Métodos:

- `node.pair.request` — cria ou reutiliza uma solicitação pendente.
- `node.pair.list` — lista nós pendentes + emparelhados.
- `node.pair.approve` — aprova uma solicitação pendente (emite o token).
- `node.pair.reject` — rejeita uma solicitação pendente.
- `node.pair.verify` — verifica `{ nodeId, token }`.

Notas:

- `node.pair.request` é idempotente por nó: chamadas repetidas retornam a mesma solicitação pendente.
- A aprovação **sempre** gera um token novo; nenhum token é retornado por `node.pair.request`.
- As solicitações podem incluir `silent: true` como uma dica para fluxos de auto-aprovação.

## Auto-aprovação (app macOS)

O app macOS pode, opcionalmente, tentar uma **aprovação silenciosa (silent approval)** quando:

- a solicitação está marcada como `silent`, e
- o app consegue verificar uma conexão SSH com o host do gateway usando o mesmo usuário.

Se a aprovação silenciosa falhar, o sistema volta para o prompt normal de "Aprovar/Rejeitar".

## Armazenamento (local, privado)

O estado de emparelhamento é armazenado no diretório de estado do Gateway (padrão `~/.zero`):

- `~/.zero/nodes/paired.json`
- `~/.zero/nodes/pending.json`

Se você sobrescrever `ZERO_STATE_DIR`, a pasta `nodes/` será movida junto.

Notas de segurança:

- Tokens são segredos; trate o arquivo `paired.json` como sensível.
- Rotacionar um token exige nova aprovação (ou a exclusão da entrada do nó).

## Comportamento de transporte

- O transporte é **sem estado (stateless)**; ele não armazena a adesão.
- Se o Gateway estiver offline ou o emparelhamento estiver desativado, os nós não poderão ser emparelhados.
- Se o Gateway estiver em modo remoto, o emparelhamento ainda ocorrerá no armazenamento do Gateway remoto.

---
summary: "Aprovações de execução, listas de permissão e prompts de escape de sandbox"
read_when:
  - Configurando aprovações de exec ou listas de permissão
  - Implementando UX de aprovação de exec no app macOS
  - Revisando prompts de escape de sandbox e implicações
---

# Aprovações de Exec (Exec approvals)

Aprovações de execução são o **guardrail do app companheiro / host de nó** para permitir que um agente em sandbox execute
comandos em um host real (`gateway` ou `node`). Pense nisso como um bloqueio de segurança:
comandos são permitidos apenas quando política + lista de permissão + (opcional) aprovação do usuário concordam.
Aprovações de exec são **adicionais** à política de ferramenta e portão elevado (a menos que elevado esteja definido como `full`, o que pula aprovações).
A política efetiva é a **mais restrita** de `tools.exec.*` e padrões de aprovações; se um campo de aprovações for omitido, o valor `tools.exec` é usado.

Se a UI do app companheiro **não estiver disponível**, qualquer solicitação que exija um prompt é
resolvida pelo **fallback de pergunta** (ask fallback) (padrão: negar).

## Onde se aplica

Aprovações de exec são impostas localmente no host de execução:

- **host de gateway** → processo `zero` na máquina gateway
- **host de nó** → executor de nó (app companheiro macOS ou host de nó headless)

Divisão macOS:

- **serviço de host de nó** encaminha `system.run` para o **app macOS** via IPC local.
- **app macOS** impõe aprovações + executa o comando no contexto da UI.

## Configurações e armazenamento

Aprovações residem em um arquivo JSON local no host de execução:

`~/.zero/exec-approvals.json`

Exemplo de esquema:

```json
{
  "version": 1,
  "socket": {
    "path": "~/.zero/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## Botões de Política

### Segurança (`exec.security`)

- **deny**: bloqueia todas as solicitações de exec no host.
- **allowlist**: permite apenas comandos na lista de permissão.
- **full**: permite tudo (equivalente a elevado).

### Pergunta (`exec.ask`)

- **off**: nunca pergunta.
- **on-miss**: pergunta apenas quando a lista de permissão não corresponde.
- **always**: pergunta em todos os comandos.

### Fallback de Pergunta (`askFallback`)

Se um prompt for necessário mas nenhuma UI estiver acessível, o fallback decide:

- **deny**: bloqueia.
- **allowlist**: permite apenas se a lista de permissão corresponder.
- **full**: permite.

## Lista de Permissão (por agente)

Listas de permissão são **por agente**. Se múltiplos agentes existirem, troque qual agente você está
editando no app macOS. Padrões são **correspondências glob insensíveis a maiúsculas/minúsculas**.
Padrões devem resolver para **caminhos de binários** (entradas somente com nome base são ignoradas).
Entradas legadas `agents.default` são migradas para `agents.main` ao carregar.

Exemplos:

- `~/Projects/**/bin/bird`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Cada entrada da lista de permissão rastreia:

- **id** UUID estável usado para identidade na UI (opcional)
- **último uso** timestamp
- **último comando usado**
- **último caminho resolvido**

## Auto-permitir CLIs de habilidades

Quando **Auto-permitir CLIs de habilidades** está ativado, executáveis referenciados por habilidades conhecidas
são tratados como permitidos em nós (nó macOS ou host de nó headless). Isso usa
`skills.bins` sobre o RPC do Gateway para buscar a lista de binários da habilidade. Desative isso se quiser listas de permissão manuais estritas.

## Binários seguros (somente-stdin)

`tools.exec.safeBins` define uma pequena lista de binários **somente-stdin** (por exemplo `jq`)
que podem rodar no modo lista de permissão **sem** entradas explícitas na lista de permissão. Binários seguros rejeitam
argumentos de arquivo posicionais e tokens semelhantes a caminhos, então eles só podem operar no stream de entrada.
Encadeamento de shell e redirecionamentos não são auto-permitidos no modo lista de permissão.

Encadeamento de shell (`&&`, `||`, `;`) é permitido quando cada segmento de nível superior satisfaz a lista de permissão
(incluindo binários seguros ou auto-permissão de habilidade). Redirecionamentos permanecem não suportados no modo lista de permissão.

Binários seguros padrão: `jq`, `grep`, `cut`, `sort`, `uniq`, `head`, `tail`, `tr`, `wc`.

## Edição na Control UI

Use o card **Control UI → Nodes → Exec approvals** para editar padrões, substituições
por agente e listas de permissão. Escolha um escopo (Padrões ou um agente), ajuste a política,
adicione/remova padrões de lista de permissão, depois **Salve**. A UI mostra metadados de **último uso**
por padrão para que você possa manter a lista organizada.

O seletor de alvo escolhe **Gateway** (aprovações locais) ou um **Nó**. Nós
devem anunciar `system.execApprovals.get/set` (app macOS ou host de nó headless).
Se um nó não anunciar aprovações de execução ainda, edite seu arquivo local
`~/.zero/exec-approvals.json` diretamente.

CLI: `zero approvals` suporta edição de gateway ou nó (veja [Approvals CLI](/cli/approvals)).

## Fluxo de aprovação

Quando um prompt é necessário, o gateway transmite `exec.approval.requested` para clientes operadores.
A Control UI e o app macOS resolvem via `exec.approval.resolve`, então o gateway encaminha a
solicitação aprovada para o host de nó.

Quando aprovações são necessárias, a ferramenta exec retorna imediatamente com um id de aprovação. Use esse id para
correlacionar eventos de sistema posteriores (`Exec finished` / `Exec denied`). Se nenhuma decisão chegar antes do
timeout, a solicitação é tratada como timeout de aprovação e apresentada como motivo de negação.

O diálogo de confirmação inclui:

- comando + args
- cwd
- id do agente
- caminho executável resolvido
- metadados de host + política

Ações:

- **Permitir uma vez** → rodar agora
- **Sempre permitir** → adicionar à lista de permissão + rodar
- **Negar** → bloquear

## Encaminhamento de aprovação para canais de chat

Você pode encaminhar prompts de aprovação de execução para qualquer canal de chat (incluindo canais de plugin) e aprová-los
com `/approve`. Isso usa o pipeline normal de entrega de saída.

Config:

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring ou regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" }
      ]
    }
  }
}
```

Resposta no chat:

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### Fluxo macOS IPC

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notas de segurança:

- Modo de socket Unix `0600`, token armazenado em `exec-approvals.json`.
- Verificação de mesmo UID.
- Desafio/resposta (nonce + token HMAC + hash da solicitação) + TTL curto.

## Eventos de sistema

O ciclo de vida de Exec é apresentado como mensagens de sistema:

- `Exec running` (apenas se o comando exceder o limite de aviso de execução)
- `Exec finished`
- `Exec denied`

Estes são postados na sessão do agente após o nó relatar o evento.
Aprovações de exec do host gateway emitem os mesmos eventos de ciclo de vida quando o comando termina (e opcionalmente quando roda mais que o limite).
Execuções controladas por aprovação reutilizam o id de aprovação como `runId` nessas mensagens para fácil correlação.

## Implicações

- **full** é poderoso; prefira listas de permissão quando possível.
- **ask** mantém você no circuito enquanto ainda permite aprovações rápidas.
- Listas de permissão por agente impedem que aprovações de um agente vazem para outros.

Relacionado:

- [Ferramenta Exec](/tools/exec)
- [Modo Elevado](/tools/elevated)
- [Habilidades](/tools/skills)

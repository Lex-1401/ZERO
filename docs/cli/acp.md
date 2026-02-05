---
summary: "Execute a bridge ACP para integrações de IDE"
read_when:
  - Configurando integrações de IDE baseadas em ACP
  - Depurando roteamento de sessão ACP para o Gateway
---

# acp

Execute a bridge ACP (Agent Client Protocol) que fala com um ZERO Gateway.

Este comando fala ACP sobre stdio para IDEs e encaminha prompts para o Gateway
sobre WebSocket. Ele mantém sessões ACP mapeadas para chaves de sessão do Gateway.

## Uso

```bash
zero acp

# Gateway Remoto
zero acp --url wss://gateway-host:18789 --token <token>

# Anexar a uma chave de sessão existente
zero acp --session agent:main:main

# Anexar por rótulo (deve existir)
zero acp --session-label "support inbox"

# Resetar a chave de sessão antes do primeiro prompt
zero acp --session agent:main:main --reset-session
```

## Cliente ACP (debug)

Use o cliente ACP embutido para fazer sanity-check da bridge sem um IDE.
Ele spawna a bridge ACP e permite digitar prompts interativamente.

```bash
zero acp client

# Apontar a bridge spawnada para um Gateway remoto
zero acp client --server-args --url wss://gateway-host:18789 --token <token>

# Sobrescrever o comando do servidor (padrão: zero)
zero acp client --server "node" --server-args dist/entry.js acp --url ws://127.0.0.1:19001
```

## Como usar isso

Use ACP quando um IDE (ou outro cliente) fala Agent Client Protocol e você quer
que ele dirija uma sessão de ZERO Gateway.

1. Garanta que o Gateway está rodando (local ou remoto).
2. Configure o alvo do Gateway (config ou flags).
3. Aponte seu IDE para rodar `zero acp` sobre stdio.

Exemplo de config (persistida):

```bash
zero config set gateway.remote.url wss://gateway-host:18789
zero config set gateway.remote.token <token>
```

Exemplo de execução direta (sem gravação de config):

```bash
zero acp --url wss://gateway-host:18789 --token <token>
```

## Selecionando agentes

O ACP não escolhe agentes diretamente. Ele roteia pela chave de sessão do Gateway.

Use chaves de sessão escopadas por agente para mirar um agente específico:

```bash
zero acp --session agent:main:main
zero acp --session agent:design:main
zero acp --session agent:qa:bug-123
```

Cada sessão ACP mapeia para uma única chave de sessão de Gateway. Um agente pode ter muitas
sessões; o ACP padroniza para uma sessão `acp:<uuid>` isolada a menos que você sobrescreva
a chave ou rótulo.

## Configuração do editor Zed

Adicione um agente ACP personalizado em `~/.config/zed/settings.json` (ou use a UI de Settings do Zed):

```json
{
  "agent_servers": {
    "ZERO ACP": {
      "type": "custom",
      "command": "zero",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

Para mirar um Gateway ou agente específico:

```json
{
  "agent_servers": {
    "ZERO ACP": {
      "type": "custom",
      "command": "zero",
      "args": [
        "acp",
        "--url", "wss://gateway-host:18789",
        "--token", "<token>",
        "--session", "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

No Zed, abra o painel de Agent e selecione "ZERO ACP" para iniciar uma thread.

## Mapeamento de sessão

Por padrão, sessões ACP recebem uma chave de sessão Gateway isolada com um prefixo `acp:`.
Para reusar uma sessão conhecida, passe uma chave de sessão ou rótulo:

- `--session <chave>`: use uma chave de sessão de Gateway específica.
- `--session-label <rotulo>`: resolva uma sessão existente por rótulo.
- `--reset-session`: crie um id de sessão novo para essa chave (mesma chave, nova transcrição).

Se seu cliente ACP suporta metadados, você pode sobrescrever por sessão:

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

Saiba mais sobre chaves de sessão em [/concepts/session](/concepts/session).

## Opções

- `--url <url>`: URL WebSocket do Gateway (padroniza para gateway.remote.url quando configurado).
- `--token <token>`: Token de auth do Gateway.
- `--password <senha>`: Senha de auth do Gateway.
- `--session <chave>`: chave de sessão padrão.
- `--session-label <rotulo>`: rótulo de sessão padrão para resolver.
- `--require-existing`: falha se a chave/rótulo de sessão não existir.
- `--reset-session`: reseta a chave de sessão antes do primeiro uso.
- `--no-prefix-cwd`: não prefixar prompts com o diretório de trabalho.
- `--verbose, -v`: log verboso para stderr.

### Opções `acp client`

- `--cwd <dir>`: diretório de trabalho para a sessão ACP.
- `--server <comando>`: comando de servidor ACP (padrão: `zero`).
- `--server-args <args...>`: argumentos extras passados para o servidor ACP.
- `--server-verbose`: ativar log verboso no servidor ACP.
- `--verbose, -v`: log de cliente verboso.

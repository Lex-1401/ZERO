# Zero ACP Bridge (Ponte ACP)

Este documento descreve como funciona a ponte Zero ACP (Agent Client Protocol - Protocolo de Cliente de Agente), como ela mapeia sessões ACP para sessões do Gateway e como os IDEs devem invocá-la.

## Visão Geral

`zero acp` expõe um agente ACP via stdio e encaminha os prompts para um Gateway Zero em execução via WebSocket. Ele mantém os IDs de sessão ACP mapeados para chaves de sessão do Gateway para que os IDEs possam se reconectar à mesma transcrição do agente ou reiniciá-la mediante solicitação.

Principais objetivos:

- Área de superfície ACP mínima (stdio, NDJSON).
- Mapeamento de sessão estável em reconexões.
- Funciona com a loja de sessões do Gateway existente (listar/resolver/reiniciar).
- Padrões seguros (chaves de sessão ACP isoladas por padrão).

## Como posso usar isso

Use ACP quando um IDE ou ferramenta falar o Protocolo de Cliente de Agente e você quiser que ele conduza uma sessão do Gateway Zero.

Etapas rápidas:

1. Execute um Gateway (local ou remoto).
2. Configure o destino do Gateway (`gateway.remote.url` + autenticação) ou passe sinalizadores.
3. Aponte o IDE para executar `zero acp` via stdio.

Exemplo de configuração:

```bash
zero config set gateway.remote.url wss://gateway-host:18789
zero config set gateway.remote.token <token>
```

Exemplo de execução:

```bash
zero acp --url wss://gateway-host:18789 --token <token>
```

## Selecionando agentes

O ACP não escolhe agentes diretamente. Ele roteia pela chave de sessão do Gateway.

Use chaves de sessão com escopo de agente para segmentar um agente específico:

```bash
zero acp --session agent:main:main
zero acp --session agent:design:main
zero acp --session agent:qa:bug-123
```

Cada sessão ACP mapeia para uma única chave de sessão do Gateway. Um agente pode ter muitas sessões; o ACP padroniza para uma sessão isolada `acp:<uuid>`, a menos que você substitua a chave ou o rótulo.

## Configuração do editor Zed

Adicione um agente ACP personalizado em `~/.config/zed/settings.json`:

```json
{
  "agent_servers": {
    "Zero ACP": {
      "type": "custom",
      "command": "zero",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

Para segmentar um Gateway ou agente específico:

```json
{
  "agent_servers": {
    "Zero ACP": {
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

No Zed, abra o painel de Agente e selecione “Zero ACP” para iniciar uma conversa.

## Modelo de Execução

- O cliente ACP inicia `zero acp` e fala mensagens ACP via stdio.
- A ponte se conecta ao Gateway usando a configuração de autenticação existente (ou sinalizadores CLI).
- O `prompt` do ACP é traduzido para `chat.send` do Gateway.
- Os eventos de streaming do Gateway são traduzidos de volta para eventos de streaming do ACP.
- O `cancel` do ACP mapeia para `chat.abort` do Gateway para a execução ativa.

## Mapeamento de Sessão

Por padrão, cada sessão ACP é mapeada para uma chave de sessão do Gateway dedicada:

- `acp:<uuid>`, a menos que seja substituído.

Você pode substituir ou reutilizar sessões de duas maneiras:

1) Padrões da CLI

```bash
zero acp --session agent:main:main
zero acp --session-label "caixa de entrada de suporte"
zero acp --reset-session
```

1) Metadados ACP por sessão

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "caixa de entrada de suporte",
    "resetSession": true,
    "requireExisting": false
  }
}
```

Regras:

- `sessionKey`: chave de sessão direta do Gateway.
- `sessionLabel`: resolve uma sessão existente pelo rótulo.
- `resetSession`: cria uma nova transcrição para a chave antes do primeiro uso.
- `requireExisting`: falha se a chave/rótulo não existir.

### Listagem de Sessões

O `listSessions` do ACP mapeia para `sessions.list` do Gateway e retorna um resumo filtrado adequado para seletores de sessão de IDE. `_meta.limit` pode limitar o número de sessões retornadas.

## Tradução de Prompts

As entradas de prompt do ACP são convertidas em um `chat.send` do Gateway:

- Blocos de `text` e `resource` tornam-se o texto do prompt.
- `resource_link` com tipos mime de imagem tornam-se anexos.
- O diretório de trabalho pode ser prefixado no prompt (ativado por padrão, pode ser desativado com `--no-prefix-cwd`).

Os eventos de streaming do Gateway são traduzidos em atualizações de `message` e `tool_call` do ACP. Os estados terminais do Gateway mapeiam para `done` do ACP com os motivos de parada:

- `complete` -> `stop`
- `aborted` -> `cancel`
- `error` -> `error`

## Autenticação e Descoberta de Gateway

`zero acp` resolve a URL do Gateway e a autenticação a partir de sinalizadores CLI ou configuração:

- `--url` / `--token` / `--password` têm precedência.
- Caso contrário, usa as configurações `gateway.remote.*` configuradas.

## Notas Operacionais

- As sessões ACP são armazenadas em memória durante o tempo de vida do processo da ponte.
- O estado da sessão do Gateway é mantido pelo próprio Gateway.
- `--verbose` registra eventos da ponte ACP/Gateway no stderr (nunca no stdout).
- As execuções do ACP podem ser canceladas e o ID de execução ativa é rastreado por sessão.

## Compatibilidade

- A ponte ACP usa `@agentclientprotocol/sdk` (atualmente 0.13.x).
- Funciona com clientes ACP que implementam `initialize`, `newSession`, `loadSession`, `prompt`, `cancel` e `listSessions`.

## Testes

- Unidade: `src/acp/session.test.ts` cobre o ciclo de vida do ID de execução.
- Gate completo: `pnpm lint && pnpm build && pnpm test && pnpm docs:build`.

## Documentos Relacionados

- Uso da CLI: `docs/cli/acp.md`
- Modelo de sessão: `docs/concepts/session.md`
- Internos de gerenciamento de sessão: `docs/reference/session-management-compaction.md`

---
summary: "Ferramentas de sessão do agente para listar sessões, buscar histórico e enviar mensagens entre sessões"
read_when:
  - Adicionando ou modificando ferramentas de sessão
---

# Ferramentas de Sessão

Objetivo: conjunto de ferramentas pequenas e difíceis de usar incorretamente para que os agentes possam listar sessões, buscar histórico e enviar para outra sessão.

## Nomes das Ferramentas

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## Modelo de Chave (Key Model)

- O balde principal de chat direto é sempre a chave literal `"main"` (resolvida para a chave principal do agente atual).
- Chats de grupo usam `agent:<agentId>:<channel>:group:<id>` ou `agent:<agentId>:<channel>:channel:<id>` (passe a chave completa).
- Tarefas agendadas (cron jobs) usam `cron:<job.id>`.
- Ganchos (hooks) usam `hook:<uuid>`, a menos que definido explicitamente.
- Sessões de nós usam `node-<nodeId>`, a menos que definido explicitamente.

`global` e `unknown` são valores reservados e nunca são listados. Se `session.scope = "global"`, nós o apelidamos (alias) para `main` para todas as ferramentas, de modo que quem chama nunca veja o `global`.

## sessions_list

Lista sessões como uma matriz (array) de linhas.

Parâmetros:

- `kinds?: string[]` (filtro): qualquer um de `"main" | "group" | "cron" | "hook" | "node" | "other"`.
- `limit?: number`: máximo de linhas (padrão: padrão do servidor, limitado por exemplo a 200).
- `activeMinutes?: number`: apenas sessões atualizadas nos últimos N minutos.
- `messageLimit?: number`: 0 = sem mensagens (padrão 0); >0 = incluir as últimas N mensagens.

Comportamento:

- `messageLimit > 0` busca `chat.history` por sessão e inclui as últimas N mensagens.
- Resultados de ferramentas são filtrados na saída da lista; use `sessions_history` para mensagens de ferramentas.
- Ao executar em uma sessão de agente em **sandbox**, as ferramentas de sessão assumem o padrão de **visibilidade apenas de sessões criadas (spawned)** (veja abaixo).

Formato da linha (JSON):

- `key`: chave da sessão (string).
- `kind`: `main | group | cron | hook | node | other`.
- `channel`: `whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`.
- `displayName`: (rótulo de exibição do grupo, se disponível).
- `updatedAt`: (ms).
- `sessionId`.
- `model`, `contextTokens`, `totalTokens`.
- `thinkingLevel`, `verboseLevel`, `systemSent`, `abortedLastRun`.
- `sendPolicy`: (sobrescrita da sessão, se definida).
- `lastChannel`, `lastTo`.
- `deliveryContext`: normalizado `{ channel, to, accountId }` (quando disponível).
- `transcriptPath`: caminho de melhor esforço derivado do diretório de armazenamento + sessionId.
- `messages?`: (apenas quando `messageLimit > 0`).

## sessions_history

Busca a transcrição de uma sessão.

Parâmetros:

- `sessionKey` (obrigatório; aceita a chave da sessão ou o `sessionId` do `sessions_list`).
- `limit?: number`: máximo de mensagens (limite do servidor).
- `includeTools?: boolean` (padrão flase).

Comportamento:

- `includeTools=false` filtra mensagens de `role: "toolResult"`.
- Retorna a matriz de mensagens no formato bruto da transcrição.
- Quando fornecido um `sessionId`, o ZERO o resolve para a chave de sessão correspondente (IDs ausentes retornam erro).

## sessions_send

Envia uma mensagem para outra sessão.

Parâmetros:

- `sessionKey` (obrigatório; aceita a chave da sessão ou o `sessionId` do `sessions_list`).
- `message` (obrigatório).
- `timeoutSeconds?: number` (padrão >0; 0 = disparar e esquecer - fire-and-forget).

Comportamento:

- `timeoutSeconds = 0`: enfileira e retorna `{ runId, status: "accepted" }`.
- `timeoutSeconds > 0`: aguarda até N segundos pela conclusão e, em seguida, retorna `{ runId, status: "ok", reply }`.
- Se a espera expirar: `{ runId, status: "timeout", error }`. A execução continua; chame `sessions_history` mais tarde.
- Se a execução falhar: `{ runId, status: "error", error }`.
- O anúncio de entrega ocorre após a conclusão da execução primária e é de melhor esforço; `status: "ok"` não garante que o anúncio foi entregue.
- Aguarda via `agent.wait` do gateway (lado do servidor) para que reconexões não derrubem a espera.
- O contexto da mensagem agente-para-agente é injetado para a execução primária.
- Após a conclusão da execução primária, o ZERO executa um **loop de resposta (reply-back loop)**:
  - Rounds 2+ alternam entre os agentes solicitante e alvo.
  - Responda exatamente `REPLY_SKIP` para parar o ping-pong.
  - O número máximo de turnos é `session.agentToAgent.maxPingPongTurns` (0–5, padrão 5).
- Assim que o loop termina, o ZERO executa a **etapa de anúncio agente-para-agente** (apenas agente alvo):
  - Responda exatamente `ANNOUNCE_SKIP` para permanecer em silêncio.
  - Qualquer outra resposta é enviada para o canal selecionado.
  - A etapa de anúncio inclui a solicitação original + resposta do round 1 + resposta mais recente do ping-pong.

## Campo de Canal (Channel Field)

- Para grupos, `channel` é o canal registrado na entrada da sessão.
- Para chats diretos, `channel` mapeia a partir de `lastChannel`.
- Para cron/hook/node, `channel` é `internal`.
- Se ausente, `channel` é `unknown`.

## Segurança / Política de Envio (Send Policy)

Bloqueio baseado em política por canal/tipo de chat (não por ID de sessão).

```json
{
  "session": {
    "sendPolicy": {
      "rules": [
        {
          "match": { "channel": "discord", "chatType": "group" },
          "action": "deny"
        }
      ],
      "default": "allow"
    }
  }
}
```

Sobrescrita em tempo de execução (por entrada de sessão):

- `sendPolicy: "allow" | "deny"` (não definido = herda a configuração).
- Configurável via `sessions.patch` ou `/send on|off|inherit` (apenas proprietário/owner, mensagem independente).

Pontos de aplicação (Enforcement points):

- `chat.send` / `agent` (gateway).
- lógica de entrega de resposta automática.

## sessions_spawn

Inicia a execução de um sub-agente em uma sessão isolada e anuncia o resultado de volta ao canal de chat solicitante.

Parâmetros:

- `task` (obrigatório).
- `label?`: (opcional; usado para logs/UI).
- `agentId?`: (opcional; inicia sob outro ID de agente, se permitido).
- `model?`: (opcional; sobrescreve o modelo do sub-agente; valores inválidos resultam em erro).
- `runTimeoutSeconds?`: (padrão 0; quando definido, aborta a execução do sub-agente após N segundos).
- `cleanup?`: (`delete|keep`, padrão `keep`).

Lista de Permissão (Allowlist):

- `agents.list[].subagents.allowAgents`: lista de IDs de agentes permitidos via `agentId` (`["*"]` para permitir qualquer um). Padrão: apenas o agente solicitante.

Descoberta:

- Use `agents_list` para descobrir quais IDs de agente são permitidos para `sessions_spawn`.

Comportamento:

- Inicia uma nova sessão `agent:<agentId>:subagent:<uuid>` com `deliver: false`.
- Os sub-agentes utilizam por padrão o conjunto completo de ferramentas **menos as ferramentas de sessão** (configurável via `tools.subagents.tools`).
- Os sub-agentes não têm permissão para chamar `sessions_spawn` (não há criação de sub-agente para sub-agente).
- Sempre não-bloqueante: retorna `{ status: "accepted", runId, childSessionKey }` imediatamente.
- Após a conclusão, o ZERO executa uma **etapa de anúncio** do sub-agente e publica o resultado no canal de chat solicitante.
- Responda exatamente `ANNOUNCE_SKIP` durante a etapa de anúncio para permanecer em silêncio.
- As respostas de anúncio são normalizadas para `Status`/`Resultado`/`Notas`; o `Status` vem do resultado do tempo de execução (não do texto do modelo).
- As sessões de sub-agente são auto-arquivadas após `agents.defaults.subagents.archiveAfterMinutes` (padrão: 60).
- As respostas de anúncio incluem uma linha de estatísticas (tempo de execução, tokens, chave/ID da sessão, caminho da transcrição e custo opcional).

## Visibilidade de Sessão em Sandbox (Sandbox Session Visibility)

Sessões em sandbox podem usar ferramentas de sessão, mas por padrão elas só veem as sessões que criaram via `sessions_spawn`.

Configuração:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        // padrão: "spawned"
        sessionToolsVisibility: "spawned" // ou "all"
      }
    }
  }
}
```

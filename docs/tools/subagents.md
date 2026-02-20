---
summary: "Subagentes: gerando execuções de agente isoladas que anunciam resultados de volta ao chat solicitante"
read_when:
  - Você quer trabalho em segundo plano/paralelo via agente
  - Você está alterando sessions_spawn ou política de ferramenta de subagente
---

# Subagentes

Subagentes são execuções de agente em segundo plano geradas a partir de uma execução de agente existente. Eles rodam em sua própria sessão (`agent:<agentId>:subagent:<uuid>`) e, quando terminam, **anunciam** seu resultado de volta ao canal de chat solicitante.

## Slash command

Use `/subagents` para inspecionar ou controlar execuções de subagente para a **sessão atual**:

- `/subagents list`
- `/subagents stop <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`

`/subagents info` mostra metadados da execução (status, timestammps, session id, caminho da transcrição, limpeza).

Objetivos principais:

- Paralelizar trabalho de “pesquisa / tarefa longa / ferramenta lenta” sem bloquear a execução principal.
- Manter subagentes isolados por padrão (separação de sessão + sandboxing opcional).
- Manter a superfície da ferramenta difícil de usar indevidamente: subagentes **não** obtêm ferramentas de sessão por padrão.
- Evitar fan-out aninhado: subagentes não podem gerar subagentes.

Nota de custo: cada subagente tem seu **próprio** contexto e uso de token. Para tarefas pesadas ou repetitivas,
defina um modelo mais barato para subagentes e mantenha seu agente principal em um modelo de maior qualidade.
Você pode configurar isso via `agents.defaults.subagents.model` ou substituições por agente.

## Ferramenta

Use `sessions_spawn`:

- Inicia uma execução de subagente (`deliver: false`, faixa global: `subagent`)
- Depois executa uma etapa de anúncio e posta a resposta de anúncio no canal de chat solicitante
- Modelo padrão: herda o chamador a menos que você defina `agents.defaults.subagents.model` (ou por agente `agents.list[].subagents.model`); um `sessions_spawn.model` explícito ainda vence.

Parâmetros da ferramenta:

- `task` (obrigatório)
- `label?` (opcional)
- `agentId?` (opcional; gera sob outro ID de agente se permitido)
- `model?` (opcional; substitui o modelo do subagente; valores inválidos são ignorados e o subagente roda no modelo padrão com um aviso no resultado da ferramenta)
- `thinking?` (opcional; substitui o nível de pensamento para a execução do subagente)
- `runTimeoutSeconds?` (padrão `0`; quando definido, a execução do subagente é abortada após N segundos)
- `cleanup?` (`delete|keep`, padrão `keep`)

Lista de permissão:

- `agents.list[].subagents.allowAgents`: lista de IDs de agente que podem ser alvejados via `agentId` (`["*"]` para permitir qualquer um). Padrão: apenas o agente solicitante.

Descoberta:

- Use `agents_list` para ver quais IDs de agente são permitidos atualmente para `sessions_spawn`.

Auto-arquivamento:

- Sessões de subagente são arquivadas automaticamente após `agents.defaults.subagents.archiveAfterMinutes` (padrão: 60).
- Arquivamento usa `sessions.delete` e renomeia a transcrição para `*.deleted.<timestamp>` (mesma pasta).
- `cleanup: "delete"` arquiva imediatamente após o anúncio (ainda mantém a transcrição via renomeação).
- Auto-arquivamento é de melhor esforço; temporizadores pendentes são perdidos se o gateway reiniciar.
- `runTimeoutSeconds` **não** auto-arquiva; ele apenas para a execução. A sessão permanece até o auto-arquivamento.

## Autenticação

A autenticação de subagente é resolvida por **ID de agente**, não por tipo de sessão:

- A chave de sessão do subagente é `agent:<agentId>:subagent:<uuid>`.
- O armazenamento de autenticação é carregado do `agentDir` daquele agente.
- Os perfis de autenticação do agente principal são mesclados como um **fallback**; perfis de agente substituem perfis principais em conflitos.

Nota: a mesclagem é aditiva, então perfis principais estão sempre disponíveis como fallbacks. Autenticação totalmente isolada por agente ainda não é suportada.

## Anúncio (Announce)

Subagentes reportam de volta via uma etapa de anúncio:

- A etapa de anúncio roda dentro da sessão do subagente (não da sessão solicitante).
- Se o subagente responder exatamente `ANNOUNCE_SKIP`, nada é postado.
- Caso contrário, a resposta de anúncio é postada no canal de chat solicitante via uma chamada de `agent` subsequente (`deliver=true`).
- Respostas de anúncio preservam roteamento de thread/tópico quando disponível (threads Slack, tópicos Telegram, threads Matrix).
- Mensagens de anúncio são normalizadas para um template estável:
  - `Status:` derivado do resultado da execução (`success`, `error`, `timeout`, ou `unknown`).
  - `Result:` o conteúdo resumido da etapa de anúncio (ou `(not available)` se ausente).
  - `Notes:` detalhes do erro e outro contexto útil.
- `Status` não é inferido da saída do modelo; ele vem de sinais de resultado em tempo de execução.

Cargas de anúncio incluem uma linha de estatísticas no final (mesmo quando embrulhadas):

- Runtime (ex: `runtime 5m12s`)
- Uso de token (entrada/saída/total)
- Custo estimado quando o preço do modelo está configurado (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId`, e caminho da transcrição (para que o agente principal possa buscar histórico via `sessions_history` ou inspecionar o arquivo em disco)

## Política de Ferramenta (ferramentas de subagente)

Por padrão, subagentes obtêm **todas as ferramentas exceto ferramentas de sessão**:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

Substitua via configuração:

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1
      }
    }
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      }
    }
  }
}
```

## Concorrência

Subagentes usam uma faixa de fila in-process dedicada:

- Nome da faixa: `subagent`
- Concorrência: `agents.defaults.subagents.maxConcurrent` (padrão `8`)

## Parando

- Enviar `/stop` no chat solicitante aborta a sessão solicitante e para quaisquer execuções ativas de subagente geradas a partir dela.

## Limitações

- Anúncio de subagente é **de melhor esforço**. Se o gateway reiniciar, trabalho de “anúncio de retorno” pendente é perdido.
- Subagentes ainda compartilham os mesmos recursos de processo gateway; trate `maxConcurrent` como uma válvula de segurança.
- `sessions_spawn` é sempre não-bloqueante: retorna `{ status: "accepted", runId, childSessionKey }` imediatamente.
- Contexto de subagente injeta apenas `AGENTS.md` + `TOOLS.md` (sem `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, ou `BOOTSTRAP.md`).

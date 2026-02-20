---
summary: "Tarefas Cron + despertares para o agendador do Gateway"
read_when:
  - Agendando trabalhos em segundo plano ou despertares
  - Criando automações que devem rodar com ou ao lado de heartbeats
  - Decidindo entre heartbeat e cron para tarefas agendadas
---
# Tarefas Cron (Agendador do Gateway)

> **Cron vs Heartbeat?** Veja [Cron vs Heartbeat](/automation/cron-vs-heartbeat) para orientação sobre quando usar cada um.

O Cron é o agendador embutido no Gateway. Ele persiste tarefas, acorda o agente no momento certo e pode, opcionalmente, entregar a saída de volta em um chat.

Se você quer *“rodar isso toda manhã”* ou *“cutucar o agente em 20 minutos”*, o cron é o mecanismo.

## TL;DR

- O Cron roda **dentro do Gateway** (não dentro do modelo).
- As tarefas persistem em `~/.zero/cron/` para que reinicializações não percam os agendamentos.
- Dois estilos de execução:
  - **Sessão principal**: enfileira um evento de sistema e então roda no próximo heartbeat.
  - **Isolada**: roda um turno de agente dedicado em `cron:<jobId>`, opcionalmente entregando a saída.
- Despertares são prioridade: uma tarefa pode solicitar “acordar agora” vs “próximo heartbeat”.

## Visão geral amigável para iniciantes

Pense em uma tarefa cron como: **quando** rodar + **o que** fazer.

1) **Escolha um agendamento**
   - Lembrete único → `schedule.kind = "at"` (CLI: `--at`)
   - Tarefa repetitiva → `schedule.kind = "every"` ou `schedule.kind = "cron"`
   - Se o seu carimbo de data/hora ISO omitir o fuso horário, ele será tratado como **UTC**.

2) **Escolha onde rodar**
   - `sessionTarget: "main"` → roda durante o próximo heartbeat com o contexto principal.
   - `sessionTarget: "isolated"` → roda um turno de agente dedicado em `cron:<jobId>`.

3) **Escolha o payload**
   - Sessão principal → `payload.kind = "systemEvent"`
   - Sessão isolada → `payload.kind = "agentTurn"`

Opcional: `deleteAfterRun: true` remove tarefas únicas bem-sucedidas do armazenamento.

## Conceitos

### Tarefas (Jobs)

Uma tarefa cron é um registro armazenado com:

- um **agendamento** (quando deve rodar),
- um **payload** (o que deve fazer),
- **entrega** opcional (para onde a saída deve ser enviada).
- **vínculo de agente** opcional (`agentId`): roda a tarefa sob um agente específico; se ausente ou desconhecido, o gateway usa o agente padrão.

Tarefas são identificadas por um `jobId` estável (usado pelas APIs do CLI/Gateway).
Nas chamadas de ferramentas de agente, o `jobId` é canônico; o `id` legado é aceito para compatibilidade.
Tarefas podem ser deletadas automaticamente após uma execução única bem-sucedida via `deleteAfterRun: true`.

### Agendamentos (Schedules)

O Cron suporta três tipos de agendamento:

- `at`: carimbo de data/hora único (ms desde a época). O Gateway aceita ISO 8601 e converte para UTC.
- `every`: intervalo fixo (ms).
- `cron`: expressão cron de 5 campos com fuso horário IANA opcional.

Expressões cron usam `croner`. Se um fuso horário for omitido, o fuso horário local do host do Gateway será usado.

### Execução Principal vs Isolada

#### Tarefas da sessão principal (eventos de sistema)

Tarefas principais enfileiram um evento de sistema e, opcionalmente, acordam o executor de heartbeat.
Devem usar `payload.kind = "systemEvent"`.

- `wakeMode: "next-heartbeat"` (padrão): o evento aguarda o próximo heartbeat agendado.
- `wakeMode: "now"`: o evento dispara uma execução imediata de heartbeat.

Este é o melhor ajuste quando você deseja o prompt de heartbeat normal + contexto da sessão principal.
Veja [Heartbeat](/gateway/heartbeat).

#### Tarefas isoladas (sessões cron dedicadas)

Tarefas isoladas rodam um turno de agente dedicado na sessão `cron:<jobId>`.

Comportamentos chave:

- O prompt é prefixado com `[cron:<jobId> <nome da tarefa>]` para rastreabilidade.
- Cada execução inicia um **novo id de sessão** (sem herança de conversas anteriores).
- Um resumo é postado na sessão principal (prefixo `Cron`, configurável).
- `wakeMode: "now"` dispara um heartbeat imediato após postar o resumo.
- Se `payload.deliver: true`, a saída é entregue em um canal; caso contrário, permanece interna.

Use tarefas isoladas para tarefas barulhentas, frequentes ou "tarefas de fundo" que não devem poluir seu histórico de chat principal.

### Formatos de payload (o que roda)

Dois tipos de payload são suportados:

- `systemEvent`: apenas sessão principal, roteado através do prompt de heartbeat.
- `agentTurn`: apenas sessão isolada, roda um turno dedicado do agente.

Campos comuns de `agentTurn`:

- `message`: prompt de texto obrigatório.
- `model` / `thinking`: substituições opcionais (veja abaixo).
- `timeoutSeconds`: substituição opcional de timeout.
- `deliver`: `true` para enviar a saída para um alvo de canal.
- `channel`: `last` ou um canal específico.
- `to`: alvo específico do canal (telefone/chat/id do canal).
- `bestEffortDeliver`: evita falhar a tarefa se a entrega falhar.

Opções de isolamento (apenas para `session=isolated`):

- `postToMainPrefix` (CLI: `--post-prefix`): prefixo para o evento de sistema na sessão principal.
- `postToMainMode`: `summary` (padrão) ou `full`.
- `postToMainMaxChars`: caracteres máximos quando `postToMainMode=full` (padrão 8000).

### Substituições de Modelo e Pensamento (Thinking)

Tarefas isoladas (`agentTurn`) podem substituir o modelo e o nível de pensamento:

- `model`: String do Provedor/modelo (ex: `anthropic/claude-sonnet-4-20250514`) ou alias (ex: `opus`)
- `thinking`: Nível de pensamento (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; apenas modelos GPT-5.2 + Codex)

Nota: Você também pode definir `model` em tarefas de sessão principal, mas isso altera o modelo compartilhado da sessão principal. Recomendamos substituições de modelo apenas para tarefas isoladas para evitar mudanças inesperadas de contexto.

Prioridade de resolução:

1. Substituição no payload da tarefa (mais alta)
2. Padrões específicos do hook (ex: `hooks.gmail.model`)
3. Padrão da configuração do agente

### Entrega (canal + alvo)

Tarefas isoladas podem entregar a saída para um canal. O payload da tarefa pode especificar:

- `channel`: `whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (plugin) / `signal` / `imessage` / `last`
- `to`: destinatário específico do canal

Se `channel` ou `to` for omitido, o cron pode usar como fallback a “última rota” da sessão principal (o último lugar onde o agente respondeu).

Notas de entrega:

- Se `to` for definido, o cron auto-entrega a saída final do agente mesmo se `deliver` for omitido.
- Use `deliver: true` quando quiser entrega na última rota sem um `to` explícito.
- Use `deliver: false` para manter a saída interna mesmo se um `to` estiver presente.

Lembretes de formato de alvo:

- Alvos Slack/Discord/Mattermost (plugin) devem usar prefixos explícitos (ex: `channel:<id>`, `user:<id>`) para evitar ambiguidade.
- Tópicos do Telegram devem usar o formato `:topic:` (veja abaixo).

#### Alvos de entrega do Telegram (tópicos / threads de fórum)

O Telegram suporta tópicos de fórum via `message_thread_id`. Para entrega via cron, você pode codificar o tópico/thread no campo `to`:

- `-1001234567890` (apenas id do chat)
- `-1001234567890:topic:123` (preferencial: marcador de tópico explícito)
- `-1001234567890:123` (atalho: sufixo numérico)

Alvos prefixados como `telegram:...` / `telegram:group:...` também são aceitos:

- `telegram:group:-1001234567890:topic:123`

## Armazenamento & histórico

- Repositório de tarefas: `~/.zero/cron/jobs.json` (JSON gerenciado pelo Gateway).
- Histórico de execução: `~/.zero/cron/runs/<jobId>.jsonl` (JSONL, auto-podado).
- Caminho de armazenamento alternativo: `cron.store` na configuração.

## Configuração

```json5
{
  cron: {
    enabled: true, // padrão true
    store: "~/.zero/cron/jobs.json",
    maxConcurrentRuns: 1 // padrão 1
  }
}
```

Desativar o cron inteiramente:

- `cron.enabled: false` (config)
- `ZERO_SKIP_CRON=1` (env)

## Início rápido via CLI

Lembrete único (ISO UTC, auto-deletar após sucesso):

```bash
zero cron add \
  --name "Enviar lembrete" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Lembrete: enviar relatório de despesas." \
  --wake now \
  --delete-after-run
```

Lembrete único (sessão principal, acordar imediatamente):

```bash
zero cron add \
  --name "Verificar calendário" \
  --at "20m" \
  --session main \
  --system-event "Próximo heartbeat: verificar calendário." \
  --wake now
```

Tarefa isolada recorrente (entregar no WhatsApp):

```bash
zero cron add \
  --name "Status matinal" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Resumir caixa de entrada + calendário para hoje." \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

Tarefa isolada recorrente (entregar em um tópico do Telegram):

```bash
zero cron add \
  --name "Resumo noturno (tópico)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Resumir o dia; enviar para o tópico noturno." \
  --deliver \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

Tarefa isolada com substituição de modelo e pensamento:

```bash
zero cron add \
  --name "Análise profunda" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Análise profunda semanal do progresso do projeto." \
  --model "opus" \
  --thinking high \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

Seleção de agente (configurações multi-agente):

```bash
# Vincular uma tarefa ao agente "ops" (usa o padrão se o agente estiver ausente)
zero cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Alterar ou limpar o agente de uma tarefa existente
zero cron edit <jobId> --agent ops
zero cron edit <jobId> --clear-agent
```

Execução manual (debug):

```bash
zero cron run <jobId> --force
```

Editar uma tarefa existente (campos de patch):

```bash
zero cron edit <jobId> \
  --message "Prompt atualizado" \
  --model "opus" \
  --thinking low
```

Histórico de execuções:

```bash
zero cron runs --id <jobId> --limit 50
```

Evento de sistema imediato sem criar uma tarefa:

```bash
zero system event --mode now --text "Próximo heartbeat: verificar bateria."
```

## Superfície da API do Gateway

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (forçado ou devido), `cron.runs`
Para eventos de sistema imediatos sem uma tarefa, use [`zero system event`](/cli/system).

## Resolução de Problemas

### “Nada roda”

- Verifique se o cron está habilitado: `cron.enabled` e `ZERO_SKIP_CRON`.
- Verifique se o Gateway está rodando continuamente (o cron roda dentro do processo do Gateway).
- Para agendamentos `cron`: confirme o fuso horário (`--tz`) vs o fuso horário do host.

### O Telegram entrega no lugar errado

- Para tópicos de fórum, use `-100…:topic:<id>` para que seja explícito e inequívoco.
- Se você vir prefixos `telegram:...` nos logs ou alvos de “última rota” armazenados, isso é normal; a entrega do cron os aceita e ainda analisa os IDs de tópicos corretamente.

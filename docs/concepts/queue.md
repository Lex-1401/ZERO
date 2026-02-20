---
summary: "Design da fila de comandos que serializa as execuções de resposta automática de entrada"
read_when:
  - Alterando a execução de resposta automática ou a concorrência
---
# Fila de Comandos (16-01-2026)

Serializamos as execuções de resposta automática de entrada (em todos os canais) por meio de uma pequena fila em processo para evitar a colisão de múltiplas execuções de agentes, permitindo ao mesmo tempo um paralelismo seguro entre as sessões.

## Por que

- As execuções de resposta automática podem ser dispendiosas (chamadas de LLM) e podem colidir quando múltiplas mensagens de entrada chegam próximas umas das outras.
- A serialização evita a competição por recursos compartilhados (arquivos de sessão, logs, stdin da CLI) e reduz a chance de limites de taxa (rate limits) nos provedores.

## Como funciona

- Uma fila FIFO ciente de "raias" (lanes) drena cada raia com um limite de concorrência configurável (padrão 1 para raias não configuradas; a principal (main) tem padrão 4, sub-agente tem 8).
- `runEmbeddedPiAgent` enfileira por **chave de sessão** (raia `session:<key>`) para garantir apenas uma execução ativa por sessão.
- Cada execução de sessão é então enfileirada em uma **raia global** (`main` por padrão), de modo que o paralelismo geral é limitado por `agents.defaults.maxConcurrent`.
- Quando o log detalhado (verbose) está habilitado, as execuções enfileiradas emitem um aviso curto se esperarem mais de ~2s antes de começar.
- Indicadores de digitação ainda são disparados imediatamente ao enfileirar (quando suportado pelo canal), para que a experiência do usuário não mude enquanto aguardamos a nossa vez.

## Modos de fila (por canal)

Mensagens de entrada podem direcionar (steer) a execução atual, aguardar por um turno de acompanhamento (followup), ou fazer ambos:

- `steer` (direcionar): injeta imediatamente na execução atual (cancela chamadas de ferramentas pendentes após o próximo limite de ferramenta). Se não estiver em streaming, recua para `followup`.
- `followup` (acompanhamento): enfileira para o próximo turno do agente após o término da execução atual.
- `collect` (coletar): agrupa todas as mensagens enfileiradas em um **único** turno de acompanhamento (padrão). Se as mensagens visarem canais/threads diferentes, elas são drenadas individualmente para preservar o roteamento.
- `steer-backlog` (ou `steer+backlog`): direciona agora **e** preserva a mensagem para um turno de acompanhamento.
- `interrupt` (interromper - legado): aborta a execução ativa para aquela sessão e, em seguida, executa a mensagem mais recente.
- `queue` (legado): o mesmo que `steer`.

O modo `steer-backlog` significa que você pode obter uma resposta de acompanhamento após a execução direcionada, portanto, interfaces de streaming podem parecer ter duplicatas. Prefira `collect`/`steer` se desejar uma resposta por mensagem de entrada.

Envie `/queue collect` como um comando independente (por sessão) ou defina `messages.queue.byChannel.discord: "collect"`.

Padrões (quando não definidos na configuração):

- Todas as superfícies → `collect`

Configure globalmente ou por canal via `messages.queue`:

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" }
    }
  }
}
```

## Opções de fila

As opções se aplicam a `followup`, `collect` e `steer-backlog` (e ao `steer` quando ele recua para `followup`):

- `debounceMs`: aguarda um período de silêncio antes de iniciar um turno de acompanhamento (evita o "continue, continue").
- `cap`: máximo de mensagens enfileiradas por sessão.
- `drop`: política de estouro (`old`, `new`, `summarize`).

O modo `summarize` (resumir) mantém uma pequena lista de tópicos das mensagens descartadas e a injeta como um prompt de acompanhamento sintético.
Padrões: `debounceMs: 1000`, `cap: 20`, `drop: summarize`.

## Sobrescritas por sessão

- Envie `/queue <modo>` como um comando independente para armazenar o modo para a sessão atual.
- As opções podem ser combinadas: `/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` ou `/queue reset` limpa a sobrescrita da sessão.

## Escopo e garantias

- Aplica-se às execuções de agentes de resposta automática em todos os canais de entrada que usam o pipeline de resposta do gateway (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- A raia padrão (`main`) é para todo o processo para batimentos cardíacos (heartbeats) de entrada + principais; defina `agents.defaults.maxConcurrent` para permitir múltiplas sessões em paralelo.
- Podem existir raias adicionais (ex: `cron`, `subagent`) para que tarefas de segundo plano possam rodar em paralelo sem bloquear as respostas de entrada.
- As raias por sessão garantem que apenas uma execução de agente toque em uma determinada sessão por vez.
- Sem dependências externas ou threads de trabalhadores em segundo plano; TypeScript puro + promises.

## Solução de problemas

- Se os comandos parecerem travados, habilite os logs detalhados (verbose) e procure por linhas como “queued for …ms” para confirmar que a fila está sendo drenada.
- Se precisar saber a profundidade da fila, habilite os logs detalhados e observe as linhas de tempo da fila.

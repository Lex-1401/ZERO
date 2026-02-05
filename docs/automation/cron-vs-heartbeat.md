---
summary: "Orientação para escolher entre heartbeat e tarefas cron para automação"
read_when:
  - Decidindo como agendar tarefas recorrentes
  - Configurando monitoramento ou notificações em segundo plano
  - Otimizando o uso de tokens para verificações periódicas
---
# Cron vs Heartbeat: Quando usar cada um

Tanto os heartbeats quanto as tarefas cron permitem que você execute tarefas em um agendamento. Este guia ajuda você a escolher o mecanismo certo para o seu caso de uso.

## Guia Rápido de Decisão

| Caso de Uso | Recomendado | Por que |
|-------------|-------------|---------|
| Verificar caixa de entrada a cada 30 min | Heartbeat | Agrupa com outras verificações, ciente do contexto |
| Enviar relatório diário às 9h em ponto | Cron (isolado) | Precisão de tempo necessária |
| Monitorar calendário para eventos futuros | Heartbeat | Ajuste natural para consciência periódica |
| Executar análise profunda semanal | Cron (isolado) | Tarefa independente, pode usar modelo diferente |
| Me lembre em 20 minutos | Cron (principal, `--at`) | Execução única com tempo preciso |
| Verificação de saúde de projeto em segundo plano | Heartbeat | Aproveita o ciclo existente |

## Heartbeat: Consciência Periódica

Os heartbeats rodam na **sessão principal** em um intervalo regular (padrão: 30 min). Eles são projetados para que o agente verifique as coisas e traga à tona qualquer coisa importante.

### Quando usar heartbeat

- **Múltiplas verificações periódicas**: Em vez de 5 tarefas cron separadas verificando caixa de entrada, calendário, clima, notificações e status do projeto, um único heartbeat pode agrupar tudo isso.
- **Decisões conscientes de contexto**: O agente tem o contexto completo da sessão principal, então ele pode tomar decisões inteligentes sobre o que é urgente vs. o que pode esperar.
- **Continuidade conversacional**: As execuções de heartbeat compartilham a mesma sessão, então o agente lembra de conversas recentes e pode fazer o acompanhamento naturalmente.
- **Monitoramento de baixo custo**: Um heartbeat substitui muitas pequenas tarefas de consulta (polling).

### Vantagens do Heartbeat

- **Agrupa múltiplas verificações**: Um único turno de agente pode revisar caixa de entrada, calendário e notificações juntos.
- **Reduz chamadas de API**: Um único heartbeat é mais barato do que 5 tarefas cron isoladas.
- **Ciente do contexto**: O agente sabe no que você tem trabalhado e pode priorizar de acordo.
- **Supressão inteligente**: Se nada precisar de atenção, o agente responde `HEARTBEAT_OK` e nenhuma mensagem é entregue.
- **Tempo natural**: Oscila ligeiramente com base na carga da fila, o que é aceitável para a maioria dos monitoramentos.

### Exemplo de Heartbeat: checklist HEARTBEAT.md

```md
# Checklist de Heartbeat

- Verifique o e-mail para mensagens urgentes
- Revise o calendário para eventos nas próximas 2 horas
- Se uma tarefa em segundo plano terminou, resuma os resultados
- Se estiver ocioso por mais de 8 horas, envie um breve oi
```

O agente lê isso em cada heartbeat e lida com todos os itens em um único turno.

### Configurando o heartbeat

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",        // intervalo
        target: "last",      // para onde entregar alertas
        activeHours: { start: "08:00", end: "22:00" }  // opcional
      }
    }
  }
}
```

Veja [Heartbeat](/gateway/heartbeat) para a configuração completa.

## Cron: Agendamento Preciso

As tarefas cron rodam em **horários exatos** e podem rodar em sessões isoladas sem afetar o contexto principal.

### Quando usar cron

- **Tempo exato exigido**: "Envie isso às 9:00 AM toda segunda-feira" (não "por volta das 9").
- **Tarefas independentes**: Tarefas que não precisam do contexto conversacional.
- **Modelo/pensamento diferente**: Análises pesadas que justificam um modelo mais poderoso.
- **Lembretes únicos**: "Me lembre em 20 minutos" com `--at`.
- **Tarefas barulhentas/frequentes**: Tarefas que poluiriam o histórico da sessão principal.
- **Gatilhos externos**: Tarefas que devem rodar independentemente de o agente estar ativo de outra forma.

### Vantagens do Cron

- **Tempo exato**: Expressões cron de 5 campos com suporte a fuso horário.
- **Isolamento de sessão**: Roda em `cron:<jobId>` sem poluir o histórico principal.
- **Substituições de modelo**: Use um modelo mais barato ou mais poderoso por tarefa.
- **Controle de entrega**: Pode entregar diretamente a um canal; ainda posta um resumo no principal por padrão (configurável).
- **Sem necessidade de contexto do agente**: Roda mesmo se a sessão principal estiver ociosa ou compactada.
- **Suporte a execução única**: `--at` para carimbos de data/hora futuros precisos.

### Exemplo de Cron: Briefing matinal diário

```bash
zero cron add \
  --name "Briefing matinal" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Gerar o briefing de hoje: clima, calendário, principais e-mails, resumo de notícias." \
  --model opus \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

Isso roda exatamente às 7:00 AM no horário de Nova York, usa o Opus para qualidade e entrega diretamente no WhatsApp.

### Exemplo de Cron: Lembrete único

```bash
zero cron add \
  --name "Lembrete de reunião" \
  --at "20m" \
  --session main \
  --system-event "Lembrete: reunião standup começa em 10 minutos." \
  --wake now \
  --delete-after-run
```

Veja [Tarefas Cron](/automation/cron-jobs) para referência completa da CLI.

## Fluxograma de Decisão

```text
A tarefa precisa rodar em um horário EXATO?
  SIM -> Use o cron
  NÃO -> Continue...

A tarefa precisa de isolamento da sessão principal?
  SIM -> Use o cron (isolado)
  NÃO -> Continue...

Esta tarefa pode ser agrupada com outras verificações periódicas?
  SIM -> Use o heartbeat (adicione ao HEARTBEAT.md)
  NÃO -> Use o cron

Este é um lembrete único?
  SIM -> Use o cron com --at
  NÃO -> Continue...

Precisa de um modelo ou nível de pensamento diferente?
  SIM -> Use o cron (isolado) com --model/--thinking
  NÃO -> Use o heartbeat
```

## Combinando Ambos

A configuração mais eficiente utiliza **ambos**:

1. **Heartbeat** lida com o monitoramento de rotina (caixa de entrada, calendário, notificações) em um único turno agrupado a cada 30 minutos.
2. **Cron** lida com agendamentos precisos (relatórios diários, revisões semanais) e lembretes únicos.

### Exemplo: Configuração de automação eficiente

**HEARTBEAT.md** (verificado a cada 30 min):

```md
# Checklist de Heartbeat
- Escanear caixa de entrada para e-mails urgentes
- Verificar calendário para eventos nas próximas 2h
- Revisar quaisquer tarefas pendentes
- Breve oi se estiver silencioso por mais de 8 horas
```

**Tarefas Cron** (tempo preciso):

```bash
# Briefing matinal diário às 7h
zero cron add --name "Briefing matinal" --cron "0 7 * * *" --session isolated --message "..." --deliver

# Revisão semanal de projeto às segundas às 9h
zero cron add --name "Revisão semanal" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# Lembrete único
zero cron add --name "Retornar ligação" --at "2h" --session main --system-event "Retornar ligação para o cliente" --wake now
```

## VOID: Fluxos de trabalho determinísticos com aprovações

VOID é o runtime de fluxo de trabalho para **pipelines de ferramentas de várias etapas** que precisam de execução determinística e aprovações explícitas.
Use-o quando a tarefa for mais do que um único turno de agente e você quiser um fluxo de trabalho retomável com pontos de controle humanos.

### Quando o VOID se encaixa

- **Automação de várias etapas**: Você precisa de um pipeline fixo de chamadas de ferramentas, não apenas um prompt único.
- **Portões de aprovação**: Efeitos colaterais devem pausar até que você aprove e então retomar.
- **Execuções retomáveis**: Continue um fluxo de trabalho pausado sem reexecutar etapas anteriores.

### Como ele se emparelha com heartbeat e cron

- **Heartbeat/cron** decidem *quando* uma execução acontece.
- **VOID** define *quais etapas* acontecem assim que a execução inicia.

Para fluxos de trabalho agendados, use o cron ou heartbeat para disparar um turno de agente que chama o VOID.
Para fluxos de trabalho ad-hoc, chame o VOID diretamente.

### Notas operacionais (do código)

- O VOID roda como um **subprocesso local** (CLI `void`) no modo ferramenta e retorna um **envelope JSON**.
- Se a ferramenta retornar `needs_approval`, você retoma com um `resumeToken` e a flag `approve`.
- A ferramenta é um **plugin opcional**; você deve permitir o `void` em `tools.allow`.
- Se você passar `voidPath`, ele deve ser um **caminho absoluto**.

Veja [VOID](/tools/void) para uso completo e exemplos.

## Sessão Principal vs Sessão Isolada

Tanto o heartbeat quanto o cron podem interagir com a sessão principal, mas de formas diferentes:

| | Heartbeat | Cron (principal) | Cron (isolado) |
|---|---|---|---|
| Sessão | Principal | Principal (via evento de sistema) | `cron:<jobId>` |
| Histórico | Compartilhado | Compartilhado | Novo em cada execução |
| Contexto | Completo | Completo | Nenhum (começa limpo) |
| Modelo | Modelo da sessão principal | Modelo da sessão principal | Pode substituir |
| Saída | Entregue se não for `HEARTBEAT_OK` | Prompt de Heartbeat + evento | Resumo postado no principal |

### Quando usar cron na sessão principal

Use `--session main` com `--system-event` quando você quiser:

- Que o lembrete/evento apareça no contexto da sessão principal
- Que o agente lide com isso durante o próximo heartbeat com contexto completo
- Nenhuma execução isolada separada

```bash
zero cron add \
  --name "Verificar projeto" \
  --every "4h" \
  --session main \
  --system-event "Hora de uma verificação de saúde do projeto" \
  --wake now
```

### Quando usar cron isolado

Use `--session isolated` quando você quiser:

- Um começo limpo sem contexto anterior
- Configurações de modelo ou pensamento diferentes
- Saída entregue diretamente a um canal (o resumo ainda é postado no principal por padrão)
- Histórico que não polui a sessão principal

```bash
zero cron add \
  --name "Análise profunda" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Análise semanal da base de código..." \
  --model opus \
  --thinking high \
  --deliver
```

## Considerações de Custo

| Mecanismo | Perfil de Custo |
|-----------|-----------------|
| Heartbeat | Um turno a cada N minutos; escala com o tamanho do HEARTBEAT.md |
| Cron (principal) | Adiciona evento ao próximo heartbeat (sem turno isolado) |
| Cron (isolado) | Turno de agente completo por tarefa; pode usar modelo mais barato |

**Dicas**:

- Mantenha o `HEARTBEAT.md` pequeno para minimizar o custo de tokens.
- Agrupe verificações semelhantes no heartbeat em vez de múltiplas tarefas cron.
- Use `target: "none"` no heartbeat se desejar apenas processamento interno.
- Use cron isolado com um modelo mais barato para tarefas de rotina.

## Relacionado

- [Heartbeat](/gateway/heartbeat) - configuração completa do heartbeat
- [Tarefas Cron](/automation/cron-jobs) - referência completa de API e CLI do cron
- [Sistema](/cli/system) - eventos de sistema + controles de heartbeat

---
summary: "Mensagens de sondagem do Heartbeat e regras de notificação"
read_when:
  - Ajustando a cadência ou as mensagens do heartbeat
  - Decidindo entre heartbeat e cron para tarefas agendadas
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron?** Veja [Cron vs Heartbeat](/automation/cron-vs-heartbeat) para orientações sobre quando usar cada um.

O Heartbeat executa **turnos periódicos do agente** na sessão principal para que o modelo possa trazer à tona qualquer coisa que precise de atenção sem inundá-lo com mensagens.

## Início rápido (iniciante)

1. Deixe os heartbeats habilitados (o padrão é `30m`, ou `1h` para Anthropic OAuth/setup-token) ou defina sua própria cadência.
2. Crie um pequeno checklist `HEARTBEAT.md` no espaço de trabalho do agente (opcional, mas recomendado).
3. Decida para onde as mensagens do heartbeat devem ir (`target: "last"` é o padrão).
4. Opcional: habilite a entrega do raciocínio (reasoning) do heartbeat para transparência.
5. Opcional: restrinja os heartbeats às horas ativas (horário local).

Exemplo de configuração:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // opcional: envia também uma mensagem separada "Reasoning:"
      }
    }
  }
}
```

## Padrões

- Intervalo: `30m` (ou `1h` quando o modo de autenticação detectado for Anthropic OAuth/setup-token). Defina `agents.defaults.heartbeat.every` ou `agents.list[].heartbeat.every` por agente; use `0m` para desativar.
- Corpo do prompt (configurável via `agents.defaults.heartbeat.prompt`):
  `Leia HEARTBEAT.md se ele existir (contexto do espaço de trabalho). Siga-o rigorosamente. Não infira ou repita tarefas antigas de chats anteriores. Se nada precisar de atenção, responda HEARTBEAT_OK.`
- O prompt do heartbeat é enviado **literalmente** como a mensagem do usuário. O prompt do sistema inclui uma seção "Heartbeat" e a execução é sinalizada internamente.
- As horas ativas (`heartbeat.activeHours`) são verificadas no fuso horário configurado. Fora da janela, os heartbeats são pulados até o próximo tique dentro da janela.

## Para que serve o prompt do heartbeat

O prompt padrão é intencionalmente amplo:

- **Tarefas em segundo plano**: "Considere tarefas pendentes" incentiva o agente a revisar acompanhamentos (inbox, calendário, lembretes, trabalho na fila) e trazer à tona qualquer coisa urgente.
- **Check-in humano**: "Verifique ocasionalmente seu humano durante o dia" incentiva uma mensagem leve ocasional do tipo "precisa de algo?", mas evita spam noturno usando seu fuso horário local configurado (veja [/concepts/timezone](/concepts/timezone)).

Se você quiser que um heartbeat faça algo muito específico (ex: "verificar estatísticas do Gmail PubSub" ou "verificar a saúde do gateway"), defina `agents.defaults.heartbeat.prompt` (ou `agents.list[].heartbeat.prompt`) com um corpo personalizado (enviado literalmente).

## Contrato de resposta

- Se nada precisar de atenção, responda com **`HEARTBEAT_OK`**.
- Durante as execuções do heartbeat, o ZERO trata `HEARTBEAT_OK` como um reconhecimento (ack) quando ele aparece no **início ou no fim** da resposta. O token é removido e a resposta é descartada se o conteúdo restante for **≤ `ackMaxChars`** (padrão: 300).
- Se `HEARTBEAT_OK` aparecer no **meio** de uma resposta, ele não é tratado de forma especial.
- Para alertas, **não** inclua `HEARTBEAT_OK`; retorne apenas o texto do alerta.

Fora dos heartbeats, um `HEARTBEAT_OK` avulso no início/fim de uma mensagem é removido e registrado em log; uma mensagem que seja apenas `HEARTBEAT_OK` é descartada.

## Configuração

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",           // padrão: 30m (0m desativa)
        model: "anthropic/claude-opus-4-5",
        includeReasoning: false, // padrão: false (entrega mensagem Reasoning: separada quando disponível)
        target: "last",         // last | none | <id do canal> (core ou plugin, ex: "bluebubbles")
        to: "+15551234567",     // sobrescrita opcional específica por canal
        prompt: "Leia HEARTBEAT.md se ele existir (contexto do espaço de trabalho). Siga-o rigorosamente. Não infira ou repita tarefas antigas de chats anteriores. Se nada precisar de atenção, responda HEARTBEAT_OK.",
        ackMaxChars: 300         // máximo de caracteres permitidos após HEARTBEAT_OK
      }
    }
  }
}
```

### Escopo e precedência

- `agents.defaults.heartbeat` define o comportamento global do heartbeat.
- `agents.list[].heartbeat` mescla por cima; se qualquer agente tiver um bloco `heartbeat`, **apenas esses agentes** executarão heartbeats.
- `channels.defaults.heartbeat` define os padrões de visibilidade para todos os canais.
- `channels.<canal>.heartbeat` sobrescreve os padrões do canal.
- `channels.<canal>.accounts.<id>.heartbeat` (canais de múltiplas contas) sobrescreve as configurações por canal.

### Heartbeats por agente

Se qualquer entrada em `agents.list[]` incluir um bloco `heartbeat`, **apenas esses agentes** executarão heartbeats. O bloco por agente é mesclado sobre `agents.defaults.heartbeat` (para que você possa definir padrões compartilhados uma vez e sobrescrever por agente).

Exemplo: dois agentes, apenas o segundo agente executa heartbeats.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last"
      }
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          prompt: "Leia HEARTBEAT.md se ele existir (contexto do espaço de trabalho). Siga-o rigorosamente. Não infira ou repita tarefas antigas de chats anteriores. Se nada precisar de atenção, responda HEARTBEAT_OK."
        }
      }
    ]
  }
}
```

### Notas de campo

- `every`: intervalo do heartbeat (string de duração; unidade padrão = minutos).
- `model`: sobrescrita opcional de modelo para execuções de heartbeat (`provedor/modelo`).
- `includeReasoning`: quando habilitado, também entrega a mensagem separada `Reasoning:` quando disponível (mesmo formato que `/reasoning on`).
- `session`: chave de sessão opcional para execuções de heartbeat.
  - `main` (padrão): sessão principal do agente.
  - Chave de sessão explícita (copie de `zero sessions --json` ou da [CLI de sessões](/cli/sessions)).
  - Formatos de chave de sessão: veja [Sessões](/concepts/session) e [Grupos](/concepts/groups).
- `target`:
  - `last` (padrão): entrega para o último canal externo usado.
  - canal explícito: `whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`.
  - `none`: executa o heartbeat, mas **não o entrega** externamente.
- `to`: sobrescrita opcional do destinatário (id específico do canal, ex: E.164 para WhatsApp ou um ID de chat do Telegram).
- `prompt`: sobrescreve o corpo do prompt padrão (não mesclado).
- `ackMaxChars`: máximo de caracteres permitidos após `HEARTBEAT_OK` antes da entrega.

## Comportamento de entrega

- O heartbeat é executado na sessão principal do agente por padrão (`agent:<id>:<mainKey>`), ou em `global` quando `session.scope = "global"`. Defina `session` para sobrescrever para uma sessão de canal específica (Discord/WhatsApp/etc.).
- `session` afeta apenas o contexto da execução; a entrega é controlada por `target` e `to`.
- Para entregar em um canal/destinatário específico, defina `target` + `to`. Com `target: "last"`, a entrega usa o último canal externo para essa sessão.
- Se a fila principal estiver ocupada, o heartbeat é pulado e tentado novamente mais tarde.
- Se `target` for resolvido para nenhum destino externo, a execução ainda ocorre, mas nenhuma mensagem de saída é enviada.
- Respostas apenas de heartbeat **não** mantêm a sessão ativa; o último `updatedAt` é restaurado para que a expiração por inatividade se comporte normalmente.

## Controles de visibilidade

Por padrão, os reconhecimentos `HEARTBEAT_OK` são suprimidos enquanto o conteúdo do alerta é entregue. Você pode ajustar isso por canal ou por conta:

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false      # Ocultar HEARTBEAT_OK (padrão)
      showAlerts: true   # Mostrar mensagens de alerta (padrão)
      useIndicator: true # Emitir eventos de indicador (padrão)
  telegram:
    heartbeat:
      showOk: true       # Mostrar reconhecimentos OK no Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suprimir a entrega de alertas para esta conta
```

Precedência: por conta → por canal → padrões do canal → padrões integrados.

### O que cada flag faz

- `showOk`: envia um reconhecimento `HEARTBEAT_OK` quando o modelo retorna uma resposta apenas de OK.
- `showAlerts`: envia o conteúdo do alerta quando o modelo retorna uma resposta que não seja apenas OK.
- `useIndicator`: emite eventos de indicador para superfícies de status da UI.

Se **todas as três** forem falsas, o ZERO ignora completamente a execução do heartbeat (sem chamada ao modelo).

### Exemplos de por canal vs por conta

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # todas as contas do Slack
    accounts:
      ops:
        heartbeat:
          showAlerts: false # suprime alertas apenas para a conta ops
  telegram:
    heartbeat:
      showOk: true
```

### Padrões comuns

| Objetivo | Configuração |
| --- | --- |
| Comportamento padrão (OKs silenciosos, alertas ligados) | *(nenhuma configuração necessária)* |
| Totalmente silencioso (sem mensagens, sem indicador) | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Apenas indicador (sem mensagens) | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }` |
| OKs em apenas um canal | `channels.telegram.heartbeat: { showOk: true }` |

## HEARTBEAT.md (opcional)

Se um arquivo `HEARTBEAT.md` existir no espaço de trabalho, o prompt padrão diz ao agente para lê-lo. Pense nisso como seu "checklist do heartbeat": pequeno, estável e seguro para ser incluído a cada 30 minutos.

Se o `HEARTBEAT.md` existir, mas estiver efetivamente vazio (apenas linhas em branco e cabeçalhos markdown como `# Cabeçalho`), o ZERO pula a execução do heartbeat para economizar chamadas de API. Se o arquivo estiver ausente, o heartbeat ainda roda e o modelo decide o que fazer.

Mantenha-o minúsculo (checklist curto ou lembretes) para evitar o inchaço do prompt.

Exemplo de `HEARTBEAT.md`:

```md
# Checklist do Heartbeat

- Verificação rápida: algo urgente nas caixas de entrada?
- Se for dia, faça um check-in leve se nada mais estiver pendente.
- Se uma tarefa estiver bloqueada, anote *o que está faltando* e pergunte ao Peter na próxima vez.
```

### O agente pode atualizar o HEARTBEAT.md?

Sim — se você pedir.

O `HEARTBEAT.md` é apenas um arquivo normal no espaço de trabalho do agente, então você pode dizer ao agente (em um chat normal) algo como:

- "Atualize o `HEARTBEAT.md` para adicionar uma verificação diária do calendário."
- "Reescreva o `HEARTBEAT.md` para que ele fique mais curto e focado em acompanhamentos de inbox."

Se você quiser que isso aconteça proativamente, também pode incluir uma linha explícita no seu prompt de heartbeat como: "Se o checklist tornar-se obsoleto, atualize o HEARTBEAT.md por um melhor."

Nota de segurança: não coloque segredos (chaves de API, números de telefone, tokens privados) no `HEARTBEAT.md` — ele torna-se parte do contexto do prompt.

## Acordar manual (sob demanda)

Você pode enfileirar um evento do sistema e disparar um heartbeat imediato com:

```bash
zero system event --text "Verificar acompanhamentos urgentes" --mode now
```

Se múltiplos agentes tiverem o `heartbeat` configurado, um despertar manual executa cada um desses heartbeats dos agentes imediatamente.

Use `--mode next-heartbeat` para esperar pelo próximo tique agendado.

## Entrega de raciocínio (opcional)

Por padrão, os heartbeats entregam apenas o payload da "resposta" final.

Se você deseja transparência, habilite:

- `agents.defaults.heartbeat.includeReasoning: true`

Quando habilitado, os heartbeats também entregarão uma mensagem separada prefixada por `Reasoning:` (mesmo formato que `/reasoning on`). Isso pode ser útil quando o agente está gerenciando múltiplas sessões/codexes e você deseja ver por que ele decidiu chamá-lo — mas também pode vazar mais detalhes internos do que você deseja. Prefira mantê-lo desativado em chats de grupo.

## Consciência de custo

Heartbeats executam turnos completos do agente. Intervalos curtos consomem mais tokens. Mantenha o `HEARTBEAT.md` pequeno e considere um `model` mais barato ou `target: "none"` se você quiser apenas atualizações de estado internas.

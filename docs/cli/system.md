---
summary: "Referência CLI para `zero system` (eventos de sistema, heartbeat, presença)"
read_when:
  - Você quer enfileirar um evento de sistema sem criar um cron job
  - Você precisa ativar ou desativar heartbeats
  - Você quer inspecionar entradas de presença do sistema
---

# `zero system`

Auxiliares nível-sistema para o Gateway: enfileirar eventos de sistema, controlar heartbeats, e ver presença.

## Comandos comuns

```bash
zero system event --text "Check for urgent follow-ups" --mode now
zero system heartbeat enable
zero system heartbeat last
zero system presence
```

## `system event`

Enfileire um evento de sistema na sessão **principal**. O próximo heartbeat vai injetá-lo
como uma linha `System:` no prompt. Use `--mode now` para acionar o heartbeat
imediatamente; `next-heartbeat` espera pelo próximo tick agendado.

Flags:

- `--text <texto>`: texto do evento de sistema obrigatório.
- `--mode <modo>`: `now` ou `next-heartbeat` (padrão).
- `--json`: saída legível por máquina.

## `system heartbeat last|enable|disable`

Controles de Heartbeat:

- `last`: mostrar o último evento de heartbeat.
- `enable`: ativar heartbeats novamente (use isso se foram desativados).
- `disable`: pausar heartbeats.

Flags:

- `--json`: saída legível por máquina.

## `system presence`

Liste as entradas atuais de presença do sistema que o Gateway conhece (nós,
instâncias e linhas de status similares).

Flags:

- `--json`: saída legível por máquina.

## Notas

- Requer um Gateway rodando alcançável pela sua config atual (local ou remoto).
- Eventos de sistema são efêmeros e não persistidos através de reinicializações.

---
summary: "Reforçar o tratamento de entrada de cron.add, alinhar esquemas e melhorar a UI de cron / ferramentas de agentes"
owner: "zero"
status: "complete"
last_updated: "2026-01-05"
---

# Reforço do Cron Add & Alinhamento de Esquema

## Contexto

Logs recentes do gateway mostram falhas repetidas em `cron.add` com parâmetros inválidos (ausência de `sessionTarget`, `wakeMode`, `payload` e `schedule` malformado). Isso indica que pelo menos um cliente (provavelmente o caminho de chamada de ferramenta do agente) está enviando payloads de tarefas envolvidos (wrapped) ou parcialmente especificados. Separadamente, há uma divergência entre as enums de provedores cron no TypeScript, esquema do gateway, flags da CLI e tipos de formulário da UI, além de uma incompatibilidade na UI para `cron.status` (espera `jobCount` enquanto o gateway retorna `jobs`).

## Objetivos

- Parar o spam de INVALID_REQUEST em `cron.add` normalizando payloads comuns e inferindo campos `kind` ausentes.
- Alinhar as listas de provedores cron entre o esquema do gateway, tipos cron, docs da CLI e formulários da UI.
- Tornar o esquema da ferramenta cron do agente explícito para que o LLM produza payloads de tarefas corretos.
- Corrigir a exibição da contagem de tarefas no status do cron na UI de Controle.
- Adicionar testes para cobrir a normalização e o comportamento da ferramenta.

## Não-objetivos

- Alterar a semântica de agendamento do cron ou o comportamento de execução das tarefas.
- Adicionar novos tipos de agendamento ou análise de expressões cron.
- Reformular a UI/UX do cron além das correções de campo necessárias.

## Descobertas (lacunas atuais)

- `CronPayloadSchema` no gateway exclui `signal` + `imessage`, enquanto os tipos TS os incluem.
- O CronStatus da UI de Controle espera `jobCount`, mas o gateway retorna `jobs`.
- O esquema da ferramenta cron do agente permite objetos `job` arbitrários, possibilitando entradas malformadas.
- O gateway valida estritamente `cron.add` sem normalização, então payloads envolvidos (wrapped) falham.

## O que mudou

- `cron.add` e `cron.update` agora normalizam formatos comuns e inferem campos `kind` ausentes.
- O esquema da ferramenta cron do agente coincide com o esquema do gateway, o que reduz payloads inválidos.
- Enums de provedores estão alinhadas entre gateway, CLI, UI e seletor do macOS.
- UI de Controle usa o campo de contagem `jobs` do gateway para o status.

## Comportamento atual

- **Normalização:** payloads `data`/`job` envolvidos são desenrolados; `schedule.kind` e `payload.kind` são inferidos quando seguro.
- **Padrões:** padrões seguros são aplicados para `wakeMode` e `sessionTarget` quando ausentes.
- **Provedores:** Discord/Slack/Signal/iMessage agora aparecem consistentemente na CLI/UI.

Veja [Tarefas Cron](/automation/cron-jobs) para o formato normalizado e exemplos.

## Verificação

- Monitorar os logs do gateway para redução de erros INVALID_REQUEST em `cron.add`.
- Confirmar se o status do cron na UI de Controle mostra a contagem de tarefas após a atualização.

## Acompanhamentos opcionais

- Teste manual na UI de Controle: adicionar uma tarefa cron por provedor + verificar a contagem de tarefas no status.

## Questões em aberto

- O `cron.add` deve aceitar `state` explícito dos clientes (atualmente proibido pelo esquema)?
- Devemos permitir `webchat` como um provedor de entrega explícito (atualmente filtrado na resolução de entrega)?

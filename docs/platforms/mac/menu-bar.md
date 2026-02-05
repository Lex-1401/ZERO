---
summary: "Lógica de status da barra de menus e o que é exibido aos usuários"
read_when:
  - Ajustando a interface do menu do mac ou a lógica de status
---
# Lógica de Status da Barra de Menus

## O que é exibido

- Exibimos o estado atual de trabalho do agente no ícone da barra de menus e na primeira linha de status do menu.
- O status de saúde (health) fica oculto enquanto o trabalho está ativo; ele retorna quando todas as sessões estão ociosas (idle).
- O bloco “Nodes” no menu lista apenas **dispositivos** (nós emparelhados via `node.list`), não entradas de cliente/presença.
- Uma seção “Uso” (Usage) aparece em Contexto quando instantâneos de uso do provedor estão disponíveis.

## Modelo de estado

- Sessões: os eventos chegam com `runId` (por execução) mais `sessionKey` no payload. A sessão “principal” é a chave `main`; se ausente, recorremos à sessão atualizada mais recentemente.
- Prioridade: a principal (main) sempre vence. Se a principal estiver ativa, seu estado é mostrado imediatamente. Se a principal estiver ociosa, a sessão não-principal ativa mais recentemente é mostrada. Não alternamos no meio da atividade; só mudamos quando a sessão atual fica ociosa ou a principal se torna ativa.
- Tipos de atividade:
  - `job`: execução de comando de alto nível (`state: started|streaming|done|error`).
  - `tool`: `phase: start|result` com `toolName` e `meta/args`.

## Enum IconState (Swift)

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)` (substituição de depuração)

### ActivityKind → glifo

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- padrão → 🛠️

### Mapeamento visual

- `idle`: criatura normal.
- `workingMain`: selo com glifo, tonalidade total, animação de perna “trabalhando”.
- `workingOther`: selo com glifo, tonalidade suave, sem correria.
- `overridden`: usa o glifo/tonalidade escolhido, independentemente da atividade.

## Texto da linha de status (menu)

- Enquanto o trabalho está ativo: `<Papel da sessão> · <rótulo da atividade>`
  - Exemplos: `Principal · exec: pnpm test`, `Outra · read: apps/macos/Sources/ZERO/AppState.swift`.
- Quando ocioso: volta para o resumo de saúde (health).

## Ingestão de eventos

- Fonte: eventos de `agent` do canal de controle (`ControlChannel.handleAgentEvent`).
- Campos analisados:
  - `stream: "job"` com `data.state` para início/parada.
  - `stream: "tool"` com `data.phase`, `name`, opcional `meta`/`args`.
- Rótulos:
  - `exec`: primeira linha de `args.command`.
  - `read`/`write`: caminho encurtado.
  - `edit`: caminho mais o tipo de alteração inferido dos contadores de `meta`/diff.
  - fallback: nome da ferramenta.

## Substituição de depuração (Debug override)

- Configurações ▸ Depuração ▸ Seletor “Substituição de ícone”:
  - `Sistema (auto)` (padrão)
  - `Trabalhando: principal` (por tipo de ferramenta)
  - `Trabalhando: outra` (por tipo de ferramenta)
  - `Ocioso`
- Armazenado via `@AppStorage("iconOverride")`; mapeado para `IconState.overridden`.

## Checklist de teste

- Disparar tarefa na sessão principal: verificar se o ícone muda imediatamente e se a linha de status mostra o rótulo principal.
- Disparar tarefa em sessão não-principal enquanto a principal está ociosa: ícone/status mostra a não-principal; permanece estável até terminar.
- Iniciar a principal enquanto outra está ativa: o ícone muda para a principal instantaneamente.
- Rajadas rápidas de ferramentas: garantir que o selo não pisque (tolerância de TTL nos resultados das ferramentas).
- A linha de saúde reaparece assim que todas as sessões ficam ociosas.

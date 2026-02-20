---
summary: "Estados e animações do ícone da barra de menus para o ZERO no macOS"
read_when:
  - Alterando o comportamento do ícone da barra de menus
---
# Estados do Ícone da Barra de Menus

Autor: steipete · Atualizado: 06-12-2025 · Escopo: app macOS (`apps/macos`)

- **Idle (Ocioso):** Animação normal do ícone (piscar, balanço ocasional).
- **Paused (Pausado):** O item de status usa `appearsDisabled`; sem movimento.
- **Voice trigger (big ears):** O detector de ativação por voz chama `AppState.triggerVoiceEars(ttl: nil)` quando a palavra de ativação é ouvida, mantendo `earBoostActive=true` enquanto a fala é capturada. As orelhas aumentam de escala (1.9x), ganham furos circulares para legibilidade, e depois diminuem via `stopVoiceEars()` após 1s de silêncio. Disparado apenas a partir do pipeline de voz interno do app.
- **Working (agente em execução):** `AppState.isWorking=true` aciona um micro-movimento de “correria de cauda/perna”: balanço de perna mais rápido e um leve deslocamento enquanto o trabalho está em andamento. Atualmente alternado durante as execuções do agente no WebChat; adicione a mesma alternância em outras tarefas longas ao conectá-las.

Pontos de conexão

- Ativação por voz: o runtime/tester chama `AppState.triggerVoiceEars(ttl: nil)` no disparo e `stopVoiceEars()` após 1s de silêncio para coincidir com a janela de captura.
- Atividade do agente: defina `AppStateStore.shared.setWorking(true/false)` ao redor dos intervalos de trabalho (já feito na chamada do agente WebChat). Mantenha os intervalos curtos e resete em blocos `defer` para evitar animações travadas.

Formas e tamanhos

- Ícone base desenhado em `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`.
- A escala da orelha padrão é `1.0`; o boost de voz define `earScale=1.9` e alterna `earHoles=true` sem mudar o quadro geral (imagem de template de 18×18 pt renderizada em um armazenamento de backup Retina de 36×36 px).
- A "correria" usa o balanço de perna até ~1.0 com um pequeno tremor horizontal; é aditivo a qualquer balanço ocioso existente.

Notas comportamentais

- Sem alternância via CLI externa/broker para orelhas/trabalho; mantenha isso interno aos sinais do próprio app para evitar oscilações acidentais.
- Mantenha os TTLs curtos (&lt;10s) para que o ícone retorne ao estado base rapidamente se uma tarefa travar.

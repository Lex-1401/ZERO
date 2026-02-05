---
summary: "Ciclo de vida da sobreposição de voz (voice overlay) quando a palavra de ativação e o push-to-talk se sobrepõem"
read_when:
  - Ajustando o comportamento da sobreposição de voz
---
# Ciclo de Vida da Sobreposição de Voz (macOS)

Público: colaboradores do app macOS. Objetivo: manter a sobreposição de voz (voice overlay) previsível quando a palavra de ativação (wake-word) e o push-to-talk se sobrepõem.

### Intenção atual

- Se a sobreposição já estiver visível a partir da palavra de ativação e o usuário pressionar a tecla de atalho, a sessão da tecla de atalho *adota* o texto existente em vez de resetá-lo. A sobreposição permanece ativa enquanto a tecla de atalho for mantida. Quando o usuário soltar: envia se houver texto limpo (trimmed), caso contrário, descarta.
- A palavra de ativação sozinha ainda envia automaticamente após o silêncio; o push-to-talk envia imediatamente ao ser solto.

### Implementado (09 de dezembro de 2025)

- As sessões de sobreposição agora carregam um token por captura (wake-word ou push-to-talk). Atualizações parciais/finais/envio/descarte/nível são ignoradas quando o token não corresponde, evitando callbacks obsoletos.
- O push-to-talk adota qualquer texto de sobreposição visível como prefixo (assim, pressionar a tecla de atalho enquanto a sobreposição de ativação está ativa mantém o texto e concatena a nova fala). Ele aguarda até 1.5s por uma transcrição final antes de usar o texto atual como fallback.
- Logs de Chime/sobreposição são emitidos em `info` nas categorias `voicewake.overlay`, `voicewake.ptt` e `voicewake.chime` (início da sessão, parcial, final, envio, descarte, motivo do chime).

### Próximos passos

1. **VoiceSessionCoordinator (ator)**
   - Possui exatamente uma `VoiceSession` por vez.
   - API (baseada em token): `beginWakeCapture`, `beginPushToTalk`, `updatePartial`, `endCapture`, `cancel`, `applyCooldown`.
   - Descarta callbacks que carregam tokens obsoletos (impede que reconhecedores antigos reabram a sobreposição).
2. **VoiceSession (modelo)**
   - Campos: `token`, `source` (wakeWord|pushToTalk), texto comprometido/volátil, sinalizadores de chime, timers (envio automático, ocioso), `overlayMode` (exibição|edição|envio), prazo de cooldown.
3. **Binding da sobreposição**
   - `VoiceSessionPublisher` (`ObservableObject`) espelha a sessão ativa no SwiftUI.
   - `VoiceWakeOverlayView` renderiza apenas através do publisher; nunca altera singletons globais diretamente.
   - Ações do usuário na sobreposição (`sendNow`, `dismiss`, `edit`) chamam o coordinator com o token da sessão.
4. **Caminho de envio unificado**
   - Em `endCapture`: se o texto limpo estiver vazio → descarta; senão `performSend(session:)` (toca o chime de envio uma vez, encaminha, descarta).
   - Push-to-talk: sem atraso; wake-word: atraso opcional para envio automático.
   - Aplica um curto cooldown ao runtime de ativação após a conclusão do push-to-talk para que a palavra de ativação não dispare novamente de imediato.
5. **Registro de Logs**
   - O Coordinator emite logs `.info` no subsistema `com.zero`, categorias `voicewake.overlay` e `voicewake.chime`.
   - Eventos principais: `session_started`, `adopted_by_push_to_talk`, `partial`, `finalized`, `send`, `dismiss`, `cancel`, `cooldown`.

### Checklist de depuração

- Monitore os logs enquanto reproduz uma sobreposição travada:

  ```bash
  sudo log stream --predicate 'subsystem == "com.zero" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- Verifique se há apenas um token de sessão ativo; callbacks obsoletos devem ser descartados pelo coordinator.
- Garanta que ao soltar o push-to-talk sempre chame `endCapture` com o token ativo; se o texto estiver vazio, espere um `dismiss` sem chime ou envio.

### Etapas de migração (sugeridas)

1. Adicione `VoiceSessionCoordinator`, `VoiceSession` e `VoiceSessionPublisher`.
2. Refatore o `VoiceWakeRuntime` para criar/atualizar/encerrar sessões em vez de tocar no `VoiceWakeOverlayController` diretamente.
3. Refatore o `VoicePushToTalk` para adotar sessões existentes e chamar `endCapture` ao soltar; aplicar cooldown no runtime.
4. Conecte o `VoiceWakeOverlayController` ao publisher; remova chamadas diretas do runtime/PTT.
5. Adicione testes de integração para adoção de sessão, cooldown e descarte de texto vazio.

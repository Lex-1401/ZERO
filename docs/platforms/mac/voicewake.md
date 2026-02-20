---
summary: "Modos de ativação por voz e push-to-talk, além de detalhes de roteamento no app mac"
read_when:
  - Trabalhando nos caminhos de ativação por voz ou PTT
---
# Ativação por Voz e Push-to-Talk

## Modos

- **Wake-word mode** (padrão): o reconhecedor de fala sempre ativo aguarda pelos tokens de gatilho (`swabbleTriggerWords`). Ao encontrar uma correspondência, inicia a captura, exibe a sobreposição com texto parcial e envia automaticamente após o silêncio.
- **Push-to-talk (Segurar Option Direito)**: segure a tecla Option direita para capturar imediatamente — sem necessidade de gatilho. A sobreposição aparece enquanto a tecla é mantida; soltá-la finaliza e encaminha após um curto atraso para que você possa ajustar o texto.

## Comportamento do runtime (wake-word)

- O reconhecedor de fala reside em `VoiceWakeRuntime`.
- O gatilho só dispara quando há uma **pausa significativa** entre a palavra de ativação e a próxima palavra (~0.55s de intervalo). A sobreposição/chime pode começar na pausa antes mesmo do comando iniciar.
- Janelas de silêncio: 2.0s quando a fala está fluindo, 5.0s se apenas o gatilho foi ouvido.
- Parada forçada: 120s para evitar sessões intermináveis.
- Debounce entre sessões: 350ms.
- A sobreposição é gerenciada via `VoiceWakeOverlayController` com coloração para texto confirmado/volátil.
- Após o envio, o reconhecedor reinicia de forma limpa para ouvir o próximo gatilho.

## Invariantes do ciclo de vida

- Se a Ativação por Voz estiver habilitada e as permissões forem concedidas, o reconhecedor de wake-word deve estar ouvindo (exceto durante uma captura explícita de push-to-talk).
- A visibilidade da sobreposição (incluindo o fechamento manual via botão X) nunca deve impedir o reconhecedor de retomar.

## Modo de falha de sobreposição travada (anterior)

Anteriormente, se a sobreposição ficasse visível e você a fechasse manualmente, a Ativação por Voz poderia parecer “morta” porque a tentativa de reinicialização do runtime poderia ser bloqueada pela visibilidade da sobreposição e nenhuma reinicialização subsequente era agendada.

Reforço:

- A reinicialização do runtime de ativação não é mais bloqueada pela visibilidade da sobreposição.
- A conclusão do descarte da sobreposição dispara um `VoiceWakeRuntime.refresh(...)` via `VoiceSessionCoordinator`, de modo que o fechamento manual pelo X sempre retoma a escuta.

## Detalhes do push-to-talk

- A detecção da tecla de atalho usa um monitor global de `.flagsChanged` para o **Option direito** (`keyCode 61` + `.option`). Apenas observamos os eventos (sem interceptá-los).
- O pipeline de captura reside em `VoicePushToTalk`: inicia a fala imediatamente, transmite parciais para a sobreposição e chama o `VoiceWakeForwarder` ao soltar o botão.
- Quando o push-to-talk inicia, pausamos o runtime de wake-word para evitar conflitos de áudio; ele reinicia automaticamente após soltar a tecla.
- Permissões: requer Microfone + Fala; para ver os eventos, é necessária a aprovação de Acessibilidade/Monitoramento de Entrada (Accessibility/Input Monitoring).
- Teclados externos: alguns podem não expor o Option direito como esperado — ofereça um atalho de fallback se os usuários relatarem falhas.

## Configurações para o usuário

- Botão **Voice Wake**: habilita o runtime de wake-word.
- **Hold Cmd+Fn to talk**: habilita o monitor de push-to-talk. Desativado em macOS < 26.
- Seletores de idioma e microfone, medidor de nível ao vivo, tabela de palavras-gatilho, testador (apenas local; não encaminha).
- O seletor de microfone preserva a última seleção se um dispositivo for desconectado, mostra um aviso de desconexão e volta temporariamente para o padrão do sistema até que ele retorne.
- **Sons**: chimes na detecção do gatilho e no envio; o padrão é o som de sistema “Glass” do macOS. Você pode escolher qualquer arquivo carregável por `NSSound` (ex: MP3/WAV/AIFF) para cada evento ou escolher **No Sound**.

## Comportamento de encaminhamento

- Quando a Ativação por Voz está habilitada, as transcrições são encaminhadas para o gateway/agente ativo (o mesmo modo local vs remoto usado pelo restante do app mac).
- As respostas são entregues ao **último provedor principal utilizado** (WhatsApp/Telegram/Discord/WebChat). Se a entrega falhar, o erro é registrado e a execução ainda pode ser visualizada via logs de WebChat/sessão.

## Payload de encaminhamento

- `VoiceWakeForwarder.prefixedTranscript(_:)` adiciona o prefixo de dica da máquina antes do envio. Compartilhado entre os caminhos de wake-word e push-to-talk.

## Verificação rápida

- Ative o push-to-talk, segure Cmd+Fn, fale, solte: a sobreposição deve mostrar as parciais e depois enviar.
- Enquanto segura, as orelhas na barra de menus devem permanecer ampliadas (usa `triggerVoiceEars(ttl:nil)`); elas diminuem após soltar.

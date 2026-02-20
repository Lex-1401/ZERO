---
summary: "Modo Talk: conversas contínuas por voz com ElevenLabs TTS"
read_when:
  - Implementando o modo Talk no macOS/iOS/Android
  - Alterando o comportamento de voz/TTS/interrupção
---
# Modo Talk

O modo Talk é um loop de conversação contínua por voz:

1) Ouve a fala
2) Envia a transcrição para o modelo (sessão principal, chat.send)
3) Aguarda a resposta
4) Fala a resposta via ElevenLabs (reprodução em streaming)

## Comportamento (macOS)

- **Overlay sempre visível** enquanto o modo Talk estiver habilitado.
- Transições de fase: **Ouvindo → Pensando → Falando**.
- Em uma **pausa curta** (janela de silêncio), a transcrição atual é enviada.
- As respostas são **escritas no WebChat** (igual ao digitar).
- **Interromper ao falar** (ligado por padrão): se o usuário começar a falar enquanto o assistente estiver falando, interrompemos a reprodução e anotamos o carimbo de data/hora da interrupção para o próximo prompt.

## Diretivas de voz nas respostas

O assistente pode prefixar sua resposta com uma **única linha JSON** para controlar a voz:

```json
{"voice":"<voice-id>","once":true}
```

Regras:

- Apenas a primeira linha não vazia.
- Chaves desconhecidas são ignoradas.
- `once: true` aplica-se apenas à resposta atual.
- Sem o `once`, a voz torna-se o novo padrão para o modo Talk.
- A linha JSON é removida antes da reprodução via TTS.

Chaves suportadas:

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## Configuração (`~/.zero/zero.json`)

```json5
{
  "talk": {
    "voiceId": "elevenlabs_voice_id",
    "modelId": "eleven_v3",
    "outputFormat": "mp3_44100_128",
    "apiKey": "elevenlabs_api_key",
    "interruptOnSpeech": true
  }
}
```

Padrões:

- `interruptOnSpeech`: true
- `voiceId`: recorre a `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (ou a primeira voz ElevenLabs quando a chave de API está disponível)
- `modelId`: o padrão é `eleven_v3` quando não configurado
- `apiKey`: recorre a `ELEVENLABS_API_KEY` (ou perfil de shell do gateway, se disponível)
- `outputFormat`: o padrão é `pcm_44100` no macOS/iOS e `pcm_24000` no Android (defina `mp3_*` para forçar o streaming em MP3)

## UI do macOS

- Alternar na barra de menus: **Talk**
- Aba de configuração: grupo **Talk Mode** (id da voz + alternar interrupção)
- Overlay:
  - **Ouvindo (Listening)**: a nuvem pulsa com o nível do microfone
  - **Pensando (Thinking)**: animação de afundamento
  - **Falando (Speaking)**: anéis radiantes
  - Clique na nuvem: para de falar
  - Clique no X: sai do modo Talk

## Notas

- Exige permissões de Fala (Speech) + Microfone.
- Usa `chat.send` contra a chave de sessão `main`.
- O TTS usa a API de streaming da ElevenLabs com `ELEVENLABS_API_KEY` e reprodução incremental no macOS/iOS/Android para menor latência.
- `stability` para o `eleven_v3` é validado para `0.0`, `0.5` ou `1.0`; outros modelos aceitam `0..1`.
- `latency_tier` é validado para `0..4` quando configurado.
- O Android suporta os formatos de saída `pcm_16000`, `pcm_22050`, `pcm_24000` e `pcm_44100` para streaming AudioTrack de baixa latência.

## Voz 2.0 (Streaming Binário)

A **Voz 2.0** (introduzida na versão 3.0) atualiza o modo Talk para um protocolo de streaming binário full-duplex sobre WebSocket.

- **Baixa latência**: pedaços (chunks) de áudio são transmitidos imediatamente, não armazenados em buffer como base64 JSON.
- **Interrupção (Barge-in)**: o Gateway realiza VAD (Detecção de Atividade de Voz) e interrompe o TTS quando o usuário fala.
- **Enquadramento binário (Binary framing)**:
  - `0x01` (Texto): quadros de controle JSON (ferramentas, transcrições).
  - `0x02` (Áudio): dados de áudio binários (PCM/Opus).
  - `0x03` (Controle): sinais de interrupção/VAD.

Os clientes (macOS/iOS/Android) usam a Voz 2.0 por padrão quando conectados a um Gateway 3.0+. Clientes legados recorrem ao protocolo JSON baseado em texto.

---
summary: "Text-to-speech (TTS) para respostas de saída"
read_when:
  - Ao ativar conversão de texto em fala para respostas
  - Ao configurar provedores de TTS ou limites
  - Ao usar comandos /tts
---

# Text-to-speech (TTS) - Conversão de Texto em Fala

O ZERO pode converter respostas de saída em áudio usando ElevenLabs, OpenAI ou Edge TTS. Ele funciona em qualquer lugar onde o ZERO possa enviar áudio; no Telegram, ele é enviado como uma bolha de mensagem de voz redonda.

## Serviços Suportados

- **ElevenLabs** (provedor primário ou de fallback).
- **OpenAI** (provedor primário ou de fallback; também usado para resumos).
- **Edge TTS** (provedor primário ou de fallback; usa `node-edge-tts`, padrão quando não há chaves de API).

### Notas sobre o Edge TTS

O Edge TTS utiliza o serviço online de TTS neural do Microsoft Edge através da biblioteca `node-edge-tts`. É um serviço hospedado (não local), usa os endpoints da Microsoft e não requer uma chave de API. A biblioteca `node-edge-tts` expõe opções de configuração de fala e formatos de saída, mas nem todas as opções são suportadas pelo serviço Edge.

Como o Edge TTS é um serviço web público sem um SLA ou cota publicada, trate-o como "melhor esforço" (best-effort). Se você precisar de limites e suporte garantidos, use OpenAI ou ElevenLabs. A API REST de fala da Microsoft documenta um limite de 10 minutos de áudio por solicitação; o Edge TTS não publica limites, então assuma limites similares ou inferiores.

## Chaves Opcionais

Se você deseja usar OpenAI ou ElevenLabs:

- `ELEVENLABS_API_KEY` (ou `XI_API_KEY`)
- `OPENAI_API_KEY`

O Edge TTS **não** requer uma chave de API. Se nenhuma chave de API for encontrada, o ZERO usará como padrão o Edge TTS (a menos que seja desativado via `messages.tts.edge.enabled=false`).

Se múltiplos provedores estiverem configurados, o provedor selecionado será usado primeiro e os outros servirão como opções de fallback. O resumo automático (auto-summary) usa o `summaryModel` configurado (ou `agents.defaults.model.primary`), portanto, esse provedor também deve estar autenticado se você ativar os resumos.

## Links de Serviços

- [Guia OpenAI Text-to-Speech](https://platform.openai.com/docs/guides/text-to-speech)
- [Referência da API Audio OpenAI](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Autenticação ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formatos de saída Microsoft Speech](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## Ele vem ativado por padrão?

Não. O Auto‑TTS está **desativado** por padrão. Ative-o na configuração com `messages.tts.auto` ou por sessão com o comando `/tts always` (apelido: `/tts on`).

O Edge TTS **é** ativado por padrão assim que o TTS for ligado, e é usado automaticamente quando não há chaves de API da OpenAI ou ElevenLabs disponíveis.

## Configuração

A configuração de TTS reside sob `messages.tts` no arquivo `zero.json`. O esquema completo está em [Configuração do Gateway](/gateway/configuration).

### Configuração mínima (ativar + provedor)

```json5
{
  "messages": {
    "tts": {
      "auto": "always",
      "provider": "elevenlabs"
    }
  }
}
```

### OpenAI como primário com ElevenLabs como fallback

```json5
{
  "messages": {
    "tts": {
      "auto": "always",
      "provider": "openai",
      "summaryModel": "openai/gpt-4.1-mini",
      "modelOverrides": {
        "enabled": true
      },
      "openai": {
        "apiKey": "sua_chave_openai",
        "model": "gpt-4o-mini-tts",
        "voice": "alloy"
      },
      "elevenlabs": {
        "apiKey": "sua_chave_elevenlabs",
        "baseUrl": "https://api.elevenlabs.io",
        "voiceId": "voice_id",
        "modelId": "eleven_multilingual_v2",
        "seed": 42,
        "applyTextNormalization": "auto",
        "languageCode": "pt",
        "voiceSettings": {
          "stability": 0.5,
          "similarityBoost": 0.75,
          "style": 0.0,
          "useSpeakerBoost": true,
          "speed": 1.0
        }
      }
    }
  }
}
```

### Edge TTS como primário (sem chave de API)

```json5
{
  "messages": {
    "tts": {
      "auto": "always",
      "provider": "edge",
      "edge": {
        "enabled": true,
        "voice": "pt-BR-AntonioNeural",
        "lang": "pt-BR",
        "outputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "rate": "+10%",
        "pitch": "-5%"
      }
    }
  }
}
```

### Desativar Edge TTS

```json5
{
  "messages": {
    "tts": {
      "edge": {
        "enabled": false
      }
    }
  }
}
```

### Limites personalizados + caminho de preferências

```json5
{
  "messages": {
    "tts": {
      "auto": "always",
      "maxTextLength": 4000,
      "timeoutMs": 30000,
      "prefsPath": "~/.zero/settings/tts.json"
    }
  }
}
```

### Responder com áudio apenas após uma mensagem de voz recebida

```json5
{
  "messages": {
    "tts": {
      "auto": "inbound"
    }
  }
}
```

### Desativar resumo automático para respostas longas

```json5
{
  "messages": {
    "tts": {
      "auto": "always"
    }
  }
}
```

Em seguida, execute:

```text
/tts summary off
```

### Notas sobre os campos

- `auto`: modo Auto‑TTS (`off`, `always`, `inbound`, `tagged`).
  - `inbound` só envia áudio após uma mensagem de voz recebida.
  - `tagged` só envia áudio quando a resposta inclui as tags `[[tts]]`.
- `enabled`: alternador legado (o comando doctor migra isso para `auto`).
- `mode`: `"final"` (padrão) ou `"all"` (inclui respostas de ferramentas/blocos).
- `provider`: `"elevenlabs"`, `"openai"`, ou `"edge"` (o fallback é automático).
- Se `provider` estiver **desmarcado**, o ZERO prefere `openai` (se houver chave), depois `elevenlabs` (se houver chave), caso contrário, `edge`.
- `summaryModel`: modelo barato opcional para resumo automático; o padrão é `agents.defaults.model.primary`.
  - Aceita `provider/model` ou um apelido de modelo configurado.
- `modelOverrides`: permite que o modelo emita diretivas de TTS (ativado por padrão).
- `maxTextLength`: limite rígido para entrada de TTS (caracteres). `/tts audio` falha se excedido.
- `timeoutMs`: tempo limite da solicitação (ms).
- `prefsPath`: sobrescreve o caminho do JSON de preferências locais (provedor/limite/resumo).
- Os valores de `apiKey` buscam variáveis de ambiente (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `elevenlabs.voiceSettings`:
  - `stability`, `similarityBoost`, `style`: `0..1`
  - `useSpeakerBoost`: `true|false`
  - `speed`: `0.5..2.0` (1.0 = normal)
- `edge.voice`: nome da voz neural do Edge (ex: `pt-BR-FranciscaNeural`).
- `edge.outputFormat`: formato de saída do Edge (ex: `audio-24khz-48kbitrate-mono-mp3`).

## Sobrescritas dirigidas pelo modelo (ativado por padrão)

Por padrão, o modelo **pode** emitir diretivas de TTS para uma única resposta. Quando `messages.tts.auto` é `tagged`, essas diretivas são obrigatórias para disparar o áudio.

Quando ativado, o modelo pode emitir diretivas `[[tts:...]]` para sobrescrever a voz em uma única resposta, além de um bloco opcional `[[tts:text]]...[[/tts:text]]` para fornecer tags expressivas (risos, dicas de canto, etc.) que devem aparecer apenas no áudio.

Exemplo de payload de resposta:

```text
Aqui está.

[[tts:provider=elevenlabs voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](risos) Leia a música mais uma vez.[[/tts:text]]
```

Diretivas disponíveis (quando ativadas):

- `provider` (`openai` | `elevenlabs` | `edge`)
- `voice` (voz OpenAI) ou `voiceId` (ElevenLabs)
- `model` (modelo TTS OpenAI ou ID de modelo ElevenLabs)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

## Preferências por usuário

Comandos slash gravam sobrescritas locais em `prefsPath` (padrão: `~/.zero/settings/tts.json`).

Campos armazenados:

- `enabled`
- `provider`
- `maxLength` (limite para resumo; padrão 1500 caracteres)
- `summarize` (padrão `true`)

Estes campos sobrescrevem `messages.tts.*` para aquele host.

## Formatos de Saída (Fixos)

- **Telegram**: Mensagem de voz Opus (`opus_48000_64` da ElevenLabs, `opus` da OpenAI).
  - 48kHz / 64kbps é um bom equilíbrio para mensagens de voz e é necessário para a bolha redonda.
- **Outros canais**: MP3 (`mp3_44100_128` da ElevenLabs, `mp3` da OpenAI).
  - 44.1kHz / 128kbps é o equilíbrio padrão para clareza de fala.
- **Edge TTS**: usa `edge.outputFormat` (padrão `audio-24khz-48kbitrate-mono-mp3`).

## Comportamento do Auto-TTS

Quando ativado, o ZERO:

- ignora o TTS se a resposta já contiver mídia ou uma diretiva `MEDIA:`.
- ignora respostas muito curtas (< 10 caracteres).
- resume respostas longas quando ativado usando o `summaryModel`.
- anexa o áudio gerado à resposta.

## Uso do Comando Slash

Existe um único comando: `/tts`. No Discord, o ZERO registra `/voice` como o comando nativo, pois `/tts` já é um comando embutido do Discord.

```text
/tts off
/tts always
/tts inbound
/tts tagged
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Olá do ZERO
```

Notas:

- Comandos exigem um remetente autorizado.
- `off|always|inbound|tagged` são alternadores por sessão (`/tts on` é um apelido para `/tts always`).
- `limit` e `summary` são armazenados nas preferências locais, não na configuração principal.
- `/tts audio` gera uma resposta de áudio única (não ativa o TTS contínuo).

## Ferramenta do Agente

A ferramenta `tts` converte texto em fala e retorna um caminho `MEDIA:`. Quando o resultado é compatível com o Telegram, a ferramenta inclui `[[audio_as_voice]]` para que o Telegram envie uma bolha de voz.
